import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const isVercel = !!process.env.VERCEL;
    const geminiEnvVars = Object.keys(process.env).filter(k => k.includes('GEMINI'));
    
    console.log('🔍 Environment Debug:', {
      isVercel,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      geminiEnvVars,
      nodeEnv: process.env.NODE_ENV
    });

    res.json({
      success: true,
      environment: {
        isVercel,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        apiKeyPreview: apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'Not set',
        geminiEnvVars,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}