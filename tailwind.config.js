import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['"Space Grotesk"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        facility: {
          base: '#38bdf8',
          accent: '#22d3ee',
          warning: '#fbbf24',
          success: '#22c55e',
        },
      },
      boxShadow: {
        neon: '0 0 35px rgba(56, 189, 248, 0.35)',
      },
      backgroundImage: {
        grid: 'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.12) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
}
