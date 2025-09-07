/**
 * This is a API server
 */

/**
 * This is a API server
 */

import express, { type Request, type Response, type NextFunction }  from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';
import generateImageHandler from './generate-image.js';


const app: express.Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);

// Add generate-image endpoint
app.post('/api/generate-image', async (req, res) => {
  try {
    // Adapt Express req/res to Vercel format
    const vercelReq = {
      query: req.query,
      cookies: req.cookies || {},
      body: req.body,
      method: req.method,
      headers: req.headers
    };
    
    const vercelRes = {
      status: (code: number) => {
        res.status(code);
        return vercelRes;
      },
      json: (data: any) => {
        res.json(data);
        return vercelRes;
      },
      setHeader: (name: string, value: string) => {
        res.setHeader(name, value);
        return vercelRes;
      }
    };
    
    await generateImageHandler(vercelReq as any, vercelRes as any);
  } catch (error) {
    console.error('Error in generate-image endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.options('/api/generate-image', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

/**
 * health
 */
app.use('/api/health', (req: Request, res: Response, next: NextFunction): void => {
  res.status(200).json({
    success: true,
    message: 'ok'
  });
});

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error'
  });
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found'
  });
});

export default app;