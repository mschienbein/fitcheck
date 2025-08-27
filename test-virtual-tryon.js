#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Import the Gemini SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testVirtualTryOn() {
  console.log('🚀 Testing Virtual Try-On Functionality');
  console.log('========================================\n');

  // Check for API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...\n');

  try {
    // Read the local images
    console.log('📸 Loading images from root directory...');
    const userImagePath = path.join(__dirname, 'me.jpeg');
    const clothingImagePath = path.join(__dirname, 'shirt.jpg');

    const userImageBuffer = await fs.readFile(userImagePath);
    const clothingImageBuffer = await fs.readFile(clothingImagePath);

    console.log('✅ User image loaded:', userImagePath);
    console.log('✅ Clothing image loaded:', clothingImagePath);
    console.log('');

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

    console.log('🎨 Generating virtual try-on...');
    console.log('Using model: gemini-2.0-flash\n');

    // Create the prompt for virtual try-on
    const prompt = `You are an AI fashion assistant helping with virtual try-on. 
    
    I have two images:
    1. A person (user photo)
    2. A clothing item (shirt)
    
    Please analyze both images and provide:
    1. Description of the person's body type and pose
    2. Description of the clothing item (style, color, pattern)
    3. How this clothing would look on this person
    4. Styling recommendations
    5. Fit assessment
    
    Be detailed and helpful in your fashion advice.`;

    // Prepare the request
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
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

    const response = result.response;
    const text = response.text();

    console.log('✅ Virtual try-on analysis complete!\n');
    console.log('========================================');
    console.log('📊 ANALYSIS RESULTS:');
    console.log('========================================\n');
    console.log(text);
    console.log('\n========================================\n');

    // Save the result to a file
    const outputPath = path.join(__dirname, 'tryon-result.txt');
    await fs.writeFile(outputPath, `Virtual Try-On Results\n${'='.repeat(50)}\n\nTimestamp: ${new Date().toISOString()}\nUser Image: ${userImagePath}\nClothing Image: ${clothingImagePath}\n\n${text}`);
    console.log('💾 Results saved to:', outputPath);

    // Test advanced features
    console.log('\n🔄 Testing advanced virtual try-on prompt...\n');

    const advancedPrompt = `As a professional virtual try-on AI system, perform a detailed analysis:

    IMAGE 1: Person wearing their current outfit
    IMAGE 2: New clothing item to try on

    Provide a comprehensive virtual try-on assessment:

    1. **Fit Analysis**
       - How will this garment fit this person's body type?
       - Which size would you recommend?
       - Any adjustments needed?

    2. **Style Compatibility**
       - Does this match their apparent style?
       - How does it work with their body proportions?
       - Color analysis against their skin tone

    3. **Outfit Suggestions**
       - What bottoms would pair well?
       - Recommended accessories
       - Occasions suitable for this outfit

    4. **Visual Description**
       - Describe exactly how this would look on them
       - Where would the hem fall?
       - How would the fit appear across shoulders/chest?

    5. **Confidence Score**
       - Rate this match from 1-10
       - Key pros and cons

    Please be specific and practical in your recommendations.`;

    const advancedResult = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: advancedPrompt },
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

    const advancedText = advancedResult.response.text();
    
    console.log('✅ Advanced analysis complete!\n');
    console.log('========================================');
    console.log('🎯 ADVANCED VIRTUAL TRY-ON:');
    console.log('========================================\n');
    console.log(advancedText);
    console.log('\n========================================\n');

    // Save advanced results
    const advancedOutputPath = path.join(__dirname, 'tryon-advanced-result.txt');
    await fs.writeFile(advancedOutputPath, `Advanced Virtual Try-On Results\n${'='.repeat(50)}\n\nTimestamp: ${new Date().toISOString()}\n\n${advancedText}`);
    console.log('💾 Advanced results saved to:', advancedOutputPath);

    console.log('\n✨ Virtual try-on test completed successfully!');
    console.log('The Gemini API is working correctly for fashion analysis.\n');

  } catch (error) {
    console.error('❌ Error during virtual try-on:', error.message);
    if (error.response) {
      console.error('API Response:', error.response);
    }
    process.exit(1);
  }
}

// Run the test
testVirtualTryOn().catch(console.error);