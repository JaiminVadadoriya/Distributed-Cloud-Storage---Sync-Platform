/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#9a6f34',
        'primary-container': '#ffdbbb',
        'primary-fixed-dim': '#cca876',
        'on-primary': '#ffffff',
        'secondary-container': '#ffdbbb',
        'on-secondary-container': '#2c1700',
        surface: '#fdffd8',
        'surface-dim': '#f2f4ce',
        'surface-bright': '#ffffe0',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#fcf9ef',
        'surface-container': '#f6f4e8',
        'surface-container-highest': '#eae9db',
        'tertiary-container': '#ffdbbf',
        'on-surface': '#201a11',
        'outline-variant': '#d0c5b5',
        editorial: {
          bg: 'var(--editorial-bg)',
          text: 'var(--editorial-text)',
          accent: 'var(--editorial-accent)',
          border: 'var(--editorial-border)',
          aura: {
            deep: '#1e293b',
            rose: '#4c1d1d',
          }
        },
        critical: 'var(--color-critical)',
        success: 'var(--color-success)',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'monospace'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      boxShadow: {
        ambient: '0px 12px 32px rgba(32, 26, 17, 0.05)'
      },
      borderRadius: {
        xl: '3rem',
        lg: '2rem',
        md: '1.5rem',
        folder: '2rem 2rem 0.5rem 2rem',
        full: '9999px'
      }
    }
  }
};
