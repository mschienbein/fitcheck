# 🚀 FitCheck Setup Guide

## Quick Start - Get Your API Keys

### 1️⃣ **Google Gemini API Key (REQUIRED)**

This is the most important key for virtual try-on functionality.

**Get your key in 2 minutes:**
1. 🔗 Go to: https://aistudio.google.com/app/apikey
2. 🔐 Sign in with your Google account
3. 🔑 Click **"Create API Key"** button
4. 📋 Copy the key (starts with `AIza...`)
5. ✏️ Edit `.env.local` and replace:
   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   ```
   With:
   ```
   GEMINI_API_KEY=AIzaSy... (your actual key)
   ```

### 2️⃣ **Test Your API Key**

Run this command to verify your key works:
```bash
./test-gemini-credentials.sh
```

You should see:
- ✅ API key is valid
- ✅ Text generation works
- ✅ Models are available

### 3️⃣ **Optional: Quick Database Setup**

For testing without a database, update `.env.local`:
```env
# Minimum working config
GEMINI_API_KEY=AIza... (your actual key)
NEXTAUTH_SECRET=any-random-string-for-testing
NEXTAUTH_URL=http://localhost:3001
DATABASE_URL=file:./dev.db  # SQLite for testing
```

Then run:
```bash
npx prisma db push  # Creates local SQLite database
```

### 4️⃣ **Test the App**

1. **Restart the dev server:**
   ```bash
   npm run dev
   ```

2. **Open in browser:**
   http://localhost:3001

3. **Test virtual try-on:**
   - Upload any photo of a person
   - Upload or paste URL of clothing
   - Click "Generate Virtual Try-On"

## 🔧 Troubleshooting

### ❌ "API key not valid"
- You're using the placeholder text, not a real key
- Get a real key from: https://aistudio.google.com/app/apikey

### ❌ "Model not found"
- Some models require approval
- Start with `gemini-1.5-flash` or `gemini-2.0-flash`
- These work for image analysis

### ❌ "401 Unauthorized" in browser
- This is normal without auth setup
- The virtual try-on will still work for testing

## 📝 Current Status

✅ **What's Working:**
- Core virtual try-on engine
- Web scraping for clothing URLs
- Image upload and cropping
- UI components

⚠️ **Needs API Key:**
- Gemini API for virtual try-on
- Without this key, the main feature won't work

## 🎯 Next Steps

1. **Get your Gemini API key** (5 minutes)
2. **Add it to .env.local**
3. **Run `./test-gemini-credentials.sh`** to verify
4. **Test the virtual try-on** in the browser

---

**Need help?**
- Gemini API docs: https://ai.google.dev/gemini-api/docs
- Get API key: https://aistudio.google.com/app/apikey
- Model info: https://ai.google.dev/gemini-api/docs/models/gemini