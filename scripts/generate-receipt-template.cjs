// scripts/generate-receipt-template.cjs — Script to generate or regenerate the fixed receipt template asset
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY environment variable is required to run this script.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function makeTemplate() {
  console.log('Generating luxury receipt template background...');
  try {
    const res = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt:
        'Minimalist luxury receipt background, ultra dark obsidian texture, subtle thin gold border, blank center with empty space for text, high resolution fintech style, no words, no text, no numbers',
      config: { aspectRatio: '3:4' },
    });

    const base64 = res.generatedImages[0].image.imageBytes;
    const outputDir = path.join(__dirname, '../public/assets');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, 'receipt-template.png');
    fs.writeFileSync(outputPath, Buffer.from(base64, 'base64'));
    console.log(`✅ Template successfully saved to ${outputPath}`);
  } catch (err) {
    console.error('Failed to generate template via Imagen:', err.message);
  }
}

makeTemplate();
