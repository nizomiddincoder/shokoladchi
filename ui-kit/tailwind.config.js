/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          700: 'var(--c-primary-700)',
          600: 'var(--c-primary-600)',
          400: 'var(--c-primary-400)',
          100: 'var(--c-primary-100)',
        },
        bg: 'var(--c-bg)',
        surface: 'var(--c-surface)',
        body: 'var(--c-text)',
        muted: 'var(--c-muted)',
        line: 'var(--c-border)',
        success: 'var(--c-success)', softSuccess: 'var(--c-success-soft)',
        warning: 'var(--c-warning)', softWarning: 'var(--c-warning-soft)',
        danger: 'var(--c-danger)',  softDanger: 'var(--c-danger-soft)',
        starOff: 'var(--c-star-off)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { soft: 'var(--shadow-soft)', pop: 'var(--shadow-pop)' },
      borderRadius: { card: '16px', btn: '12px' },
    },
  },
  plugins: [],
};
