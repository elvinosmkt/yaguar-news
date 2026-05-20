import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

// Este arquivo configura o Vite em modo BIBLIOTECA (SDK).
// Gera dois formatos:
//   - ESM  (yaguar-news.es.js)  → para projetos modernos com React/Vite/Next
//   - UMD  (yaguar-news.umd.js) → para projetos mais antigos ou CDN
// React e ReactDOM são "peer deps" — não entram no bundle do SDK.
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/sdk'],
      outDir: 'dist/types',
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/sdk/index.ts'),
      name: 'YaguarNews',
      fileName: (format) => `yaguar-news.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'react/jsx-runtime',
        },
      },
    },
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
  },
});
