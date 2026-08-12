const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');

function packageStaticSite() {
  fs.mkdirSync(distDir, { recursive: true });

  const html = fs
    .readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace(/src="dist\/bundle\.js"/, 'src="./bundle.js"')
    .replace(/href="style\.css"/, 'href="./style.css"');

  fs.writeFileSync(path.join(distDir, 'index.html'), html);
  fs.copyFileSync(path.join(root, 'style.css'), path.join(distDir, 'style.css'));
}

const watch = process.argv.includes('--watch');

async function main() {
  const options = {
    entryPoints: [path.join(root, 'src/main.js')],
    bundle: true,
    outfile: path.join(distDir, 'bundle.js'),
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
    console.log('build complete → dist/');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
