import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d0d0d',
        foreground: '#f2f2f2',
        panel: '#0f0f0f',
        border: '#1f1f1f',
        panelHover: '#151515',
        panelActive: '#1a1a1a'
      },
      borderRadius: {
        xl: '12px'
      }
    },
  },
  plugins: [],
} satisfies Config


