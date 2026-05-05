import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./.tmp-setup.js'],
    include: ['tests/ui/trackControls.test.js'],
  },
});
