/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    fontFamily: {
      Manrope: ["Manrope", "sans-serif"],
    },
    colors: {
      transparent: "transparent",
      Mblack: "#171717",
      Mwhite: "white",
      Mblue: "#1E19D8",
      Mgreen: "#EAFE89",
    },
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-delayed': 'bounce 1s infinite 0.5s',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        }
      }
    },
  },
  plugins: [],
};
