/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      colors: {
        // Primary brand blue (replaces the purple in the reference design)
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
        // Fresh green accent (CTA buttons / active nav, as in the reference)
        leaf: {
          50: '#f0f9ec',
          100: '#ddf1d3',
          200: '#bde3aa',
          400: '#7cc35a',
          500: '#62ad42',
          600: '#4e9233',
          700: '#3d732a',
        },
        canvas: '#e9eff8',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 4px 20px -4px rgba(30, 53, 138, 0.08)',
        card: '0 10px 30px -10px rgba(30, 53, 138, 0.15)',
        lift: '0 18px 40px -12px rgba(37, 80, 235, 0.28)',
        shell: '0 30px 80px -20px rgba(30, 53, 138, 0.18)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'fade-up': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        'fade-up': 'fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
