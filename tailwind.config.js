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
        /**
         * BRAND COLOR TOKENS — re-brand in under 5 minutes
         * ──────────────────────────────────────────────────
         * Change the hex values below to match your LGU's official color palette.
         * All Tailwind utility classes that reference these tokens (e.g. `bg-brand-primary`,
         * `text-brand-navy`) will update automatically across the entire codebase.
         *
         * The `taguig.*` aliases below are kept for backward compatibility.
         * Once you have updated all class names to use `brand.*`, you may remove the
         * taguig block safely.
         */
        brand: {
          primary: '#0038A8',   // → Your primary brand color (replaces taguig-blue)
          accent:  '#D62D20',   // → Your accent/alert color  (replaces taguig-red)
          gold:    '#FFB700',   // → Your highlight color      (replaces taguig-gold)
          navy:    '#001A4D',   // → Your dark brand color     (replaces taguig-navy)
        },
        // ── Backward-compatible aliases — DO NOT REMOVE until all classes are migrated ──
        taguig: {
          blue: '#0038A8',
          red:  '#D62D20',
          gold: '#FFB700',
          navy: '#001A4D',
        },
        brgy: {
          gold: '#FFB700',
        },
        bantay: {
          red:   '#B22222',
          gold:  '#FFD700',
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