import express, { Request, Response } from 'express';
import path from 'path';
import { cleanDialogueText, analyzeDialogue, extractBatchInsights, listAvailableModels } from './geminiApi';
import { ExtractedDialogueData } from '../types';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Serve static files from /app/dist (React SPA build output)
app.use(express.static('/app/dist', {
  maxAge: '1y',
  etag: false,
  setHeaders: (res, path) => {
    // index.html should never be cached
    if (path.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY не установлен в переменных окружения Cloud Run');
  }
  return key;
}

// API endpoints
app.post('/api/clean-text', async (req: Request, res: Response) => {
  try {
    const { rawText } = req.body;
    if (!rawText) {
      return res.status(400).json({ error: 'rawText is required' });
    }
    const apiKey = getApiKey();
    const cleanedText = await cleanDialogueText(rawText, apiKey);
    res.json({ cleanedText });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.post('/api/analyze-dialogue', async (req: Request, res: Response) => {
  try {
    const { cleanedText } = req.body;
    if (!cleanedText) {
      return res.status(400).json({ error: 'cleanedText is required' });
    }
    const apiKey = getApiKey();
    const result = await analyzeDialogue(cleanedText, apiKey);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.post('/api/extract-batch-insights', async (req: Request, res: Response) => {
  try {
    const { allExtracted } = req.body;
    if (!Array.isArray(allExtracted) || allExtracted.length === 0) {
      return res.status(400).json({ error: 'allExtracted array is required and non-empty' });
    }
    const apiKey = getApiKey();
    const insights = await extractBatchInsights(allExtracted as ExtractedDialogueData[], apiKey);
    res.json(insights);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.get('/api/available-models', async (req: Request, res: Response) => {
  try {
    const apiKey = getApiKey();
    const models = await listAvailableModels(apiKey);
    res.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback: any request that doesn't match an API route or static file → index.html
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join('/app/dist', 'index.html'));
});

const PORT = parseInt(process.env.PORT || '8080', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CALIDAD Server] Listening on 0.0.0.0:${PORT}`);
  console.log(`[CALIDAD Server] Static files: /app/dist`);
  console.log(`[CALIDAD Server] API routes: /api/*`);
  console.log(`[CALIDAD Server] GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✓ set' : '✗ NOT SET'}`);
});
