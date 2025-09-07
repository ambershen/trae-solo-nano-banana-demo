import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY environment variable is not set');
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    console.log('🚀 Generating image with prompt:', prompt);
    console.log('🔑 API Key exists:', !!apiKey);
    
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
    
    // Generate image
    const result = await model.generateContent([
      {
        text: `Generate an image based on this prompt: ${prompt}`
      }
    ]);
    
    const response = await result.response;
    
    // Check if the response contains an image
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No image generated');
    }
    
    // Look for image data in the response
    let imageBase64 = null;
    
    for (const candidate of candidates) {
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            imageBase64 = part.inlineData.data;
            break;
          }
        }
      }
      if (imageBase64) break;
    }
    
    if (!imageBase64) {
      // If no image is generated, return a text response
      const text = response.text();
      console.log('⚠️ No image generated, got text response:', text);
      return res.status(200).json({
        success: false,
        error: 'No image was generated',
        textResponse: text
      });
    }
    
    console.log('✅ Image generated successfully');
    
    return res.status(200).json({
      success: true,
      image: imageBase64,
      mimeType: 'image/png'
    });
    
  } catch (error) {
    console.error('❌ Image generation error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}