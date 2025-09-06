import express, { Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { promises as fs } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize Gemini AI for image generation (lazy initialization)
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

function getGeminiModel() {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY;
    console.log(`🔑 Environment check - VERCEL: ${!!process.env.VERCEL}, API Key exists: ${!!apiKey}`);
    
    if (!apiKey) {
      const error = `GOOGLE_API_KEY environment variable is not set in ${process.env.VERCEL ? 'Vercel deployment' : 'local environment'}`;
      console.error(`❌ ${error}`);
      throw new Error(error);
    }
    
    if (apiKey.length < 20) {
      const error = `GOOGLE_API_KEY appears to be invalid (too short: ${apiKey.length} characters)`;
      console.error(`❌ ${error}`);
      throw new Error(error);
    }
    
    console.log(`🚀 Initializing Gemini AI with API key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`🌍 Environment: ${process.env.VERCEL ? 'Vercel Serverless' : 'Local Development'}`);
    
    try {
      genAI = new GoogleGenerativeAI(apiKey);
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
      console.log('✅ Gemini AI initialized successfully');
    } catch (initError) {
      console.error(`❌ Failed to initialize Gemini AI: ${initError}`);
      throw new Error(`Gemini AI initialization failed: ${initError}`);
    }
  }
  return model;
}

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
  aiResponse?: string;
}

const processingJobs = new Map<string, ProcessingJob>();

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
}

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
    
    // Use Vercel-compatible temporary storage
    const uploadsDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
    console.log(`📁 Using storage directory: ${uploadsDir}`);
    
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
    console.log('🚀 Vercel apply-effect endpoint called');
    console.log('Apply effect request body:', req.body);
    console.log('Apply effect request headers:', req.headers);
    
    // Validate environment first
    try {
      getGeminiModel();
      console.log('✅ Gemini model validation passed');
    } catch (envError) {
      console.error('❌ Environment validation failed:', envError);
      return res.status(500).json({ 
        success: false,
        error: 'AI service configuration error', 
        details: envError instanceof Error ? envError.message : 'Unknown configuration error'
      });
    }
    
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
    
    console.log(`📝 Created job ${jobId} for image ${imageId} with effect ${effectType}`);
    
    // Start processing asynchronously
    processImageWithAI(jobId, imageId, effectType, intensity).catch(error => {
      console.error(`❌ Error processing image job ${jobId}:`, error);
      const job = processingJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown processing error';
        processingJobs.set(jobId, job);
      }
    });
    
    res.json({
      success: true,
      jobId,
      estimatedTime: 30 // seconds
    });
  } catch (error) {
    console.error('❌ Critical error in apply-effect endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start processing',
      details: error instanceof Error ? error.message : 'Unknown server error'
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
    const uploadsDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
    const filepath = path.join(uploadsDir, filename);
    console.log(`📁 Serving file from: ${filepath}`);
    
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

// AI image generation function using Gemini 2.5 Flash Image
async function processImageWithAI(jobId: string, imageId: string, effectType: string, intensity: number) {
  const job = processingJobs.get(jobId);
  if (!job) return;

  try {
    console.log(`🚀 Starting AI processing for job ${jobId} in environment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
    console.log(`📊 Environment check - GOOGLE_API_KEY exists: ${!!process.env.GOOGLE_API_KEY}`);
    console.log(`📊 Current working directory: ${process.cwd()}`);
    console.log(`📊 Available memory: ${process.memoryUsage().heapUsed / 1024 / 1024}MB`);
    
    // Get Gemini model with proper error handling
    let geminiModel;
    try {
      geminiModel = getGeminiModel();
      console.log('✅ Gemini model obtained successfully for processing');
    } catch (modelError) {
      console.error('❌ Failed to get Gemini model for processing:', modelError);
      throw new Error(`AI service unavailable: ${modelError instanceof Error ? modelError.message : 'Unknown model error'}`);
    }
    
    // Update job status
    job.status = 'processing';
    job.progress = 10;
    processingJobs.set(jobId, job);

    // Find the original image - use consistent storage path
    const uploadsDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
    console.log(`📁 Looking for files in: ${uploadsDir}`);
    
    let files: string[] = [];
    let originalFile: string | undefined;
    
    try {
      files = await fs.readdir(uploadsDir);
      originalFile = files.find(file => file.startsWith(imageId));
      console.log(`📁 Found ${files.length} files, looking for: ${imageId}`);
      console.log(`📁 Available files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
    } catch (dirError) {
      console.error(`❌ Failed to read directory ${uploadsDir}: ${dirError}`);
      throw new Error(`Cannot access storage directory: ${dirError}`);
    }
    
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
    const mimeType = originalFile.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    job.progress = 30;
    processingJobs.set(jobId, job);
    
    // Get effect configuration and create intensity-adjusted prompt
    const effect = EFFECTS[effectType as keyof typeof EFFECTS];
    const intensityDescription = intensity > 0.8 ? 'very dramatic and exaggerated' : 
                                intensity > 0.5 ? 'moderate but noticeable' : 'subtle but visible';
    const prompt = `${effect.prompt} Apply this transformation with ${intensityDescription} intensity (${Math.round(intensity * 100)}%). The result should be a ${intensityDescription} transformation that maintains image quality and realism while achieving the desired effect.`;
    
    console.log(`\n=== GEMINI IMAGE GENERATION START ===`);
    console.log(`Job ID: ${jobId}`);
    console.log(`Effect Type: ${effectType}`);
    console.log(`Intensity: ${intensity} (${intensityDescription})`);
    console.log(`Image Size: ${imageBuffer.length} bytes`);
    console.log(`MIME Type: ${mimeType}`);
    console.log(`Prompt: ${prompt}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    job.progress = 40;
    processingJobs.set(jobId, job);
    
    // Send image and prompt to Gemini 2.5 Flash Image for generation
    console.log(`Calling Gemini 2.5 Flash Image API for image generation...`);
    const apiCallStart = Date.now();
    
    // Add timeout to prevent hanging
    const GEMINI_TIMEOUT = 45000; // 45 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API timeout after 45 seconds')), GEMINI_TIMEOUT);
    });
    
    const geminiPromise = geminiModel.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      },
      prompt
    ]);
    
    const result = await Promise.race([geminiPromise, timeoutPromise]) as any;
    
    const apiCallDuration = Date.now() - apiCallStart;
    console.log(`Gemini API call completed in ${apiCallDuration}ms`);
    
    job.progress = 60;
    processingJobs.set(jobId, job);
    
    const response = await result.response;
    
    console.log(`\n=== GEMINI API RESPONSE ===`);
    console.log(`Response candidates: ${response.candidates?.length || 0}`);
    
    // Process the response to extract generated image
    let generatedImageBuffer: Buffer | null = null;
    let hasTextResponse = false;
    
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          // Check for generated image data
          if (part.inlineData && part.inlineData.data) {
            console.log(`Found generated image data, size: ${part.inlineData.data.length} characters (base64)`);
            generatedImageBuffer = Buffer.from(part.inlineData.data, 'base64');
            console.log(`Decoded image buffer size: ${generatedImageBuffer.length} bytes`);
            break;
          }
          // Check for text response (fallback)
          else if (part.text) {
            console.log(`Found text response: ${part.text.substring(0, 200)}...`);
            hasTextResponse = true;
          }
        }
      }
    }
    
    console.log(`=== GEMINI IMAGE GENERATION END ===\n`);
    
    job.progress = 80;
    processingJobs.set(jobId, job);
    
    let processedBuffer: Buffer;
    
    if (generatedImageBuffer && generatedImageBuffer.length > 0) {
      // Use the AI-generated image
      console.log(`Using AI-generated image (${generatedImageBuffer.length} bytes)`);
      processedBuffer = generatedImageBuffer;
      
      // Optimize the generated image
      try {
        processedBuffer = await sharp(generatedImageBuffer)
          .jpeg({ quality: 90 })
          .toBuffer();
        console.log(`Optimized generated image to ${processedBuffer.length} bytes`);
      } catch (optimizeError) {
        console.log(`Could not optimize generated image, using original: ${optimizeError}`);
        processedBuffer = generatedImageBuffer;
      }
    } else {
      // Fallback: Apply enhanced effects using Sharp if no image was generated
      console.log(`No image generated by AI, applying fallback effects with Sharp`);
      
      switch (effectType) {
        case 'big_head':
          processedBuffer = await sharp(imageBuffer)
            .resize({ width: Math.round(1024 * (1 + intensity * 0.5)), height: Math.round(1024 * (1 + intensity * 0.5)), fit: 'inside' })
            .modulate({ 
              brightness: 1.1 + (intensity * 0.3), 
              saturation: 1.2 + (intensity * 0.4),
              hue: Math.round(intensity * 15)
            })
            .sharpen(1 + intensity * 2)
            .gamma(1.1 + (intensity * 0.3))
            .toBuffer();
          break;
        case 'artistic_style':
          processedBuffer = await sharp(imageBuffer)
            .modulate({ 
              brightness: 1.05 + (intensity * 0.2), 
              saturation: 1.4 + (intensity * 0.5), 
              hue: Math.round(intensity * 20) 
            })
            .blur(0.3 + (intensity * 1.2))
            .sharpen(0.8 + intensity * 1.5)
            .gamma(1.2 + (intensity * 0.4))
            .linear(1.2 + (intensity * 0.3), -(128 * (1.2 + intensity * 0.3)) + 128)
            .toBuffer();
          break;
        case 'aging':
          processedBuffer = await sharp(imageBuffer)
            .modulate({ 
              brightness: 0.9 - (intensity * 0.1), 
              saturation: 0.8 - (intensity * 0.2)
            })
            .gamma(1.3 + (intensity * 0.3))
            .linear(0.9 - (intensity * 0.1), 10 + (intensity * 20))
            .sharpen(0.5 + intensity * 0.5)
            .toBuffer();
          break;
        default:
          processedBuffer = await sharp(imageBuffer)
            .modulate({ brightness: 1.1, saturation: 1.2 })
            .sharpen()
            .toBuffer();
      }
    }
    
    job.progress = 90;
    processingJobs.set(jobId, job);
    
    // Save processed image
    const resultFilename = `generated_${jobId}.jpg`;
    const resultPath = path.join(uploadsDir, resultFilename);
    await fs.writeFile(resultPath, processedBuffer);
    
    // Complete the job
    job.status = 'completed';
    job.progress = 100;
    job.resultImagePath = resultPath;
    job.completedAt = new Date();
    job.aiResponse = generatedImageBuffer ? 'Image generated successfully' : (hasTextResponse ? 'Text response received, applied fallback effects' : 'No response, applied fallback effects');
    processingJobs.set(jobId, job);
    
    console.log(`Image processing completed for job ${jobId} using ${generatedImageBuffer ? 'AI-generated' : 'fallback'} method`);
  } catch (error) {
    console.error('AI image generation error:', error);
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    processingJobs.set(jobId, job);
  }
}

export default router;