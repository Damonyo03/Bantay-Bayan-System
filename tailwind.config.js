/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '320px',
      },
      colors: {
        taguig: {
          blue: '#0038A8',
          red: '#D62D20',
          gold: '#FFB700',
          navy: '#001A4D',
        },
        brgy: {
          gold: '#FFB700',
        },
        bantay: {
          red: '#B22222',
          gold: '#FFD700',
          green: '#006400',
          black: '#000000',
        }
      },
      boxShadow: {
        'premium': '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
        'premium-dark': '0 20px 60px -15px rgba(0, 0, 0, 0.5)',
      }
    }
  },
  plugins: [],
}