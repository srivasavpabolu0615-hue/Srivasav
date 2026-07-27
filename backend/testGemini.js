require('dotenv').config();
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testGemini() {
  try {
    // Read the image file from disk
    const imagePath = './test-images/label.jpg';
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    console.log('Sending image to Gemini... please wait...');

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'This is a photo of a product label, possibly in a foreign language. Please read everything on the label and explain it clearly in English: product name, volume/weight, ingredients or chemicals, and any warnings. If parts are blurry or unclear, mention that but still explain what you can read.'
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }
      ]
    });

    console.log('\n✅ Gemini response:\n');
    console.log(response.text);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testGemini();