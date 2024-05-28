import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/components/widget.js'),
      name: 'NotiphyWidget',
      fileName: (format) => `notiphy-widget.${format}.js`,
      formats: ['umd']
    },
    rollupOptions: {
      output: {
        globals: {}
      }
    }
  },
  server: {
    open: true,
  },
  assetsInclude: ['**/*.mp3']
});