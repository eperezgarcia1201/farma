import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#071021',
        panel: '#0e1c33',
        line: '#27415c',
        accent: '#43d6cb'
      },
      boxShadow: {
        glow: '0 10px 40px rgba(7, 29, 56, 0.45)'
      }
    }
  },
  plugins: []
};

export default config;
