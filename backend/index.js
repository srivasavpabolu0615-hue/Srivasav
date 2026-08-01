require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;

// Allows requests from other addresses (like our frontend)
app.use(cors());

// Allows our server to understand JSON data sent from the frontend
app.use(express.json());

// Sets up our database connection (same style as testConnection.js)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Set up multer to hold uploaded files temporarily in memory
const upload = multer({ storage: multer.memoryStorage() });

// Set up our connection to Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// NEW: Daily usage limit safety check
const DAILY_LIMIT = 800;

async function checkAndIncrementUsage() {
  const today = new Date().toISOString().split('T')[0]; // e.g. "2026-08-01"

  // Make sure today's row exists
  await pool.query(
    'INSERT INTO api_usage (usage_date, request_count) VALUES ($1, 0) ON CONFLICT (usage_date) DO NOTHING',
    [today]
  );

  // Check today's count
  const result = await pool.query(
    'SELECT request_count FROM api_usage WHERE usage_date = $1',
    [today]
  );

  const currentCount = result.rows[0].request_count;

  if (currentCount >= DAILY_LIMIT) {
    return false; // limit reached
  }

  // Increment and allow
  await pool.query(
    'UPDATE api_usage SET request_count = request_count + 1 WHERE usage_date = $1',
    [today]
  );

  return true; // allowed
}

app.get('/', (req, res) => {
  res.send('Hello! Your backend server is working.');
});

// NEW: Registration route
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // Basic check: make sure both fields were actually sent
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Scramble the password before storing it (10 = strength level, standard choice)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the new user into the database
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, hashedPassword]
    );

    res.status(201).json({
      message: 'User registered successfully!',
      user: result.rows[0]
    });
  } catch (err) {
    // This runs if something goes wrong, e.g. email already exists
    if (err.code === '23505') {
      // 23505 = PostgreSQL's code for "unique constraint violated"
      return res.status(409).json({ error: 'This email is already registered.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// NEW: Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Look up the user by email
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    // If no user found with that email
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Compare the typed password against the stored scrambled version
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Success! Create a token so the frontend can stay logged in
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful!',
      user: { id: user.id, email: user.email },
      token: token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// NEW: Analyze an uploaded product label image
app.post('/analyze', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image was uploaded.' });
  }

  const allowed = await checkAndIncrementUsage();
  if (!allowed) {
    return res.status(429).json({ error: "We've reached today's usage limit to keep this service free. Please try again tomorrow." });
  }

  try {
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype; // e.g. 'image/jpeg' or 'image/png'

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'This is a photo of a product label, possibly in a foreign language. First, write a clear, natural English paragraph explaining the product: its name, volume or weight, ingredients or chemicals, and any warnings. If parts are blurry or unclear, mention that within the paragraph, but still explain what you can read. Do not use markdown formatting like asterisks or headers in this paragraph. After the paragraph, add a line that says exactly "Word-by-word breakdown:" and then list each distinct word or short phrase from the label in its original language, followed by an arrow and its English meaning, one per line, like this format: original word or phrase -> English meaning.'
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ]
    });

    res.status(200).json({
      explanation: response.text
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong while analyzing the image.' });
  }
});

// NEW: Chat assistant route
app.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages are required.' });
  }

  const allowed = await checkAndIncrementUsage();
  if (!allowed) {
    return res.status(429).json({ error: "We've reached today's usage limit to keep this service free. Please try again tomorrow." });
  }

  try {
    // Convert our simple {role, text} messages into the format Gemini expects
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: contents,
      config: {
        systemInstruction: 'You are a helpful assistant for a product intelligence platform. Users may ask about product labels, ingredients, translations, trade terms, or general questions about using the site. Answer clearly and concisely in plain English, without markdown formatting like asterisks or headers.'
      }
    });

    res.status(200).json({
      reply: response.text
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});