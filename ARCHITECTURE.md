# FitCheck - Digital Closet Architecture

## Overview
FitCheck is a next-generation digital closet application that uses Google's Gemini 2.0 Flash Image model for virtual try-on capabilities, sizing intelligence, and outfit management.

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 19** - Latest React with improved performance
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **react-image-crop** - Image cropping (from PixShop)
- **React Query** - Data fetching & caching
- **Zustand** - Client state management
- **React Hook Form + Zod** - Form handling & validation

### Backend & Infrastructure
- **Supabase** - Database, Auth, Storage
- **Prisma** - ORM
- **NextAuth.js** - Authentication
- **Netlify** - Hosting & Functions
- **Cloudinary/S3** - Image storage CDN

### AI & Image Processing (Based on PixShop)
- **Google Gemini 2.5 Flash Image** - Latest image generation model
  - Model ID: `gemini-2.5-flash-image` or `gemini-2.0-flash-exp-image-generation`
  - SDK: `@google/genai` v1.10+
  - Cost: ~$0.039 per image (1290 tokens)
- **Strands SDK** - AI agent orchestration
- **Canvas API** - Client-side image manipulation
- **Base64 Encoding** - Image data transfer

## Core Features

### 1. User Management
- **Authentication**: Email/password, Google OAuth
- **Profile**: Body measurements, style preferences
- **Subscription**: Free tier + $2/month premium

### 2. Image Capture & Processing
- **Baseline Photos**: Close-up and full-body shots
- **Multiple Angles**: Front, side, back views
- **Measurement Extraction**: AI-powered body measurement detection

### 3. Virtual Try-On
- **URL Import**: Paste product links to try items
- **Image Upload**: Upload clothing images directly
- **Real-time Preview**: See how clothes fit on your body
- **Size Matching**: AI determines if items will fit based on measurements

### 4. Digital Closet
- **Outfit Organization**: Save and categorize outfits
- **Wardrobe Management**: Track owned items
- **Mix & Match**: Create new combinations
- **Sharing**: Share outfits with friends

### 5. Intelligent Sizing
- **Web Scraping**: Extract sizing from product pages
- **Size Charts**: Store brand-specific sizing data
- **Fit Prediction**: ML-based fit recommendations
- **Size Conversion**: International size conversion

### 6. AI Features
- **Style Assistant**: AI-powered outfit recommendations
- **Trend Analysis**: Current fashion trend integration
- **Color Matching**: Complementary color suggestions
- **Occasion-based**: Outfit suggestions for events

## Database Schema

```prisma
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  name             String?
  image            String?
  measurements     Json?     // Body measurements
  preferences      Json?     // Style preferences
  subscription     String    @default("free")
  createdAt        DateTime  @default(now())
  
  baselineImages   BaselineImage[]
  outfits          Outfit[]
  clothingItems    ClothingItem[]
}

model BaselineImage {
  id         String   @id @default(cuid())
  userId     String
  type       String   // "close-up", "full-body", "front", "side", "back"
  url        String
  metadata   Json?
  user       User     @relation(fields: [userId], references: [id])
}

model ClothingItem {
  id            String   @id @default(cuid())
  userId        String
  name          String
  category      String   // "shirt", "pants", "shoes", etc.
  brand         String?
  sourceUrl     String?
  imageUrl      String
  sizingData    Json?    // Scraped sizing info
  metadata      Json?
  user          User     @relation(fields: [userId], references: [id])
  outfits       OutfitItem[]
}

model Outfit {
  id          String       @id @default(cuid())
  userId      String
  name        String
  occasion    String?
  season      String?
  imageUrl    String?      // Generated outfit image
  metadata    Json?
  user        User         @relation(fields: [userId], references: [id])
  items       OutfitItem[]
}

model OutfitItem {
  outfitId    String
  itemId      String
  outfit      Outfit       @relation(fields: [outfitId], references: [id])
  item        ClothingItem @relation(fields: [itemId], references: [id])
  @@id([outfitId, itemId])
}
```

## API Routes

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/session` - Get current session

### User Profile
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/measurements` - Update measurements
- `POST /api/user/baseline-images` - Upload baseline images

### Clothing Items
- `POST /api/clothing/import-url` - Import from product URL
- `POST /api/clothing/upload` - Upload clothing image
- `GET /api/clothing` - Get user's clothing items
- `DELETE /api/clothing/:id` - Delete clothing item

### Virtual Try-On
- `POST /api/try-on` - Generate try-on image
- `POST /api/try-on/batch` - Batch try-on multiple items

### Outfits
- `POST /api/outfits` - Create outfit
- `GET /api/outfits` - Get user's outfits
- `PUT /api/outfits/:id` - Update outfit
- `DELETE /api/outfits/:id` - Delete outfit

### AI Features
- `POST /api/ai/extract-measurements` - Extract measurements from images
- `POST /api/ai/suggest-outfits` - Get outfit suggestions
- `POST /api/ai/check-fit` - Check if item will fit

### Scraping
- `POST /api/scrape/product` - Scrape product details

## Google AI Integration

### Gemini 2.0 Flash Setup
```typescript
// lib/google-ai.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export const imageModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    temperature: 0.4,
    topP: 1,
    topK: 32,
    maxOutputTokens: 4096,
  },
});

// Virtual try-on function
export async function virtualTryOn(
  userImage: Buffer,
  clothingImage: Buffer,
  measurements?: UserMeasurements
) {
  // Image editing/generation logic
}
```

## Strands Agent Integration

```typescript
// lib/strands-agent.ts
import { Agent } from '@strands-ai/sdk';

export const styleAgent = new Agent({
  name: 'StyleAssistant',
  description: 'Fashion and styling AI assistant',
  tools: [
    searchClothing,
    analyzeFit,
    suggestOutfits,
    extractProductInfo
  ]
});

// Product research tool
async function searchClothing(query: string) {
  // Search for clothing items
}

async function extractProductInfo(url: string) {
  // Scrape and extract product details
}
```

## Deployment Configuration

### Netlify Setup
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[functions]
  directory = "netlify/functions"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NEXT_USE_NETLIFY_EDGE = "true"
```

### Environment Variables
```env
# .env.local
NEXTAUTH_URL=https://your-app.netlify.app
NEXTAUTH_SECRET=your-secret-key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Google AI
GOOGLE_AI_API_KEY=your-gemini-api-key

# Uploadthing
UPLOADTHING_SECRET=your-uploadthing-secret
UPLOADTHING_APP_ID=your-app-id

# Database
DATABASE_URL=your-database-url
```

## Security Considerations

1. **Image Privacy**: All user images encrypted at rest
2. **Data Protection**: GDPR/CCPA compliant data handling
3. **API Rate Limiting**: Prevent abuse of AI endpoints
4. **Input Validation**: Sanitize all user inputs
5. **Authentication**: Secure session management with NextAuth

## Performance Optimizations

1. **Image Optimization**: Next.js Image component with CDN
2. **Caching Strategy**: React Query for API responses
3. **Lazy Loading**: Components and images
4. **Edge Functions**: Netlify Edge for global performance
5. **Database Indexes**: Optimized queries with Prisma

## Monitoring & Analytics

1. **Error Tracking**: Sentry integration
2. **Analytics**: Vercel Analytics or Plausible
3. **Performance**: Web Vitals monitoring
4. **User Behavior**: Hotjar or similar
5. **API Monitoring**: Uptime and response time tracking

## Development Workflow

1. **Local Development**: `npm run dev`
2. **Type Checking**: `npm run type-check`
3. **Linting**: `npm run lint`
4. **Testing**: `npm run test`
5. **Build**: `npm run build`
6. **Deploy**: Git push to trigger Netlify deployment

## Future Enhancements

1. **Social Features**: Share outfits, follow friends
2. **AR Try-On**: Mobile AR capabilities
3. **Brand Partnerships**: Direct shopping integration
4. **AI Stylist**: Personal styling recommendations
5. **Wardrobe Analytics**: Usage patterns and suggestions