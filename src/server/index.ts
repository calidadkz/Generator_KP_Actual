import express, { Request, Response } from 'express';
import path from 'path';
import { cleanDialogueText, analyzeDialogue, extractBatchInsights, listAvailableModels } from './geminiApi';
import { ExtractedDialogueData } from '../types';

console.log('[server] Initializing Express app...');

const app = express();
app.use(express.json({ limit: '10mb' }));

console.log('[server] Setting up static file serving...');
// Serve static files from /app/dist (React SPA build output)
// Don't fail if directory doesn't exist - we'll serve the SPA fallback from the * route
const staticDir = '/app/dist';
try {
  app.use(express.static(staticDir, {
    maxAge: '1y',
    etag: false,
    setHeaders: (res, filePath) => {
      // index.html should never be cached
      if (filePath.endsWith('.html')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));
  console.log(`[server] ✓ Static files configured from ${staticDir}`);
} catch (err) {
  console.error('[server] ✗ Static files setup failed:', err);
}

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

console.log('[server] Starting server initialization...');
console.log(`[server] PORT: ${PORT}`);
console.log(`[server] NODE_ENV: ${process.env.NODE_ENV}`);

try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] ✓✓✓ Server listening on 0.0.0.0:${PORT} ✓✓✓`);
    console.log(`[server] Static files: /app/dist`);
    console.log(`[server] API routes: /api/*`);
    console.log(`[server] GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✓ set' : '✗ NOT SET'}`);
  });

  server.on('error', (err) => {
    console.error('[server] Server error:', err);
    process.exit(1);
  });
} catch (err) {
  console.error('[server] FATAL: Failed to start server:', err);
  process.exit(1);
}
