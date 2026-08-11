/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        cyberpunk: {
          dark: '#0a0a1a',
          accent: '#00f2ff',
          error: '#ff4757',
          neon: '#00f2ff',
        }
      }
    },
  },
  plugins: [],
}
