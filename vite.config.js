import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/components/widget.js'),
      name: 'NotiphyWidget',
      fileName: (format) => `notiphy-widget.v1.1.${format}.js`,
      formats: ['umd']
    },
    rollupOptions: {
      output: {
        globals: {},
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'notiphy.min.css';
          }
          return assetInfo.name;
        }
      }
    }
  },
  server: {
    open: true,
  },
  assetsInclude: ['**/*.mp3']
});
