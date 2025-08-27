#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

// Import the Gemini SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Helper function to download image from URL
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function testURLTryOn() {
  console.log('🌐 Testing Virtual Try-On with URL');
  console.log('========================================\n');

  // Check for API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...\n');

  try {
    // Load user image from local file
    console.log('📸 Loading user image from root directory...');
    const userImagePath = path.join(__dirname, 'me.jpeg');
    const userImageBuffer = await fs.readFile(userImagePath);
    console.log('✅ User image loaded:', userImagePath);

    // Download clothing image from URL
    console.log('\n🔗 Downloading clothing from URL...');
    const clothingURL = 'https://cdn-images.farfetch-contents.com/21/66/52/26/21665226_53013838_1000.jpg'; // Balenciaga shirt
    console.log('URL:', clothingURL);
    
    const clothingImageBuffer = await downloadImage(clothingURL);
    console.log('✅ Clothing image downloaded successfully');
    console.log('📏 Image size:', (clothingImageBuffer.length / 1024).toFixed(2), 'KB\n');

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
      },
    });

    // Convert images to base64
    const userImageBase64 = userImageBuffer.toString('base64');
    const clothingImageBase64 = clothingImageBuffer.toString('base64');

    console.log('🎨 Generating virtual try-on analysis...\n');

    // First, let's identify what the clothing item is
    const identifyPrompt = `Analyze this fashion product image and provide:
    1. Brand name (if visible)
    2. Type of clothing
    3. Color and pattern
    4. Style details
    5. Estimated price range
    6. Target demographic`;

    const identifyResult = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: identifyPrompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: clothingImageBase64
            }
          }
        ]
      }]
    });

    const productInfo = identifyResult.response.text();
    console.log('========================================');
    console.log('👔 PRODUCT IDENTIFICATION:');
    console.log('========================================\n');
    console.log(productInfo);
    console.log('\n========================================\n');

    // Now perform the virtual try-on
    const tryOnPrompt = `You are an advanced AI virtual try-on assistant. Analyze how this designer clothing item would look on the person.

    IMAGE 1: Customer photo
    IMAGE 2: Designer clothing item from online store

    Provide a comprehensive virtual fitting report:

    **VIRTUAL TRY-ON VISUALIZATION:**
    - Describe EXACTLY how this garment would appear on this person
    - Where would seams, buttons, and details align on their body?
    - How would the fabric drape and fall?
    - Color interaction with skin tone and hair

    **FIT PREDICTION:**
    - Size recommendation (S/M/L/XL)
    - Areas that might be tight or loose
    - Length assessment (where hemline falls)
    - Shoulder and chest fit

    **STYLING MATRIX:**
    - 3 complete outfit combinations
    - Occasions and settings
    - Season appropriateness
    - Accessory recommendations

    **PURCHASE DECISION:**
    - Value assessment (1-10)
    - Pros for this buyer
    - Potential concerns
    - Similar alternatives if not ideal

    **CONFIDENCE SCORE:** Rate the match (1-100%)

    Be specific, practical, and honest in your assessment.`;

    const tryOnResult = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: tryOnPrompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: userImageBase64
            }
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: clothingImageBase64
            }
          }
        ]
      }]
    });

    const tryOnAnalysis = tryOnResult.response.text();
    
    console.log('✅ Virtual try-on complete!\n');
    console.log('========================================');
    console.log('🎯 VIRTUAL FITTING REPORT:');
    console.log('========================================\n');
    console.log(tryOnAnalysis);
    console.log('\n========================================\n');

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(__dirname, `url-tryon-${timestamp}.txt`);
    
    const fullReport = `Virtual Try-On Report (URL-based)
${'='.repeat(50)}

Timestamp: ${new Date().toISOString()}
User Image: ${userImagePath}
Clothing URL: ${clothingURL}

PRODUCT IDENTIFICATION:
${'='.repeat(30)}
${productInfo}

VIRTUAL FITTING ANALYSIS:
${'='.repeat(30)}
${tryOnAnalysis}`;

    await fs.writeFile(outputPath, fullReport);
    console.log('💾 Full report saved to:', outputPath);

    // Test with another URL - a more casual item
    console.log('\n🔄 Testing with another item (casual wear)...\n');
    
    const casualURL = 'https://images.asos-media.com/products/asos-design-relaxed-revere-shirt-in-navy/205590937-1-navy';
    console.log('Downloading from:', casualURL);
    
    try {
      const casualImageBuffer = await downloadImage(casualURL);
      const casualImageBase64 = casualImageBuffer.toString('base64');
      
      const casualResult = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: 'Quick assessment: Would this casual shirt work better than the previous designer piece for everyday wear? Compare style, versatility, and value. Be concise.' },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: userImageBase64
              }
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: casualImageBase64
              }
            }
          ]
        }]
      });

      const comparison = casualResult.response.text();
      console.log('\n========================================');
      console.log('👕 QUICK COMPARISON:');
      console.log('========================================\n');
      console.log(comparison);
      
    } catch (err) {
      console.log('⚠️  Could not download second image, skipping comparison');
    }

    console.log('\n========================================');
    console.log('✨ URL-based virtual try-on test completed!');
    console.log('The system can successfully analyze clothing from URLs.');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error during URL try-on:', error.message);
    if (error.response) {
      console.error('API Response:', error.response);
    }
    process.exit(1);
  }
}

// Run the test
testURLTryOn().catch(console.error);