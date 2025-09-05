import type { VercelRequest, VercelResponse } from '@vercel/node';

// Available effects for image generation
const EFFECTS = {
  anime_style: {
    name: 'Anime Style',
    description: 'Transform portrait into pretty anime style',
    prompt: 'Using the provided image of this person, transform this portrait into pretty, anime style.'
  },
  picasso_style: {
    name: 'Picasso Style',
    description: 'Transform portrait into Picasso painting style',
    prompt: 'Here\'s your portrait transformed into the style of a Picasso painting.'
  },
  oil_painting: {
    name: 'Oil Painting Style',
    description: 'Transform portrait into Degas oil painting style',
    prompt: 'Here\'s the portrait transformed into the style of a Degas oil painting.'
  },
  frida_effect: {
    name: 'Frida Style',
    description: 'Transform portrait into Frida Kahlo painting style',
    prompt: 'Using the provided image of this person, transform this portrait into Frida Kahlo painting style.'
  },
  miniature_effect: {
    name: 'Miniature Effect',
    description: 'Transform into a collectible figure',
    prompt: 'Create a 1/7 scale commercialized figure of the character in the illustration, in a realistic style and environment. Place the figure on a computer desk, using a circular transparent acrylic base without any text. On the computer screen, display the ZBrush modeling process of the figure. Next to the computer screen, place a BANDAI-style toy packaging box printed with the original artwork.'
  }
};

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
    const effectsList = Object.entries(EFFECTS).map(([key, effect]) => ({
      id: key,
      name: effect.name,
      description: effect.description
    }));
    
    res.json({
      success: true,
      effects: effectsList
    });
  } catch (error) {
    console.error('Effects list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get effects list'
    });
  }
}