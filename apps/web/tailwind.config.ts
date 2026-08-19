import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#17202D', canvas: '#F7F8FA', brand: '#315BE6' },
      boxShadow: { card: '0 1px 2px rgb(16 24 40 / 0.04), 0 1px 3px rgb(16 24 40 / 0.08)' },
    },
  },
  plugins: [],
} satisfies Config;
