/**
 * Gemini AI Service for Virtual Try-On
 * Based on PixShop implementation with FitCheck enhancements
 */

import { GoogleGenerativeAI, GenerateContentResponse, Part } from "@google/generative-ai";

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Model configuration
const MODEL_ID = "gemini-2.5-flash-image-preview" // Updated to use the preview model
const MODEL_CONFIG = {
  temperature: 0.6,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseModalities: ['text', 'image'] as const,
};

/**
 * Convert a File or Buffer to Gemini API Part format
 */
export const fileToPart = async (
  file: File | Buffer,
  mimeType?: string
): Promise<Part> => {
  if (file instanceof File) {
    // Browser File object
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type");
    
    return { 
      inlineData: { 
        mimeType: mimeMatch[1], 
        data: arr[1] 
      } 
    };
  } else {
    // Node.js Buffer
    const base64 = file.toString('base64');
    return {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: base64
      }
    };
  }
};

/**
 * Handle Gemini API response and extract image
 */
const handleApiResponse = (
  response: GenerateContentResponse,
  context: string
): string => {
  // Check for prompt blocking
  if (response.promptFeedback?.blockReason) {
    const { blockReason, blockReasonMessage } = response.promptFeedback;
    throw new Error(`Request blocked: ${blockReason}. ${blockReasonMessage || ''}`);
  }

  // Extract image from response
  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    part => 'inlineData' in part && part.inlineData
  );

  if (imagePart && 'inlineData' in imagePart && imagePart.inlineData) {
    const { mimeType, data } = imagePart.inlineData;
    return `data:${mimeType};base64,${data}`;
  }

  // Check finish reason for errors
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    throw new Error(`Generation stopped for ${context}: ${finishReason}`);
  }

  throw new Error(`No image generated for ${context}`);
};

/**
 * Virtual Try-On: Generate image of user wearing clothing item
 */
export const generateVirtualTryOn = async (
  userImage: File | Buffer,
  clothingImage: File | Buffer,
  options?: {
    backgroundPreference?: string;
    preserveBackground?: boolean;
  }
): Promise<string> => {
  const model = genAI.getGenerativeModel({ 
    model: MODEL_ID,
    generationConfig: MODEL_CONFIG 
  });

  const userImagePart = await fileToPart(userImage, 'image/jpeg');
  const clothingImagePart = await fileToPart(clothingImage, 'image/jpeg');

  const prompt = `You are an expert fashion AI specializing in virtual try-on.

TASK: Generate a photorealistic image of the person from Image A wearing the clothing item from Image B.

INPUTS:
- Image A: Photo of a person (preserve their exact identity, pose, and body shape)
- Image B: Clothing item (preserve exact color, pattern, texture, and design)
${options?.backgroundPreference ? `- Background preference: ${options.backgroundPreference}` : ''}

CRITICAL REQUIREMENTS:
1. IDENTITY PRESERVATION (ABSOLUTE): 
   - Maintain EXACT facial features, skin tone, hair, and expression
   - ZERO alterations to the person's identity
   - Preserve all visible unique features (tattoos, jewelry, etc.)

2. GARMENT FIDELITY (ABSOLUTE):
   - Preserve EXACT color, pattern, texture, and design details
   - Maintain all logos, prints, and decorative elements
   - No color shifts or style alterations

3. REALISTIC INTEGRATION:
   - Natural draping and fit based on body shape and pose
   - Physically accurate fabric behavior
   - Proper scaling to body proportions
   - Natural shadows and highlights

4. BACKGROUND:
   ${options?.preserveBackground 
     ? '- Preserve the original background from Image A'
     : '- Generate a clean, neutral background suitable for fashion photography'}

5. LIGHTING:
   - Consistent lighting across person and garment
   - Natural shadows based on light direction
   - Proper color temperature matching

OUTPUT: Generate ONLY the final image. Do not include text.`;

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [userImagePart, clothingImagePart, { text: prompt }]
    }]
  });

  return handleApiResponse(result.response, 'virtual try-on');
};

/**
 * Apply filter to image
 */
export const generateFilteredImage = async (
  image: File | Buffer,
  filterPrompt: string
): Promise<string> => {
  const model = genAI.getGenerativeModel({ 
    model: MODEL_ID,
    generationConfig: MODEL_CONFIG 
  });

  const imagePart = await fileToPart(image);
  
  const prompt = `Apply this stylistic filter to the image: "${filterPrompt}"
  
  Guidelines:
  - Apply the style uniformly across the entire image
  - Do not change composition or content
  - Maintain image quality and resolution
  - Output only the filtered image`;

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [imagePart, { text: prompt }]
    }]
  });

  return handleApiResponse(result.response, 'filter');
};

/**
 * Localized edit at specific coordinates
 */
export const generateEditedImage = async (
  image: File | Buffer,
  editPrompt: string,
  hotspot?: { x: number; y: number }
): Promise<string> => {
  const model = genAI.getGenerativeModel({ 
    model: MODEL_ID,
    generationConfig: MODEL_CONFIG 
  });

  const imagePart = await fileToPart(image);
  
  const prompt = hotspot
    ? `Make this localized edit: "${editPrompt}"
       Focus on the area around coordinates (x: ${hotspot.x}, y: ${hotspot.y})
       The edit must blend naturally with surroundings.
       Keep the rest of the image unchanged.`
    : `Make this global edit to the image: "${editPrompt}"`;

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [imagePart, { text: prompt }]
    }]
  });

  return handleApiResponse(result.response, 'edit');
};

/**
 * Extract measurements from clothing image
 */
export const extractClothingMeasurements = async (
  clothingImage: File | Buffer,
  category?: string
): Promise<{
  size?: string;
  measurements?: Record<string, number>;
  fit?: string;
  material?: string;
}> => {
  const model = genAI.getGenerativeModel({ 
    model: MODEL_ID,
    generationConfig: {
      ...MODEL_CONFIG,
      responseMimeType: "application/json"
    }
  });

  const imagePart = await fileToPart(clothingImage);
  
  const prompt = `Analyze this ${category || 'clothing'} item and extract:
  
  1. Visible size labels or tags
  2. Estimated measurements based on proportions (in cm):
     - For tops: chest, length, shoulder, sleeve
     - For bottoms: waist, hips, inseam, rise
     - For dresses: bust, waist, hips, length
  3. Fit type (slim, regular, relaxed, oversized)
  4. Material composition if visible
  
  Return as JSON with this structure:
  {
    "size": "detected size or null",
    "measurements": {
      "chest": number or null,
      "waist": number or null,
      "length": number or null,
      [other relevant measurements]
    },
    "fit": "slim/regular/relaxed/oversized",
    "material": "detected material or null"
  }`;

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [imagePart, { text: prompt }]
    }]
  });

  const text = result.response.text();
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

/**
 * Check fit compatibility
 */
export const checkFitCompatibility = async (
  userMeasurements: Record<string, number>,
  itemMeasurements: Record<string, number>
): Promise<{
  fits: boolean;
  score: number;
  warnings: string[];
  recommendations: string[];
}> => {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let totalDiff = 0;
  let measurementCount = 0;

  // Compare measurements
  for (const [key, userValue] of Object.entries(userMeasurements)) {
    const itemValue = itemMeasurements[key];
    if (itemValue) {
      const diff = ((itemValue - userValue) / userValue) * 100;
      totalDiff += Math.abs(diff);
      measurementCount++;

      if (diff < -5) {
        warnings.push(`${key} may be tight (${Math.abs(diff).toFixed(0)}% smaller)`);
        recommendations.push(`Consider sizing up for better ${key} fit`);
      } else if (diff > 10) {
        warnings.push(`${key} may be loose (${diff.toFixed(0)}% larger)`);
        recommendations.push(`Consider sizing down or tailoring the ${key}`);
      }
    }
  }

  const avgDiff = measurementCount > 0 ? totalDiff / measurementCount : 100;
  const score = Math.max(0, 100 - avgDiff);
  const fits = score > 70 && warnings.length === 0;

  return {
    fits,
    score,
    warnings,
    recommendations
  };
};

/**
 * Generate outfit suggestion
 */
export const generateOutfitSuggestion = async (
  clothingItems: Array<{ imageUrl: string; category: string }>,
  occasion?: string,
  season?: string
): Promise<{
  suggestion: string;
  combinations: Array<{ items: string[]; reason: string }>;
}> => {
  const model = genAI.getGenerativeModel({ 
    model: MODEL_ID,
    generationConfig: {
      ...MODEL_CONFIG,
      responseMimeType: "application/json"
    }
  });

  const prompt = `As a fashion expert, suggest outfit combinations from these clothing items.
  
  Context:
  - Occasion: ${occasion || 'casual everyday'}
  - Season: ${season || 'all seasons'}
  - Items: ${clothingItems.map(i => i.category).join(', ')}
  
  Return JSON with:
  {
    "suggestion": "Overall styling advice",
    "combinations": [
      {
        "items": ["category1", "category2"],
        "reason": "Why this works"
      }
    ]
  }`;

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }]
  });

  const text = result.response.text();
  try {
    return JSON.parse(text);
  } catch {
    return {
      suggestion: "Mix and match based on color coordination",
      combinations: []
    };
  }
};