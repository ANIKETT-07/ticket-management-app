/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      boxShadow: {
        card: '0 2px 14px rgba(99,102,241,0.09), 0 1px 3px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 28px rgba(99,102,241,0.18)',
      },
      borderRadius: { xl2: '1rem', xl3: '1.25rem' },
    },
  },
  plugins: [],
}
