import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import autoPreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'iife'
  },
  plugins: [
    svelte({
      include: 'src/components/**/*.svelte',
      preprocess: autoPreprocess(),
      emitCss: false,
    }),
    typescript(),
    resolve({browser: true})
  ]
}