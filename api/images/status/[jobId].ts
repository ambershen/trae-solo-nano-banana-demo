import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import { processingJobs } from '../apply-effect';

// Note: In production, this should use a shared database or Redis
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
    const { jobId } = req.query;
    
    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid jobId'
      });
    }
    
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
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check status'
    });
  }
}