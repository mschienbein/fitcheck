#!/bin/bash

# Test Google Gemini API credentials
echo "========================================"
echo "🔑 Testing Google Gemini API Credentials"
echo "========================================"
echo ""

# Load environment variables from .env.local
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
    echo "✅ Loaded .env.local"
else
    echo "❌ .env.local not found"
    exit 1
fi

# Check if GEMINI_API_KEY is set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ GEMINI_API_KEY is not set or is empty"
    echo ""
    echo "To get a Gemini API key:"
    echo "1. Go to: https://aistudio.google.com/app/apikey"
    echo "2. Sign in with Google"
    echo "3. Click 'Create API Key'"
    echo "4. Add to .env.local: GEMINI_API_KEY=AIza..."
    exit 1
fi

echo "✅ GEMINI_API_KEY found: ${GEMINI_API_KEY:0:10}..."
echo ""

# Test 1: List available models
echo "📋 Testing: List Available Models"
echo "--------------------------------"
response=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY")

if echo "$response" | grep -q "models"; then
    echo "✅ API key is valid! Available models:"
    echo "$response" | grep -o '"name": "[^"]*"' | head -5
else
    echo "❌ API key test failed. Response:"
    echo "$response" | head -3
    echo ""
    echo "This might mean:"
    echo "- The API key is invalid"
    echo "- The API key doesn't have the right permissions"
    echo "- You need to enable the Generative Language API in Google Cloud Console"
fi

echo ""

# Test 2: Simple text generation
echo "📝 Testing: Text Generation with Gemini"
echo "--------------------------------------"

# Create a simple test request
cat > /tmp/gemini-test-request.json << EOF
{
  "contents": [{
    "parts": [{
      "text": "Reply with exactly: 'API test successful'"
    }]
  }]
}
EOF

response=$(curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -d @/tmp/gemini-test-request.json)

if echo "$response" | grep -q "successful"; then
    echo "✅ Text generation works!"
    echo "Response: $(echo "$response" | grep -o '"text": "[^"]*"' | head -1)"
else
    echo "❌ Text generation failed"
    echo "Response: $(echo "$response" | head -200)"
fi

echo ""

# Test 3: Check for image generation models
echo "🖼️  Testing: Image Model Availability"
echo "------------------------------------"

# Test for Gemini 2.0 Flash (stable multimodal)
echo "Testing gemini-2.0-flash..."
response=$(curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{"contents":[{"parts":[{"text":"Hi"}]}]}')

if echo "$response" | grep -q "error"; then
    echo "⚠️  gemini-2.0-flash not available or has an error"
else
    echo "✅ gemini-2.0-flash is available"
fi

# Test for experimental image generation model
echo "Testing gemini-2.0-flash-exp..."
response=$(curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=$GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{"contents":[{"parts":[{"text":"Hi"}]}]}')

if echo "$response" | grep -q "error"; then
    echo "⚠️  gemini-2.0-flash-exp not available"
    error_msg=$(echo "$response" | grep -o '"message": "[^"]*"')
    echo "   $error_msg"
else
    echo "✅ gemini-2.0-flash-exp is available"
fi

echo ""

# Summary
echo "========================================"
echo "📊 Summary"
echo "========================================"

if [ -n "$GEMINI_API_KEY" ] && curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" | grep -q "models"; then
    echo "✅ Your Gemini API key is valid and working!"
    echo ""
    echo "Next steps:"
    echo "1. The virtual try-on feature should work with gemini-2.0-flash"
    echo "2. For image generation, you may need to:"
    echo "   - Enable specific models in Google AI Studio"
    echo "   - Use gemini-1.5-flash or gemini-2.0-flash for multimodal tasks"
    echo "   - Check if gemini-2.5-flash-image is available in your region"
else
    echo "❌ There's an issue with your API key"
    echo ""
    echo "Please:"
    echo "1. Get a new key from https://aistudio.google.com/app/apikey"
    echo "2. Make sure it's added to .env.local as GEMINI_API_KEY=..."
    echo "3. Try running this script again"
fi

echo ""
echo "For more info about available models:"
echo "https://ai.google.dev/gemini-api/docs/models/gemini"

# Clean up
rm -f /tmp/gemini-test-request.json