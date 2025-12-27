/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'gaming': ['Orbitron', 'sans-serif'],
        'stats': ['Rajdhani', 'sans-serif'],
        'hero': ['Bangers', 'cursive'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'tilt-left': 'tilt-left 0.3s ease-out',
        'tilt-right': 'tilt-right 0.3s ease-out',
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,255,255,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(255,255,255,0.6)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'tilt-left': {
          '0%': { transform: 'perspective(1000px) rotateY(0deg)' },
          '100%': { transform: 'perspective(1000px) rotateY(-5deg)' },
        },
        'tilt-right': {
          '0%': { transform: 'perspective(1000px) rotateY(0deg)' },
          '100%': { transform: 'perspective(1000px) rotateY(5deg)' },
        },
        'neon-pulse': {
          '0%, 100%': {
            textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
            filter: 'brightness(1)'
          },
          '50%': {
            textShadow: '0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor',
            filter: 'brightness(1.2)'
          },
        },
      },
    },
  },
  plugins: [],
}
