/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dock: {
          darkest: '#08090d',
          bg: '#0c0d12',
          surface: '#12141c',
          surfaceHover: '#181b26',
          card: '#141722',
          cardHover: '#1a1e2c',
          border: '#1e2230',
          borderLight: '#282e42',
          text: '#f1f5f9',
          muted: '#828fa3',
          accent: 'var(--accent)',
          accentHover: 'var(--accent-hover)',
          accentLight: 'var(--accent-light)',
          accentBg: 'var(--accent-bg)',
          accentBorder: 'var(--accent-border)',
          cyan: '#0ea5e9',
          cyanHover: '#0284c7',
          purple: '#7c3aed',
        }
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'dropdown': '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        'fluent': '0 4px 20px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
      fontFamily: {
        mono: ['Cascadia Code', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'Segoe UI Variable Display', 'Segoe UI', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
