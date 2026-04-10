/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'calidad-blue': '#0f3c7a',
        'calidad-red': '#d9232a',
      },
    },
  },
  plugins: [],
}
