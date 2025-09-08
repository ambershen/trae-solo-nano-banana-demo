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
    const apiKey = process.env.GEMINI_API_KEY;
    console.log(`🔑 Environment check - VERCEL: ${!!process.env.VERCEL}, API Key exists: ${!!apiKey}`);
    
    if (!apiKey) {
      const error = `GEMINI_API_KEY environment variable is not set in ${process.env.VERCEL ? 'Vercel deployment' : 'local environment'}`;
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

// Test Gemini API connection endpoint
router.get('/test-gemini', async (req: Request, res: Response) => {
  try {
    console.log('\n=== GEMINI API TEST ===');
    console.log(`Environment: ${process.env.VERCEL ? 'Vercel Serverless' : 'Local Development'}`);
    console.log(`API Key exists: ${!!process.env.GOOGLE_API_KEY}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Test Gemini model initialization
    const testModel = getGeminiModel();
    console.log('✅ Gemini model initialized successfully');
    
    // Test a simple text generation to verify API connection
    const result = await testModel.generateContent('Hello, this is a test. Please respond with "Gemini API is working correctly."');
    const response = await result.response;
    const text = response.text();
    
    console.log(`✅ Gemini API response: ${text}`);
    console.log('=== END GEMINI TEST ===\n');
    
    res.json({
      success: true,
      message: 'Gemini API connection successful',
      model: 'gemini-2.5-flash-image-preview',
      environment: process.env.VERCEL ? 'Vercel Serverless' : 'Local Development',
      apiResponse: text,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('\n=== GEMINI API TEST ERROR ===');
    console.error(`Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`Error Message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`Stack Trace: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    console.error('=== END GEMINI TEST ERROR ===\n');
    
    res.status(500).json({
      success: false,
      error: 'Gemini API connection failed',
      details: error instanceof Error ? error.message : String(error),
      environment: process.env.VERCEL ? 'Vercel Serverless' : 'Local Development',
      timestamp: new Date().toISOString()
    });
  }
});

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
    console.error('\n=== IMAGE UPLOAD ERROR ===');
    console.error(`Environment: ${process.env.VERCEL ? 'Vercel Serverless' : 'Local Development'}`);
    console.error(`Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`Error Message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`Stack Trace: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error('=== END UPLOAD ERROR LOG ===\n');
    
    let errorMessage = 'Failed to upload image';
    let statusCode = 500;
    
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('file type') || msg.includes('invalid')) {
        errorMessage = 'Invalid file type. Please upload a JPEG, PNG, or WebP image.';
        statusCode = 400;
      } else if (msg.includes('size') || msg.includes('limit')) {
        errorMessage = 'File too large. Please upload an image smaller than 10MB.';
        statusCode = 400;
      } else if (msg.includes('memory') || msg.includes('heap')) {
        errorMessage = 'Server memory limit reached. Please try with a smaller image.';
        statusCode = 507;
      }
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
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
    processImageWithAI(jobId, imageId, effectType).catch(error => {
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
  
  let resultUrl: string | undefined;
  if (job.resultImagePath) {
    if (job.resultImagePath.startsWith('cache:')) {
      // Extract jobId from cache path and create processed image URL
      const cachedJobId = job.resultImagePath.replace('cache:', '');
      resultUrl = `/api/images/processed/${cachedJobId}`;
    } else {
      // Legacy file-based path
      resultUrl = `/api/images/file/${path.basename(job.resultImagePath)}`;
    }
  }
  
  res.json({
    status: job.status,
    progress: job.progress,
    resultUrl,
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
async function processImageWithAI(jobId: string, imageId: string, effectType: string) {
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

    // Get the original image from cache or uploads folder
    // Since we removed the upload module, we'll use direct cache lookup (returns null to trigger fallback)
    let cachedImage = null; // Direct fallback to uploads folder check
    let imageBuffer: Buffer;
    let mimeType: string;
    
    if (!cachedImage) {
      console.log(`❌ Original image not found in cache for imageId: ${imageId}, checking uploads folder...`);
      
      // Fallback: Check uploads folder for backward compatibility
      const fs = await import('fs');
      const path = await import('path');
      const uploadsDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
      
      // Try different extensions
      const extensions = ['.jpeg', '.jpg', '.png', '.webp'];
      let foundFile = false;
      
      for (const ext of extensions) {
        const filePath = path.join(uploadsDir, `${imageId}${ext}`);
        try {
          if (fs.existsSync(filePath)) {
            console.log(`✅ Found image in uploads folder: ${filePath}`);
            imageBuffer = fs.readFileSync(filePath);
            mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
            foundFile = true;
            job.originalImagePath = `uploads:${imageId}${ext}`;
            break;
          }
        } catch (error) {
          console.log(`Could not read ${filePath}: ${error}`);
        }
      }
      
      if (!foundFile) {
        console.error(`❌ Original image not found in cache or uploads folder for imageId: ${imageId}`);
        throw new Error('Original image not found');
      }
    } else {
      console.log(`✅ Found cached image for ${imageId}, size: ${cachedImage.buffer.length} bytes`);
      imageBuffer = cachedImage.buffer;
      mimeType = 'image/jpeg';
      job.originalImagePath = `cache:${imageId}`;
    }
    
    job.progress = 20;
    processingJobs.set(jobId, job);
    
    // Prepare image for Gemini
    const base64Image = imageBuffer.toString('base64');
    
    job.progress = 30;
    processingJobs.set(jobId, job);
    
    // Get effect configuration and create fixed prompt
    const effect = EFFECTS[effectType as keyof typeof EFFECTS];
    const prompt = effect.prompt;
    
    console.log(`\n=== GEMINI IMAGE GENERATION START ===`);
    console.log(`Job ID: ${jobId}`);
    console.log(`Effect Type: ${effectType}`);
    console.log(`Image Size: ${imageBuffer.length} bytes`);
    console.log(`MIME Type: ${mimeType}`);
    console.log(`Prompt: ${prompt}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    job.progress = 40;
    processingJobs.set(jobId, job);
    
    // Send image and prompt to Gemini 2.5 Flash Image for generation
    console.log(`Calling Gemini 2.5 Flash Image API for image generation...`);
    const apiCallStart = Date.now();
    
    // Add timeout to prevent hanging - reduced for better reliability
    const GEMINI_TIMEOUT = 20000; // 20 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API timeout after 20 seconds')), GEMINI_TIMEOUT);
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
    
    // Monitor memory usage
    const memUsage = process.memoryUsage();
    console.log(`Memory before Gemini call: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    
    const result = await Promise.race([geminiPromise, timeoutPromise]) as any;
    
    const apiCallDuration = Date.now() - apiCallStart;
    console.log(`Gemini API call completed in ${apiCallDuration}ms`);
    
    job.progress = 60;
    processingJobs.set(jobId, job);
    
    const response = await result.response;
    
    // Check if response is valid
    if (!response || !response.candidates || response.candidates.length === 0) {
      throw new Error('Gemini returned empty response - no image generated');
    }
    
    console.log(`\n=== GEMINI API RESPONSE ===`);
    console.log(`Response candidates: ${response.candidates?.length || 0}`);
    
    // Process the response to extract generated image
    let generatedImageBuffer: Buffer | null = null;
    
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
        }
      }
    }
    
    // If no image was generated, throw error
    if (!generatedImageBuffer || generatedImageBuffer.length === 0) {
      throw new Error('No image data in Gemini response - AI generation failed');
    }
    
    console.log(`=== GEMINI IMAGE GENERATION END ===\n`);
    
    job.progress = 80;
    processingJobs.set(jobId, job);
    
    // Use the AI-generated image
    console.log(`Using AI-generated image (${generatedImageBuffer.length} bytes)`);
    let processedBuffer = generatedImageBuffer;
    
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
    
    // Monitor memory usage after processing
    const memUsageAfter = process.memoryUsage();
    console.log(`Memory after processing: ${Math.round(memUsageAfter.heapUsed / 1024 / 1024)}MB`);
    
    job.progress = 90;
    processingJobs.set(jobId, job);
    
    // Store processed image to filesystem with processed_ prefix
    const fs = await import('fs/promises');
    const path = await import('path');
    const processedFilename = `processed_${jobId}.jpg`;
    const uploadsDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
    const processedFilePath = path.join(uploadsDir, processedFilename);
    
    console.log(`💾 Storing processed image to file: "${processedFilePath}"`);
    
    try {
      // Ensure uploads directory exists
      await fs.mkdir(uploadsDir, { recursive: true });
      
      // Clean up old files in /tmp to prevent storage issues (Vercel only)
      if (process.env.VERCEL) {
        try {
          const files = await fs.readdir(uploadsDir);
          const now = Date.now();
          const maxAge = 30 * 60 * 1000; // 30 minutes
          
          for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            try {
              const stats = await fs.stat(filePath);
              if (now - stats.mtime.getTime() > maxAge) {
                await fs.unlink(filePath);
                console.log(`🗑️ Cleaned up old file: ${file}`);
              }
            } catch (cleanupError) {
              // Ignore cleanup errors
            }
          }
        } catch (cleanupError) {
          console.log(`⚠️ File cleanup warning: ${cleanupError}`);
        }
      }
      
      // Write processed image to file
      await fs.writeFile(processedFilePath, processedBuffer);
      
      console.log(`💾 Processed image saved successfully: ${processedFilename} (${processedBuffer.length} bytes)`);
    } catch (writeError) {
      console.error(`❌ Failed to save processed image:`, writeError);
      throw new Error(`Failed to save processed image: ${writeError}`);
    }
    
    // Complete the job
    job.status = 'completed';
    job.progress = 100;
    job.resultImagePath = `cache:${jobId}`;
    job.completedAt = new Date();
    job.aiResponse = 'Image generated successfully using AI';
    processingJobs.set(jobId, job);
    
    console.log(`✅ Processed image cached for job ${jobId}`);
    
    console.log(`Image processing completed for job ${jobId} using AI generation`);
  } catch (error) {
    console.error('\n=== AI IMAGE GENERATION ERROR ===');
    console.error(`Job ID: ${jobId}`);
    console.error(`Effect Type: ${effectType}`);
    console.error(`Environment: ${process.env.VERCEL ? 'Vercel Serverless' : 'Local Development'}`);
    console.error(`Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`Error Message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`Stack Trace: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error('=== END ERROR LOG ===\n');
    
    // Detailed error categorization for better debugging
    let errorCategory = 'unknown';
    let userFriendlyMessage = 'An unexpected error occurred during image processing';
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('api key') || errorMessage.includes('authentication')) {
        errorCategory = 'authentication';
        userFriendlyMessage = 'API authentication failed. Please check environment variables.';
      } else if (errorMessage.includes('timeout')) {
        errorCategory = 'timeout';
        userFriendlyMessage = 'Request timed out. Please try again.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorCategory = 'network';
        userFriendlyMessage = 'Network error occurred. Please check your connection.';
      } else if (errorMessage.includes('file') || errorMessage.includes('storage')) {
        errorCategory = 'storage';
        userFriendlyMessage = 'File storage error. Please try uploading again.';
      } else if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
        errorCategory = 'memory';
        userFriendlyMessage = 'Memory limit exceeded. Please try with a smaller image.';
      } else if (errorMessage.includes('gemini') || errorMessage.includes('ai')) {
        errorCategory = 'ai_service';
        userFriendlyMessage = 'AI service error. Please try again later.';
      }
    }
    
    job.status = 'failed';
    job.error = `[${errorCategory.toUpperCase()}] ${userFriendlyMessage}`;
    job.completedAt = new Date();
    processingJobs.set(jobId, job);
    
    // Log additional system information for debugging
    console.error('\n=== SYSTEM DEBUG INFO ===');
    console.error(`Memory Usage: ${JSON.stringify(process.memoryUsage(), null, 2)}`);
    console.error(`Platform: ${process.platform}`);
    console.error(`Node Version: ${process.version}`);
    console.error(`Environment Variables: VERCEL=${!!process.env.VERCEL}, NODE_ENV=${process.env.NODE_ENV}`);
    console.error('=== END SYSTEM INFO ===\n');
  }
}

// Get processed image endpoint
router.get('/processed/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).json({ success: false, error: 'Job ID is required' });
  }

  try {
    const processedFilename = `processed_${jobId}.jpg`;
    const uploadsDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
    const processedFilePath = path.join(uploadsDir, processedFilename);
    
    console.log(`🔍 Looking for processed image file: "${processedFilePath}"`);
    
    // Check if file exists
    try {
      await fs.access(processedFilePath);
    } catch (accessError) {
      console.log(`❌ Processed image file not found: ${processedFilename}`);
      
      // List available processed files for debugging
      try {
        const files = await fs.readdir(uploadsDir);
        const processedFiles = files.filter(file => file.startsWith('processed_'));
        console.log(`🔍 Available processed files:`, processedFiles);
      } catch (listError) {
        console.log(`❌ Could not list uploads directory:`, listError);
      }
      
      return res.status(404).json({ 
        success: false, 
        error: 'Processed image not found',
        jobId,
        filename: processedFilename
      });
    }
    
    // Read the processed image file
    const imageBuffer = await fs.readFile(processedFilePath);
    console.log(`✅ Found processed image file: ${processedFilename} (${imageBuffer.length} bytes)`);

    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', imageBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Send the image buffer
    res.status(200).send(imageBuffer);
  } catch (error) {
    console.error('Error retrieving processed image:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve processed image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;