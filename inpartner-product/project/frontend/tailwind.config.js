/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b4fd',
          400: '#608dfa',
          500: '#3b6af6',
          600: '#2550eb',
          700: '#1d3fd8',
          800: '#1e35af',
          900: '#1e318a',
        },
        leaf: {
          50: '#f0f9ec',
          100: '#ddf1d3',
          200: '#bde3aa',
          400: '#7cc35a',
          500: '#62ad42',
          600: '#4e9233',
          700: '#3d732a',
        },
        canvas: '#f8fafc',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.04)',
        'glass-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.08)',
        soft: '0 4px 20px -4px rgba(0, 0, 0, 0.05)',
        card: '0 10px 30px -10px rgba(0, 0, 0, 0.06)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
