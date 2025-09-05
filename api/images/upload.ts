import type { VercelRequest, VercelResponse } from '@vercel/node';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { promises as fs } from 'fs';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// Helper function to run multer middleware
function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('Upload request received');
    
    // Run multer middleware
    await runMiddleware(req, res, upload.single('image'));
    
    const file = (req as any).file;
    console.log('Request file:', file ? 'Present' : 'Missing');
    
    if (!file) {
      console.log('No file in request');
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    console.log('File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bufferLength: file.buffer.length
    });

    // Generate unique ID for the image
    const imageId = uuidv4();
    
    // For Vercel, we'll use /tmp directory for temporary storage
    const uploadsDir = '/tmp';
    
    // Process and save the image
    const originalFilename = file.originalname;
    const fileExtension = path.extname(originalFilename).toLowerCase();
    const filename = `${imageId}${fileExtension}`;
    const filepath = path.join(uploadsDir, filename);
    
    // Validate image buffer before processing
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error('Empty image buffer');
    }
    
    // Optimize image using Sharp
    let processedBuffer = file.buffer;
    let metadata;
    
    try {
      metadata = await sharp(file.buffer).metadata();
      console.log('Image metadata:', metadata);
    } catch (sharpError) {
      console.error('Sharp metadata error:', sharpError);
      throw new Error('Invalid image format or corrupted image');
    }
    
    // Resize if too large (max 2048px on longest side)
    if (metadata.width && metadata.height) {
      const maxDimension = Math.max(metadata.width, metadata.height);
      if (maxDimension > 2048) {
        processedBuffer = await sharp(file.buffer)
          .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
      }
    }
    
    // Save processed image to /tmp
    await fs.writeFile(filepath, processedBuffer);
    
    // Get final metadata
    const finalMetadata = await sharp(processedBuffer).metadata();
    
    res.json({
      success: true,
      imageId,
      imageUrl: `/api/images/file/${filename}`,
      metadata: {
        width: finalMetadata.width,
        height: finalMetadata.height,
        format: finalMetadata.format,
        size: processedBuffer.length
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};