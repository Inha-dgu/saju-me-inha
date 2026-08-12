const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');

function loadEnvFile() {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = loadEnvFile();
const apiKey = process.env.GEMINI_API_KEY || fileEnv.GEMINI_API_KEY || '';

if (!apiKey) {
  console.error('GEMINI_API_KEY가 없습니다. .env 파일 또는 환경변수를 설정하세요.');
  process.exit(1);
}

const watch = process.argv.includes('--watch');

async function main() {
  const options = {
    entryPoints: [path.join(root, 'src/main.js')],
    bundle: true,
    outfile: path.join(root, 'dist/bundle.js'),
    format: 'esm',
    define: {
      __GEMINI_API_KEY__: JSON.stringify(apiKey),
    },
  };

  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('watching…');
  } else {
    await esbuild.build(options);
    console.log('build complete');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
