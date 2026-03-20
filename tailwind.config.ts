import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#faf8f5',
          100: '#f3efe8',
          200: '#e5ddd0',
          300: '#d4c5ae',
          400: '#bfa88a',
          500: '#a8896a',
          600: '#977559',
          700: '#7d604b',
          800: '#674f41',
          900: '#564337',
          950: '#2e221c',
        },
        gold: {
          DEFAULT: '#c9a96e',
          light: '#dbc192',
          dark: '#a8864a',
          foreground: '#1a1207',
        },
        teal: {
          DEFAULT: '#16a34a',
          light: '#22c55e',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
