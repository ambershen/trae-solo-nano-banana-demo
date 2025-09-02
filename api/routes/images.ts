import express, { Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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

// In-memory storage for processing jobs
interface ProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  originalImagePath?: string;
  resultImagePath?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

const processingJobs = new Map<string, ProcessingJob>();

// Available effects
const EFFECTS = {
  big_head: {
    name: 'Big Head Effect',
    description: 'Make the head appear larger and more prominent',
    prompt: 'Using the provided image of this person, please inflate the head massively while shrinking the body. Ensure the change is comically dramatic, with a balloon-like oversized head that dominates the scene, making the tiny body look absurdly out of scale.'
  },
  artistic_style: {
    name: 'Big Body Effect',
    description: 'Make the body appear larger while shrinking the head',
    prompt: 'Using the provided image of this person, please shrink the head drastically while enlarging the body. Ensure the change is striking and humorous, with a minuscule head perched awkwardly on a hulking, exaggerated body.'
  },
  cartoon_effect: {
    name: 'Cartoon Effect',
    description: 'Convert to cartoon-like appearance',
    prompt: 'Transform this image into a cartoon or animated style with simplified features, bold outlines, and vibrant colors. Make it look like a professional cartoon illustration while preserving the main subject.'
  },
  vintage_filter: {
    name: 'Vintage Filter',
    description: 'Apply retro vintage look',
    prompt: 'Apply a vintage retro filter to this image with warm tones, slight sepia effects, and classic photography aesthetics. Add subtle grain and adjust colors to create a nostalgic, timeless appearance.'
  }
};

// Image upload endpoint
router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    console.log('Upload request received');
    console.log('Request file:', req.file ? 'Present' : 'Missing');
    
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    console.log('File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer.length
    });

    // Generate unique ID for the image
    const imageId = uuidv4();
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Ensure uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Process and save the image
    const originalFilename = req.file.originalname;
    const fileExtension = path.extname(originalFilename).toLowerCase();
    const filename = `${imageId}${fileExtension}`;
    const filepath = path.join(uploadsDir, filename);
    
    // Validate image buffer before processing
    if (!req.file.buffer || req.file.buffer.length === 0) {
      throw new Error('Empty image buffer');
    }
    
    // Optimize image using Sharp
    let processedBuffer = req.file.buffer;
    let metadata;
    
    try {
      metadata = await sharp(req.file.buffer).metadata();
      console.log('Image metadata:', metadata);
    } catch (sharpError) {
      console.error('Sharp metadata error:', sharpError);
      throw new Error('Invalid image format or corrupted image');
    }
    
    // Resize if too large (max 2048px on longest side)
    if (metadata.width && metadata.height) {
      const maxDimension = Math.max(metadata.width, metadata.height);
      if (maxDimension > 2048) {
        processedBuffer = await sharp(req.file.buffer)
          .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
      }
    }
    
    // Save processed image
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
});

// Apply effect endpoint
router.post('/apply-effect', async (req: Request, res: Response) => {
  try {
    console.log('Apply effect request body:', req.body);
    console.log('Apply effect request headers:', req.headers);
    
    const { imageId, effectType, intensity = 0.8 } = req.body;
    
    console.log('Extracted values:', { imageId, effectType, intensity });
    
    if (!imageId || !effectType) {
      console.log('Missing required fields - imageId:', imageId, 'effectType:', effectType);
      return res.status(400).json({
        success: false,
        error: 'Missing imageId or effectType'
      });
    }
    
    if (!EFFECTS[effectType as keyof typeof EFFECTS]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid effect type'
      });
    }
    
    // Create processing job
    const jobId = uuidv4();
    const job: ProcessingJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };
    
    processingJobs.set(jobId, job);
    
    // Start processing asynchronously
    processImageWithAI(jobId, imageId, effectType, intensity).catch(error => {
      console.error('Processing error:', error);
      const job = processingJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = 'Processing failed';
        processingJobs.set(jobId, job);
      }
    });
    
    res.json({
      success: true,
      jobId,
      estimatedTime: 30 // seconds
    });
  } catch (error) {
    console.error('Apply effect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start processing'
    });
  }
});

// Get processing status
router.get('/status/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = processingJobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    });
  }
  
  res.json({
    status: job.status,
    progress: job.progress,
    resultUrl: job.resultImagePath ? `/api/images/file/${path.basename(job.resultImagePath)}` : undefined,
    error: job.error
  });
});

// Serve image files
router.get('/file/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(process.cwd(), 'uploads', filename);
    
    // Check if file exists
    await fs.access(filepath);
    
    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };
    
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    
    // Stream the file
    const fileBuffer = await fs.readFile(filepath);
    res.send(fileBuffer);
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }
});

// Get available effects
router.get('/effects', (req: Request, res: Response) => {
  const effectsList = Object.entries(EFFECTS).map(([key, effect]) => ({
    id: key,
    name: effect.name,
    description: effect.description
  }));
  
  res.json({
    success: true,
    effects: effectsList
  });
});

// AI processing function
async function processImageWithAI(jobId: string, imageId: string, effectType: string, intensity: number) {
  const job = processingJobs.get(jobId);
  if (!job) return;
  
  try {
    // Update job status
    job.status = 'processing';
    job.progress = 10;
    processingJobs.set(jobId, job);
    
    // Find the original image
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = await fs.readdir(uploadsDir);
    const originalFile = files.find(file => file.startsWith(imageId));
    
    if (!originalFile) {
      throw new Error('Original image not found');
    }
    
    const originalPath = path.join(uploadsDir, originalFile);
    job.originalImagePath = originalPath;
    job.progress = 20;
    processingJobs.set(jobId, job);
    
    // Read and prepare image for Gemini
    const imageBuffer = await fs.readFile(originalPath);
    const base64Image = imageBuffer.toString('base64');
    
    job.progress = 30;
    processingJobs.set(jobId, job);
    
    // Get effect configuration
    const effect = EFFECTS[effectType as keyof typeof EFFECTS];
    const prompt = `${effect.prompt} Apply this transformation with ${Math.round(intensity * 100)}% intensity.`;
    
    job.progress = 40;
    processingJobs.set(jobId, job);
    
    // For now, simulate AI processing since Gemini 2.0 Flash doesn't support image generation
    // In a real implementation, you would use an image generation model
    console.log(`Processing image with effect: ${effectType}, prompt: ${prompt}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    job.progress = 70;
    processingJobs.set(jobId, job);
    
    // For demo purposes, apply a simple filter using Sharp
    let processedBuffer: Buffer;
    
    switch (effectType) {
      case 'big_head':
        // Simulate big head effect with slight blur and contrast
        processedBuffer = await sharp(imageBuffer)
          .modulate({ brightness: 1.1, saturation: 1.2 })
          .sharpen()
          .toBuffer();
        break;
      case 'artistic_style':
        // Artistic style with enhanced colors
        processedBuffer = await sharp(imageBuffer)
          .modulate({ brightness: 1.05, saturation: 1.3, hue: 10 })
          .blur(0.5)
          .sharpen()
          .toBuffer();
        break;
      case 'cartoon_effect':
        // Cartoon effect with high contrast
        processedBuffer = await sharp(imageBuffer)
          .modulate({ brightness: 1.1, saturation: 1.4 })
          .linear(1.2, -(128 * 1.2) + 128)
          .toBuffer();
        break;
      case 'vintage_filter':
        // Vintage effect with sepia tones
        processedBuffer = await sharp(imageBuffer)
          .modulate({ brightness: 0.9, saturation: 0.8 })
          .tint({ r: 255, g: 240, b: 200 })
          .toBuffer();
        break;
      default:
        processedBuffer = imageBuffer;
    }
    
    job.progress = 90;
    processingJobs.set(jobId, job);
    
    // Save processed image
    const resultFilename = `processed_${jobId}.jpg`;
    const resultPath = path.join(uploadsDir, resultFilename);
    await fs.writeFile(resultPath, processedBuffer);
    
    // Complete the job
    job.status = 'completed';
    job.progress = 100;
    job.resultImagePath = resultPath;
    job.completedAt = new Date();
    processingJobs.set(jobId, job);
    
    console.log(`Image processing completed for job ${jobId}`);
  } catch (error) {
    console.error('AI processing error:', error);
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    processingJobs.set(jobId, job);
  }
}

export default router;