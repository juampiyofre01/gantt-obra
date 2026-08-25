import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En GitHub Pages el sitio se sirve en /<repo>/, no en la raíz del dominio.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/gantt-obra/' : '/',
  server: {
    open: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
}));
