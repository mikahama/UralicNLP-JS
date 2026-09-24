import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import uralicNLP, {
  analyze,
  generate,
  lemmatize,
  segment,
  get_translation,
  tokenizer,
  download,
  is_language_installed,
  uninstall,
  getStorage,
} from './src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON: ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function serveStatic(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Static files
  if (req.method === 'GET') {
    if (pathname === '/' || pathname === '/index.html') {
      serveStatic(res, path.join(__dirname, 'public', 'index.html'), 'text/html; charset=utf-8');
      return;
    }
    if (pathname === '/style.css') {
      serveStatic(res, path.join(__dirname, 'public', 'style.css'), 'text/css; charset=utf-8');
      return;
    }
    if (pathname === '/app.js') {
      serveStatic(res, path.join(__dirname, 'public', 'app.js'), 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/uralicnlp.min.js') {
      serveStatic(res, path.join(__dirname, 'dist', 'uralicnlp.min.js'), 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/uralicnlp.min.js.map') {
      serveStatic(res, path.join(__dirname, 'dist', 'uralicnlp.min.js.map'), 'application/json');
      return;
    }

    // API: check installed status
    if (pathname === '/api/status') {
      const lang = urlObj.searchParams.get('lang');
      if (!lang) {
        sendJson(res, 400, { error: 'Missing "lang" query parameter' });
        return;
      }
      try {
        const installed = await is_language_installed(lang);
        sendJson(res, 200, { language: lang, installed });
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return;
    }

    // API: list installed languages on server
    if (pathname === '/api/installed') {
      try {
        const storage = await getStorage();
        const langs = await storage.listInstalledLanguages();
        const baseFolders = storage.getBaseFolders ? storage.getBaseFolders() : [];
        sendJson(res, 200, { languages: langs, baseFolders });
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return;
    }
  }

  // API endpoints
  if (req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const start = performance.now();

      if (pathname === '/api/analyze') {
        const { query, language, options = {} } = body;
        if (!query || !language) {
          sendJson(res, 400, { error: 'Missing "query" or "language"' });
          return;
        }
        const result = await analyze(query, language, options);
        const durationMs = performance.now() - start;
        sendJson(res, 200, { result, durationMs });
        return;
      }

      if (pathname === '/api/generate') {
        const { query, language, options = {} } = body;
        if (!query || !language) {
          sendJson(res, 400, { error: 'Missing "query" or "language"' });
          return;
        }
        const result = await generate(query, language, options);
        const durationMs = performance.now() - start;
        sendJson(res, 200, { result, durationMs });
        return;
      }

      if (pathname === '/api/lemmatize') {
        const { word, language, options = {} } = body;
        if (!word || !language) {
          sendJson(res, 400, { error: 'Missing "word" or "language"' });
          return;
        }
        const result = await lemmatize(word, language, options);
        const durationMs = performance.now() - start;
        sendJson(res, 200, { result, durationMs });
        return;
      }

      if (pathname === '/api/segment') {
        const { query, language, options = {} } = body;
        if (!query || !language) {
          sendJson(res, 400, { error: 'Missing "query" or "language"' });
          return;
        }
        const result = await segment(query, language, options);
        const durationMs = performance.now() - start;
        sendJson(res, 200, { result, durationMs });
        return;
      }

      if (pathname === '/api/get_translation') {
        const { lemma, lang, trans_lang = null, options = {} } = body;
        if (!lemma || !lang) {
          sendJson(res, 400, { error: 'Missing "lemma" or "lang"' });
          return;
        }
        const result = await get_translation(lemma, lang, trans_lang, options);
        const durationMs = performance.now() - start;
        sendJson(res, 200, { result, durationMs });
        return;
      }

      if (pathname === '/api/tokenize') {
        const { text, type = 'tokenize' } = body;
        if (typeof text !== 'string') {
          sendJson(res, 400, { error: 'Missing "text" string' });
          return;
        }
        let result;
        if (type === 'sentences') {
          result = tokenizer.sentences(text);
        } else if (type === 'words') {
          result = tokenizer.words(text);
        } else {
          result = tokenizer.tokenize(text);
        }
        const durationMs = performance.now() - start;
        sendJson(res, 200, { result, durationMs });
        return;
      }

      if (pathname === '/api/download') {
        const { language, options = {} } = body;
        if (!language) {
          sendJson(res, 400, { error: 'Missing "language"' });
          return;
        }
        await download(language, options);
        const durationMs = performance.now() - start;
        sendJson(res, 200, { success: true, language, durationMs });
        return;
      }

      if (pathname === '/api/uninstall') {
        const { language } = body;
        if (!language) {
          sendJson(res, 400, { error: 'Missing "language"' });
          return;
        }
        await uninstall(language);
        sendJson(res, 200, { success: true, language });
        return;
      }
    } catch (err) {
      sendJson(res, 500, { error: err.message, stack: err.stack });
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 UralicNLP-JS GUI Server running at:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`=================================================\n`);
});

export default server;
