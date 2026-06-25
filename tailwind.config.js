/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9ecff",
          200: "#b8dcff",
          300: "#86c5ff",
          400: "#4ca4ff",
          500: "#1a83ff",
          600: "#0066e6",
          700: "#0052bf",
          800: "#05479f",
          900: "#0a3c83",
        },
      },
    },
  },
  plugins: [],
};
