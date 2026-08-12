const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'dist');

/** @returns {Record<string, string>} */
function loadEnvFile() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return {};

  /** @type {Record<string, string>} */
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
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
    env[key] = value;
  }
  return env;
}

function packageStaticSite() {
  fs.mkdirSync(outDir, { recursive: true });

  const html = fs
    .readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace(/src="(?:dist|public)\/bundle\.js[^"]*"/, `src="./bundle.js?v=${Date.now()}"`)
    .replace(/href="style\.css"/, 'href="./style.css"');

  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  fs.copyFileSync(path.join(root, 'style.css'), path.join(outDir, 'style.css'));
}

const watch = process.argv.includes('--watch');

async function main() {
  const options = {
    entryPoints: [path.join(root, 'src/main.jsx')],
    bundle: true,
    outfile: path.join(outDir, 'bundle.js'),
    format: 'esm',
    jsx: 'automatic',
    plugins: [
      {
        name: 'virtual-env',
        setup(build) {
          build.onResolve({ filter: /^virtual:env$/ }, () => ({
            path: 'virtual:env',
            namespace: 'virtual-env',
          }));
          build.onLoad({ filter: /.*/, namespace: 'virtual-env' }, () => {
            const env = loadEnvFile();
            return {
              contents: [
                `export const SUPABASE_URL = ${JSON.stringify(env.SUPABASE_URL || '')};`,
                `export const SUPABASE_ANON_KEY = ${JSON.stringify(env.SUPABASE_ANON_KEY || '')};`,
              ].join('\n'),
              loader: 'js',
            };
          });
        },
      },
      {
        name: 'package-static',
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length === 0) packageStaticSite();
          });
        },
      },
    ],
  };

  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('watching…');
  } else {
    await esbuild.build(options);
    console.log('build complete → dist/');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
