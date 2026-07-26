import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import legacy from '@vitejs/plugin-legacy';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      svelte(),
      legacy({
        targets: ['Firefox 48'],
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'phaser': path.resolve(__dirname, 'src/phaser-stub.ts'),
      },
    },

    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
