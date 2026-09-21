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
          darkest: '#060911',
          bg: '#090D16',
          surface: '#0E1424',
          surfaceHover: '#141C30',
          card: '#11182A',
          cardHover: '#162038',
          border: '#1E2A44',
          borderLight: '#2C3D63',
          text: '#F8FAFC',
          muted: '#94A3B8',
          accent: 'var(--accent)',
          accentHover: 'var(--accent-hover)',
          accentLight: 'var(--accent-light)',
          accentBg: 'var(--accent-bg)',
          accentBorder: 'var(--accent-border)',
          cyan: '#06B6D4',
          cyanHover: '#0891B2',
          purple: '#8B5CF6',
        }
      },
      boxShadow: {
        'glow-accent': 'var(--accent-glow)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.25)',
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.25)',
        'glow-purple': '0 0 20px -3px rgba(139, 92, 246, 0.25)',
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
