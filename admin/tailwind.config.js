/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4fa',
          100: '#d9e2f2',
          200: '#b8cce6',
          300: '#8db0d6',
          400: '#5c8fc2',
          500: '#2b5a8e',
          600: '#1d3e68',
          700: '#163153',
          800: '#0f233d',
          900: '#0b192c',
          950: '#07111e', // Dark navy brand sidebar
        },
        sidebar: {
          bg: '#0a1727',
          active: '#1e40af', // vivid blue active item
          hover: '#0f2238',
          text: '#94a3b8',
          textActive: '#ffffff'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.875rem', // 14px
        '2xl': '1.25rem', // 20px
        '3xl': '1.75rem', // 28px
      },
      boxShadow: {
        'premium': '0 10px 30px -5px rgba(15, 23, 42, 0.05), 0 20px 40px -15px rgba(30, 64, 175, 0.07)',
        'premium-hover': '0 20px 40px -10px rgba(15, 23, 42, 0.08), 0 30px 60px -20px rgba(30, 64, 175, 0.12)',
        'glow-blue': '0 8px 25px -4px rgba(30, 64, 175, 0.25)',
        'glow-emerald': '0 8px 25px -4px rgba(16, 185, 129, 0.22)',
        'soft-blur': '0 8px 30px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}
