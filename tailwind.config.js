/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'casino-gold': '#D4AF37',
        'casino-red': '#660000',
        'casino-black': '#0F0F0F',
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', 'serif'],
      },
    },
  },
  plugins: [],
}