import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import legacy from '@vitejs/plugin-legacy';
import { defineConfig } from 'vite';

const externalPhaserPlugin = {
  name: 'external-phaser',
  resolveId(id: string) {
    if (id === 'phaser') {
      return id;
    }
    return null;
  },
  load(id: string) {
    if (id === 'phaser') {
      return 'export default window.Phaser;';
    }
    return null;
  }
};

export default defineConfig(() => {
  return {
    plugins: [
      svelte(),
      legacy({
        targets: ['Firefox 48'],
      }),
      externalPhaserPlugin
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
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
