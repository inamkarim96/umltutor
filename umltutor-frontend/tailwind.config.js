/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0D0D14',
        accent: '#5046E5',
        muted: '#5A5A72',
        surface: '#F7F7FC',
        'surface-3': '#EFEFF9',
        status: {
          green: '#16A34A',
          amber: '#D97706',
          red: '#DC2626'
        }
      },
      fontFamily: {
        heading: ['sans-serif'],
        body: ['sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(13, 13, 20, 0.08), 0 2px 4px -1px rgba(13, 13, 20, 0.04)',
        hover: '0 10px 15px -3px rgba(13, 13, 20, 0.1), 0 4px 6px -2px rgba(13, 13, 20, 0.05)',
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
        lg: '20px',
      }
    },
  },
  plugins: [],
}
