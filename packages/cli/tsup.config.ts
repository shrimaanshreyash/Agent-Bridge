import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'bin/agentbridge.ts'],
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
});
