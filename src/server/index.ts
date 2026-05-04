import express, { Request, Response } from 'express';
import path from 'path';
import { cleanDialogueText, analyzeDialogue, extractBatchInsights, extractArticlePatterns, extractBatchArticleTopics, extractStyleDNA, generateArticleDraft, rewriteArticleInStyle, listAvailableModels } from './geminiApi.js';
import { cleanDialogueTextGPT, analyzeDialogueGPT, extractBatchInsightsGPT, extractArticlePatternsGPT, extractBatchArticleTopicsGPT, extractStyleDNAGPT, generateArticleDraftGPT, rewriteArticleInStyleGPT, listGptModels } from './openaiApi.js';
import { ExtractedDialogueData } from '../types.js';

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
    console.error('[server] GEMINI_API_KEY is EMPTY!');
    throw new Error('GEMINI_API_KEY не установлен в переменных окружения Cloud Run');
  }
  const keyPreview = key.substring(0, 15) + '...' + key.substring(key.length - 10);
  console.log(`[server] GEMINI_API_KEY loaded: ${keyPreview}`);
  console.log(`[server] GEMINI_API_KEY length: ${key.length} chars`);
  console.log(`[server] GEMINI_API_KEY hex start: ${Buffer.from(key.substring(0, 5)).toString('hex')}`);
  console.log(`[server] GEMINI_API_KEY hex end: ${Buffer.from(key.substring(key.length - 5)).toString('hex')}`);
  return key;
}

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn('[server] OPENAI_API_KEY is not set - GPT features will not work');
  }
  return key || '';
}

// API endpoints
app.post('/api/clean-text', async (req: Request, res: Response) => {
  try {
    const { rawText, provider, cleaningPrompt, model } = req.body;
    if (!rawText) {
      return res.status(400).json({ error: 'rawText is required' });
    }
    let cleanedText: string;
    if (provider === 'openai') {
      const key = getOpenAIKey();
      if (!key) return res.status(400).json({ error: 'OPENAI_API_KEY not configured' });
      cleanedText = await cleanDialogueTextGPT(rawText, key, cleaningPrompt, model);
    } else {
      cleanedText = await cleanDialogueText(rawText, getApiKey(), cleaningPrompt, model);
    }
    res.json({ cleanedText });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.post('/api/analyze-dialogue', async (req: Request, res: Response) => {
  try {
    const { cleanedText, provider, model } = req.body;
    if (!cleanedText) {
      return res.status(400).json({ error: 'cleanedText is required' });
    }
    let result;
    if (provider === 'openai') {
      const key = getOpenAIKey();
      if (!key) return res.status(400).json({ error: 'OPENAI_API_KEY not configured' });
      result = await analyzeDialogueGPT(cleanedText, key, model || 'gpt-4o');
    } else {
      result = await analyzeDialogue(cleanedText, getApiKey(), model);
    }
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.post('/api/extract-batch-insights', async (req: Request, res: Response) => {
  try {
    const { allExtracted, provider, model } = req.body;
    if (!Array.isArray(allExtracted) || allExtracted.length === 0) {
      return res.status(400).json({ error: 'allExtracted array is required and non-empty' });
    }
    let insights;
    if (provider === 'openai') {
      const key = getOpenAIKey();
      if (!key) return res.status(400).json({ error: 'OPENAI_API_KEY not configured' });
      insights = await extractBatchInsightsGPT(allExtracted as ExtractedDialogueData[], key, model || 'gpt-4o');
    } else {
      insights = await extractBatchInsights(allExtracted as ExtractedDialogueData[], getApiKey());
    }
    res.json(insights);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.post('/api/extract-article-patterns', async (req: Request, res: Response) => {
  try {
    const { cleanedText, provider, model } = req.body;
    if (!cleanedText) {
      return res.status(400).json({ error: 'cleanedText is required' });
    }
    let patterns;
    if (provider === 'openai') {
      const key = getOpenAIKey();
      if (!key) return res.status(400).json({ error: 'OPENAI_API_KEY not configured' });
      patterns = await extractArticlePatternsGPT(cleanedText, key, model || 'gpt-4o-mini');
    } else {
      patterns = await extractArticlePatterns(cleanedText, getApiKey(), model);
    }
    res.json(patterns);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.post('/api/extract-batch-article-topics', async (req: Request, res: Response) => {
  try {
    const { allExtracted, provider, model } = req.body;
    if (!Array.isArray(allExtracted) || allExtracted.length === 0) {
      return res.status(400).json({ error: 'allExtracted array is required and non-empty' });
    }
    let result;
    if (provider === 'openai') {
      const key = getOpenAIKey();
      if (!key) return res.status(400).json({ error: 'OPENAI_API_KEY not configured' });
      result = await extractBatchArticleTopicsGPT(allExtracted as ExtractedDialogueData[], key, model || 'gpt-4o-mini');
    } else {
      result = await extractBatchArticleTopics(allExtracted as ExtractedDialogueData[], getApiKey(), model);
    }
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.post('/api/extract-style-dna', async (req: Request, res: Response) => {
  try {
    const { texts, provider, model } = req.body;
    if (!Array.isArray(texts) || texts.length < 3) {
      return res.status(400).json({ error: 'texts array with at least 3 items is required' });
    }
    let result;
    if (provider === 'openai') {
      const key = getOpenAIKey();
      if (!key) return res.status(400).json({ error: 'OPENAI_API_KEY not configured' });
      result = await extractStyleDNAGPT(texts, key, model || 'gpt-4o-mini');
    } else {
      result = await extractStyleDNA(texts, getApiKey(), model);
    }
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.post('/api/generate-article-draft', async (req: Request, res: Response) => {
  try {
    const { topic, patterns, provider, model } = req.body;
    if (!topic || !patterns) {
      return res.status(400).json({ error: 'topic and patterns are required' });
    }
    let result;
    if (provider === 'openai') {
      const key = getOpenAIKey();
      if (!key) return res.status(400).json({ error: 'OPENAI_API_KEY not configured' });
      result = await generateArticleDraftGPT(topic, patterns, key, model || 'gpt-4o-mini');
    } else {
      result = await generateArticleDraft(topic, patterns, getApiKey(), model);
    }
    res.json({ draft: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.post('/api/rewrite-article-style', async (req: Request, res: Response) => {
  try {
    const { draft, styleDNA, fewShots, provider, model } = req.body;
    if (!draft || !styleDNA) {
      return res.status(400).json({ error: 'draft and styleDNA are required' });
    }
    let result;
    if (provider === 'openai') {
      const key = getOpenAIKey();
      if (!key) return res.status(400).json({ error: 'OPENAI_API_KEY not configured' });
      result = await rewriteArticleInStyleGPT(draft, styleDNA, fewShots || [], key, model || 'gpt-4o-mini');
    } else {
      result = await rewriteArticleInStyle(draft, styleDNA, fewShots || [], getApiKey(), model);
    }
    res.json({ styledContent: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.get('/api/available-models', async (req: Request, res: Response) => {
  try {
    console.log('[server] GET /api/available-models called');
    const apiKey = getApiKey();
    console.log('[server] Calling listAvailableModels...');
    const geminiModels = await listAvailableModels(apiKey);
    const gptModels = listGptModels();
    console.log(`[server] Got ${geminiModels.length} Gemini models, ${gptModels.length} GPT models`);
    res.json({ gemini: geminiModels, gpt: gptModels });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[server] Error in /api/available-models: ${message}`);
    res.status(500).json({ error: message });
  }
});

app.post('/api/wp-publish', async (req: Request, res: Response) => {
  try {
    const { siteUrl, username, appPassword, title, content, tags } = req.body;

    if (!siteUrl || !username || !appPassword || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    const url = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        title,
        content,
        status: 'draft',
        tags: (tags || []).map((t: string) => t.trim()),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WordPress API error (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const data = (await response.json()) as { id?: number; link?: string };
    res.json({ postId: data.id, url: data.link });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[server] Error in /api/wp-publish:', message);
    res.status(500).json({ error: message });
  }
});

app.post('/api/wp-update/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { siteUrl, username, appPassword, title, content, tags } = req.body;

    if (!siteUrl || !username || !appPassword || !postId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    const url = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts/${postId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        title,
        content,
        tags: (tags || []).map((t: string) => t.trim()),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WordPress API error (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const data = (await response.json()) as { id?: number; link?: string };
    res.json({ postId: data.id, url: data.link });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[server] Error in /api/wp-update:', message);
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
