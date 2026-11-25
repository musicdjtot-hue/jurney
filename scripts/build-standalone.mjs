import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tmpOutDir = path.join(rootDir, '.tmp-standalone');
const targetDir = path.join(rootDir, 'public', 'downloads');
const targetFile = path.join(targetDir, 'cyber_horizon.html');
const facePhotoPath = path.join(rootDir, 'public', 'assets', 'aistudio', '1791008464301_391386f9.jpg');

function stubPwaRegisterPlugin() {
  return {
    name: 'stub-pwa-register',
    resolveId(id) {
      if (id === 'virtual:pwa-register') {
        return '\0virtual:pwa-register';
      }
      return null;
    },
    load(id) {
      if (id === '\0virtual:pwa-register') {
        return 'export function registerSW() { return () => {}; }';
      }
      return null;
    },
  };
}

async function main() {
  await build({
    configFile: false,
    root: rootDir,
    base: './',
    publicDir: false,
    logLevel: 'warn',
    plugins: [
      stubPwaRegisterPlugin(),
      react(),
      tailwindcss(),
      viteSingleFile({ removeViteModuleLoader: true }),
    ],
    define: {
      'import.meta.env.VITE_STANDALONE_MODE': JSON.stringify('true'),
    },
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    build: {
      outDir: tmpOutDir,
      emptyOutDir: true,
      assetsInlineLimit: 100 * 1024 * 1024,
      chunkSizeWarningLimit: 5000,
    },
  });

  const builtHtmlPath = path.join(tmpOutDir, 'index.html');
  let html = fs.readFileSync(builtHtmlPath, 'utf8');

  let faceDataUri = '';
  if (fs.existsSync(facePhotoPath)) {
    const base64 = fs.readFileSync(facePhotoPath).toString('base64');
    faceDataUri = `data:image/jpeg;base64,${base64}`;
  }

  const bootstrapScript = `<script>window.__CORUSCANT_STANDALONE__=true;${
    faceDataUri ? `window.__COMPANION_FACE_DATA_URI__=${JSON.stringify(faceDataUri)};` : ''
  }</script>`;

  html = html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${bootstrapScript}`);

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetFile, html, 'utf8');

  const androidAssetsDir = path.join(rootDir, 'android-apk', 'app', 'src', 'main', 'assets');
  if (fs.existsSync(path.join(rootDir, 'android-apk', 'app', 'src', 'main'))) {
    fs.mkdirSync(androidAssetsDir, { recursive: true });
    fs.writeFileSync(path.join(androidAssetsDir, 'index.html'), html, 'utf8');
  }

  fs.rmSync(tmpOutDir, { recursive: true, force: true });

  const sizeKb = Math.round(fs.statSync(targetFile).size / 1024);
  console.log(`Built full standalone HTML (${sizeKb} KB) -> public/downloads/cyber_horizon.html & android-apk/app/src/main/assets/index.html`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
