require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const cors = require('cors');

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

    // Success!
    res.status(200).json({
      message: 'Login successful!',
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});