/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.js"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-surface": "#e2e2eb",
        "surface-tint": "#3cd7ff",
        "tertiary": "#6af7ba",
        "inverse-primary": "#00677e",
        "surface-container-low": "#191b22",
        "secondary-container": "#571bc1",
        "secondary-fixed": "#e9ddff",
        "primary": "#a8e8ff",
        "surface-container": "#1d1f26",
        "primary-container": "#00d4ff",
        "on-error": "#690005",
        "tertiary-fixed-dim": "#4edea3",
        "on-secondary-fixed": "#23005c",
        "inverse-surface": "#e2e2eb",
        "tertiary-container": "#49da9f",
        "error-container": "#93000a",
        "surface-dim": "#111319",
        "on-background": "#e2e2eb",
        "inverse-on-surface": "#2e3037",
        "primary-fixed-dim": "#3cd7ff",
        "on-primary": "#003642",
        "on-secondary-fixed-variant": "#5516be",
        "on-secondary-container": "#c4abff",
        "outline": "#859398",
        "error": "#ffb4ab",
        "outline-variant": "#3c494e",
        "on-secondary": "#3c0091",
        "primary-fixed": "#b4ebff",
        "secondary-fixed-dim": "#d0bcff",
        "surface": "#111319",
        "surface-variant": "#33343c",
        "on-tertiary-fixed-variant": "#005236",
        "on-surface-variant": "#bbc9cf",
        "on-tertiary-container": "#005c3e",
        "secondary": "#d0bcff",
        "surface-container-high": "#282a31",
        "on-error-container": "#ffdad6",
        "on-primary-fixed": "#001f27",
        "on-primary-fixed-variant": "#004e5f",
        "surface-bright": "#373940",
        "surface-container-highest": "#33343c",
        "on-tertiary": "#003824",
        "tertiary-fixed": "#6ffbbe",
        "on-primary-container": "#00586b",
        "surface-container-lowest": "#0c0e14",
        "on-tertiary-fixed": "#002113",
        "background": "#080a10",
        "void": "#06080F",
        neon: {
          cyan: '#00F0FF',
          emerald: '#10B981',
          amber: '#F59E0B',
          purple: '#A855F7',
          rose: '#F43F5E'
        }
      },
      boxShadow: {
        glowCyan: '0 0 20px -3px rgba(0, 240, 255, 0.25)',
        glowAmber: '0 0 20px -3px rgba(245, 158, 11, 0.25)',
        glowPurple: '0 0 20px -3px rgba(168, 85, 247, 0.25)',
        glowEmerald: '0 0 20px -3px rgba(16, 185, 129, 0.25)',
        islandGlow: '0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.08)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
};
