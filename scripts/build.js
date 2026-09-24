import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('Building UralicNLP-JS bundles...');

// Plugin to shim node built-ins and node-only storage in browser bundles
const browserShimsPlugin = {
  name: 'browser-shims',
  setup(build) {
    const emptyFsPath = path.resolve(rootDir, 'src/shims/empty-fs.js');
    const emptyPathPath = path.resolve(rootDir, 'src/shims/empty-path.js');
    const emptyOsPath = path.resolve(rootDir, 'src/shims/empty-os.js');
    const emptyUrlPath = path.resolve(rootDir, 'src/shims/empty-url.js');
    const emptyNodeStoragePath = path.resolve(rootDir, 'src/shims/empty-node-storage.js');

    build.onResolve({ filter: /^(node:fs|fs)$/ }, () => ({
      path: emptyFsPath,
    }));
    build.onResolve({ filter: /^(node:path|path)$/ }, () => ({
      path: emptyPathPath,
    }));
    build.onResolve({ filter: /^(node:os|os)$/ }, () => ({
      path: emptyOsPath,
    }));
    build.onResolve({ filter: /^(node:url|url)$/ }, () => ({
      path: emptyUrlPath,
    }));
    build.onResolve({ filter: /node-storage\.js$/ }, () => ({
      path: emptyNodeStoragePath,
    }));
  },
};

// 1. CommonJS build for Node.js
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/index.js')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: path.join(distDir, 'uralicnlp.cjs'),
  external: ['hfst-js'],
  sourcemap: true,
});
console.log('✓ Created dist/uralicnlp.cjs');

// 2. ESM build for Node.js & modern bundlers
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/index.js')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: path.join(distDir, 'uralicnlp.esm.js'),
  external: ['hfst-js'],
  sourcemap: true,
});
console.log('✓ Created dist/uralicnlp.esm.js');

// 3. Standalone Browser IIFE bundle (single JS file for non-node client side projects)
// Embeds hfst-js and abrvs directly, with zero Node dependencies!
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/browser.js')],
  bundle: true,
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  globalName: 'uralicNLP',
  outfile: path.join(distDir, 'uralicnlp.min.js'),
  plugins: [browserShimsPlugin],
  minify: true,
  sourcemap: true,
});
console.log('✓ Created dist/uralicnlp.min.js (standalone browser bundle)');

// Also generate an unminified browser bundle for debugging
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/browser.js')],
  bundle: true,
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  globalName: 'uralicNLP',
  outfile: path.join(distDir, 'uralicnlp.bundle.js'),
  plugins: [browserShimsPlugin],
  minify: false,
  sourcemap: true,
});
console.log('✓ Created dist/uralicnlp.bundle.js (unminified)');

// 4. Copy TypeScript declarations
fs.copyFileSync(
  path.join(rootDir, 'src/index.d.ts'),
  path.join(distDir, 'index.d.ts')
);
console.log('✓ Created dist/index.d.ts');

console.log('Build completed successfully!');
