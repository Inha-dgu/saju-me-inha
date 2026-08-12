const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'public');

function packageStaticSite() {
  fs.mkdirSync(outDir, { recursive: true });

  const html = fs
    .readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace(/src="(?:dist|public)\/bundle\.js"/, 'src="./bundle.js"')
    .replace(/href="style\.css"/, 'href="./style.css"');

  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  fs.copyFileSync(path.join(root, 'style.css'), path.join(outDir, 'style.css'));
}

const watch = process.argv.includes('--watch');

async function main() {
  const options = {
    entryPoints: [path.join(root, 'src/main.js')],
    bundle: true,
    outfile: path.join(outDir, 'bundle.js'),
    format: 'esm',
    plugins: [
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
    console.log('build complete → public/');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
