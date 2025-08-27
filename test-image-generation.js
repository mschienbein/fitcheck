#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Import the Gemini SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testImageGeneration() {
  console.log('🎨 Testing Gemini 2.5 Flash Image Generation');
  console.log('============================================\n');

  // Check for API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...\n');

  try {
    // Load images
    console.log('📸 Loading images...');
    const userImagePath = path.join(__dirname, 'me.jpeg');
    const clothingImagePath = path.join(__dirname, 'shirt.jpg');

    const userImageBuffer = await fs.readFile(userImagePath);
    const clothingImageBuffer = await fs.readFile(clothingImagePath);

    console.log('✅ User image loaded:', userImagePath);
    console.log('✅ Clothing image loaded:', clothingImagePath);
    console.log('');

    // Initialize Gemini with the image generation model
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try gemini-2.5-flash-image (if available)
    console.log('🔍 Testing model availability...\n');
    
    const models = ['gemini-2.5-flash-image-preview', 'gemini-2.0-flash-exp', 'gemini-2.0-flash'];
    let workingModel = null;
    
    for (const modelName of models) {
      try {
        console.log(`Testing ${modelName}...`);
        const testModel = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.6,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseModalities: ['text', 'image'] // Request both text and image
          },
        });
        
        // Simple test
        const testResult = await testModel.generateContent({
          contents: [{
            role: 'user',
            parts: [{ text: 'Say hello' }]
          }]
        });
        
        console.log(`✅ ${modelName} is available`);
        workingModel = modelName;
        break;
      } catch (error) {
        console.log(`❌ ${modelName} not available: ${error.message}`);
      }
    }
    
    if (!workingModel) {
      console.error('\n❌ No suitable image generation model found');
      console.log('The gemini-2.5-flash-image model may not be available yet.');
      console.log('Check https://ai.google.dev/gemini-api/docs/models for availability.');
      process.exit(1);
    }
    
    console.log(`\n🎯 Using model: ${workingModel}\n`);
    
    const model = genAI.getGenerativeModel({ 
      model: workingModel,
      generationConfig: {
        temperature: 0.6,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseModalities: ['text', 'image']
      },
    });

    // Convert images to base64
    const userImageBase64 = userImageBuffer.toString('base64');
    const clothingImageBase64 = clothingImageBuffer.toString('base64');

    console.log('🎨 Attempting virtual try-on image generation...\n');

    // Virtual try-on prompt based on the documentation
    const tryOnPrompt = `Generate a photorealistic virtual try-on image.

OBJECTIVE: Create a composite image showing the person from Image 1 wearing the clothing from Image 2.

CRITICAL REQUIREMENTS:
1. IDENTITY PRESERVATION: Maintain exact facial features, skin tone, hair, and body proportions from Image 1
2. GARMENT FIDELITY: Preserve exact colors, patterns, textures, and design details from Image 2
3. REALISTIC INTEGRATION: Natural draping, proper fit, realistic shadows and lighting

Please generate an image showing this person wearing this shirt, maintaining photorealistic quality.`;

    const result = await model.generateContent({
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

    const response = result.response;
    console.log('✅ API call successful!\n');
    
    // Process the response
    console.log('Processing response...');
    const parts = response.candidates?.[0]?.content?.parts || [];
    
    let imageGenerated = false;
    let textResponse = '';
    let imageData = null;
    
    for (const part of parts) {
      if (part.inlineData) {
        // Image was generated!
        imageGenerated = true;
        imageData = part.inlineData;
        console.log('🖼️  Image generated!');
        console.log(`   MIME type: ${part.inlineData.mimeType}`);
        
        // Save the generated image
        const outputImagePath = path.join(__dirname, 'generated-tryon.jpg');
        const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
        await fs.writeFile(outputImagePath, imageBuffer);
        console.log(`   Saved to: ${outputImagePath}`);
        
      } else if (part.text) {
        textResponse += part.text;
      }
    }
    
    if (textResponse) {
      console.log('\n📝 Text response:');
      console.log('================');
      console.log(textResponse);
    }
    
    if (!imageGenerated) {
      console.log('\n⚠️  No image was generated in the response.');
      console.log('This could mean:');
      console.log('1. The model doesn\'t support image generation');
      console.log('2. The prompt needs adjustment');
      console.log('3. Safety filters blocked the generation');
      console.log('\nTrying alternative approach...\n');
      
      // Try a simpler editing prompt
      const editPrompt = `Edit this image: blend these two images naturally, putting the shirt from image 2 onto the person in image 1. Maintain the person's face and body exactly.`;
      
      const editResult = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: editPrompt },
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
      
      const editParts = editResult.response.candidates?.[0]?.content?.parts || [];
      
      for (const part of editParts) {
        if (part.inlineData) {
          console.log('🖼️  Alternative approach generated an image!');
          const altOutputPath = path.join(__dirname, 'generated-tryon-alt.jpg');
          const altImageBuffer = Buffer.from(part.inlineData.data, 'base64');
          await fs.writeFile(altOutputPath, altImageBuffer);
          console.log(`   Saved to: ${altOutputPath}`);
          imageGenerated = true;
        }
      }
    }
    
    console.log('\n========================================');
    if (imageGenerated) {
      console.log('✨ Image generation test completed!');
      console.log('Check the generated image file(s) in the project directory.');
    } else {
      console.log('📊 Analysis completed (text-only mode)');
      console.log('The current model/API configuration provides fashion analysis');
      console.log('but doesn\'t generate composite try-on images.');
      console.log('\nFor actual image generation, you may need to:');
      console.log('1. Wait for gemini-2.5-flash-image model availability');
      console.log('2. Use Vertex AI with proper setup');
      console.log('3. Apply for early access if in preview');
    }
    console.log('========================================\n');

    // Save full report
    const reportPath = path.join(__dirname, 'image-generation-report.json');
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      model: workingModel,
      imageGenerated,
      textResponse,
      responseStructure: {
        candidatesCount: response.candidates?.length || 0,
        partsCount: parts.length,
        hasImage: imageGenerated,
        hasText: !!textResponse
      }
    }, null, 2));
    
    console.log('📄 Full report saved to:', reportPath);

  } catch (error) {
    console.error('❌ Error during image generation test:', error.message);
    if (error.response) {
      console.error('API Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
testImageGeneration().catch(console.error);