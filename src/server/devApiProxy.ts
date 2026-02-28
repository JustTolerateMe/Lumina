import { loadEnv } from 'vite';
import type { Plugin } from 'vite';
import pipelineHandler from '../../api/pipeline';
import suggestionsHandler from '../../api/suggestions';
import manualEditHandler from '../../api/manual-edit';

function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/**
 * Patches a bare Node.js ServerResponse with Express-compatible
 * `res.status()` and `res.json()` methods that Vercel's handler expects.
 */
function patchRes(res: any): void {
  if (!res.status) {
    res.status = (code: number) => { res.statusCode = code; return res; };
  }
  if (!res.json) {
    res.json = (data: any) => {
      if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };
  }
}

const HANDLED_ROUTES = new Set(['/api/pipeline', '/api/suggestions', '/api/manual-edit']);

export function devApiProxy(): Plugin {
  return {
    name: 'dev-api-proxy',
    // Runs before configureServer — loads non-VITE_ vars from .env into process.env
    // so the API handlers can access GEMINI_API_KEY
    config(_, { mode }) {
      const env = loadEnv(mode, process.cwd(), '');
      for (const [key, value] of Object.entries(env)) {
        if (!(key in process.env)) process.env[key] = value;
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';

        if (req.method !== 'POST' || !HANDLED_ROUTES.has(url)) {
          return next();
        }

        let body: any = {};
        try {
          const raw = await readBody(req);
          if (raw) body = JSON.parse(raw);
        } catch { /* unparseable body — leave as {} */ }

        const mockReq = { method: req.method, body, url };
        patchRes(res);

        try {
          if (url === '/api/pipeline') await pipelineHandler(mockReq, res);
          else if (url === '/api/suggestions') await suggestionsHandler(mockReq, res);
          else if (url === '/api/manual-edit') await manualEditHandler(mockReq, res);
        } catch (err: any) {
          console.error('[dev-api-proxy]', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message ?? 'Internal error' }));
          }
        }
      });
    },
  };
}
