/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7fa',
          100: '#d5e8f0',
          200: '#a8d1e2',
          300: '#6fb4cf',
          400: '#3d95b8',
          500: '#1a5676',
          600: '#164a66',
          700: '#123d54',
          800: '#0e3043',
          900: '#0a2332',
        },
      },
    },
  },
  plugins: [],
}
