/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#080810',
          panel: '#0d0d1a',
          panel2: '#12121f',
        },
        accent: {
          cyan: '#00d4ff',
        },
        field: {
          b: '#0066ff',
          bHot: '#00d4ff',
          e: '#ff8800',
          eHot: '#ffee00',
          i: '#00ff88',
        },
        metal: '#aaaaaa',
      },
      fontFamily: {
        mono: ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['Syne', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
