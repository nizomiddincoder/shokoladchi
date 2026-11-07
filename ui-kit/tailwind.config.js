/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111111',
        paper: '#F3F3F5',
        mut: '#8A8A8E',
        gold: '#F5B301',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 10px rgba(0,0,0,0.05)',
        card: '0 8px 24px rgba(17,17,17,0.10)',
      },
    },
  },
  plugins: [],
};
