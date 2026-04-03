/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0C1D2E',
        accent: '#EA580C',
        'accent-light': '#FFF7ED',
        barra: '#FF6600',
      },
      fontFamily: {
        lexend: ['Lexend', 'sans-serif'],
        source: ['"Source Sans 3"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
