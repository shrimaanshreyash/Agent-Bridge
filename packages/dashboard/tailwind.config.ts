import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
      animation: { 'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' },
    },
  },
  plugins: [],
} satisfies Config;
