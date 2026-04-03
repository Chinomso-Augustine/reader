/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        mist: "#F1F5F9",
        accent: "#0EA5E9",
        accentDark: "#0369A1"
      },
      boxShadow: {
        glow: "0 10px 30px rgba(14,165,233,0.25)"
      }
    }
  },
  plugins: []
};
