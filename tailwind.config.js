/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'christmas-green': '#025939', // Deep Emerald
        'christmas-gold': '#D4AF37',  // Metallic Gold
        'christmas-red': '#8B0000',   // Deep Red
        'christmas-glow': '#FDFBD3',  // Warm Light
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
      }
    },
  },
  plugins: [],
}
