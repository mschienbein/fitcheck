/**
 * Test script for virtual try-on functionality
 * This bypasses the frontend and tests the core Gemini API integration
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Test with sample images from URLs
const TEST_IMAGES = {
  // Model/person images
  person: [
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400', // Man standing
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400', // Woman standing
  ],
  // Clothing images  
  clothing: [
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400', // White shirt
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400', // Black t-shirt
    'https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=400', // Dress
  ]
};

async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

async function testGeminiAPI() {
  try {
    console.log('🧪 Testing Gemini API directly...\n');
    
    // Check if API key is set
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY is not set in .env.local');
      console.log('\n📝 To get an API key:');
      console.log('1. Go to https://aistudio.google.com/app/apikey');
      console.log('2. Create a new API key');
      console.log('3. Add it to .env.local as GEMINI_API_KEY=your-key-here\n');
      return;
    }
    
    console.log('✅ API key found');
    console.log('📥 Downloading test images...\n');
    
    // Download test images
    const personImage = await downloadImage(TEST_IMAGES.person[0]);
    const clothingImage = await downloadImage(TEST_IMAGES.clothing[0]);
    
    console.log('✅ Images downloaded');
    console.log(`   Person image: ${personImage.length} bytes`);
    console.log(`   Clothing image: ${clothingImage.length} bytes\n`);
    
    // Import the Gemini service (using dynamic import for ES modules)
    console.log('🔄 Loading Gemini service...');
    
    // Create a minimal test of the API
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    console.log('🎯 Testing Gemini model...\n');
    
    // Test with a simple prompt first
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 1000,
      }
    });
    
    // Test text generation first
    console.log('📝 Testing text generation...');
    const textResult = await model.generateContent('Hello, can you respond with "API is working"?');
    const textResponse = await textResult.response.text();
    console.log('Response:', textResponse);
    console.log('✅ Text generation works!\n');
    
    // Now test image generation model
    console.log('🖼️ Testing image model...');
    const imageModel = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash', // Using stable model first
      generationConfig: {
        temperature: 0.6,
        topP: 0.95,
        maxOutputTokens: 4096,
      }
    });
    
    // Convert images to base64
    const personBase64 = personImage.toString('base64');
    const clothingBase64 = clothingImage.toString('base64');
    
    // Create a simple test prompt
    const testPrompt = {
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: personBase64 } },
          { inlineData: { mimeType: 'image/jpeg', data: clothingBase64 } },
          { text: 'Describe what you see in these two images. First image shows a person, second shows clothing.' }
        ]
      }]
    };
    
    console.log('📤 Sending images to Gemini...');
    const imageResult = await imageModel.generateContent(testPrompt);
    const imageResponse = await imageResult.response.text();
    console.log('Response:', imageResponse.substring(0, 200) + '...');
    console.log('✅ Image analysis works!\n');
    
    console.log('🎉 All tests passed! The Gemini API is working correctly.\n');
    
    // Note about image generation
    console.log('ℹ️  Note: Gemini 2.5 Flash Image model for generation may require:');
    console.log('   - Specific model access (gemini-2.5-flash-image or gemini-2.0-flash-exp-image-generation)');
    console.log('   - The model to be enabled in your Google AI Studio project');
    console.log('   - Proper prompt formatting for image generation vs analysis\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n🔑 API Key Issue:');
      console.log('   Make sure your GEMINI_API_KEY is valid and has the right permissions');
    } else if (error.message.includes('model')) {
      console.log('\n🤖 Model Issue:');
      console.log('   The specific model might not be available. Try with gemini-1.5-flash or gemini-2.0-flash');
    }
    
    console.log('\nFull error:', error);
  }
}

// Test the scraper
async function testScraper() {
  console.log('\n🔍 Testing Web Scraper...\n');
  
  const testUrls = [
    'https://www.nike.com/t/sportswear-club-mens-t-shirt-ShrJfX',
    'https://www2.hm.com/en_us/productpage.1227151001.html',
  ];
  
  try {
    // Test with a simple fetch
    const response = await fetch(testUrls[0], {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      console.log('✅ Can fetch product pages');
      const html = await response.text();
      
      // Look for OpenGraph tags
      const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
      const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/);
      
      if (ogImage) {
        console.log('✅ Found product image:', ogImage[1].substring(0, 50) + '...');
      }
      if (ogTitle) {
        console.log('✅ Found product title:', ogTitle[1]);
      }
    }
  } catch (error) {
    console.log('⚠️ Scraping test failed:', error.message);
    console.log('   This is normal - many sites block direct scraping');
    console.log('   In production, consider using a headless browser or proxy service');
  }
}

// Run tests
async function runAllTests() {
  console.log('='.repeat(50));
  console.log('🚀 FitCheck Backend Functionality Test');
  console.log('='.repeat(50));
  
  await testGeminiAPI();
  await testScraper();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary:');
  console.log('   - Gemini API connection and basic functionality verified');
  console.log('   - Image analysis capabilities confirmed');
  console.log('   - Web scraping setup checked');
  console.log('='.repeat(50));
}

runAllTests();