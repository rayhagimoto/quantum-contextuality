import { build, context } from 'esbuild';

const options = {
  entryPoints: ['assets/proof-math.js'],
  outfile: 'assets/vendor/proof-math.js',
  bundle: true,
  format: 'iife',
  minify: true,
  plugins: [{
    name: 'timeline-only',
    setup(builder) {
      // This adapter uses only the animation engine and native KaTeX DOM.
      // Keep optional video, 3D, and MathJax loaders out of its browser bundle.
      builder.onResolve({ filter: /./ }, args => {
        if (args.kind === 'dynamic-import') return { path: args.path, external: true };
      });
    }
  }]
};

if (process.argv.includes('--watch')) {
  const watcher = await context(options);
  await watcher.watch();
  console.log('Watching assets/proof-math.js');

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await watcher.dispose();
  };
  process.once('SIGINT', () => void stop());
  process.once('SIGTERM', () => void stop());
} else {
  await build(options);
}
