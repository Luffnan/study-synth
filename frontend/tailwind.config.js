/** @type {import('tailwindcss').Config} */

// ─────────────────────────────────────────────────────────────────────────────
// THEME CONFIG — change these values to restyle the entire site
// ─────────────────────────────────────────────────────────────────────────────
const THEME = {
  // Font — swap this string to change the site font (update index.html too)
  fontSans: ['Nunito', 'system-ui', 'sans-serif'],

  // Primary brand colour (buttons, active states, highlights)
  brand: {
    50:  '#fff5f5',
    100: '#ffe0e0',
    200: '#ffbaba',
    400: '#e96060',
    500: '#E22028',  // Flavour United Red
    600: '#c41b22',
    700: '#a0161c',
    900: '#6b0e12',
  },

  // Neutral / text colours — ink-900 is the dark button/header colour
  ink: {
    50:  '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#1E4380',  // Flavour United Navy
  },

  // Accent colours (available as Tailwind utilities: bg-accent-yellow etc.)
  accent: {
    yellow:      '#FBBA16',
    navy:        '#1E4380',
    teal:        '#9BCCD0',
    green:       '#00492C',
    lightGreen:  '#B1D8B8',
    pink:        '#E2B2B4',
  },
};
// ─────────────────────────────────────────────────────────────────────────────

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand:  THEME.brand,
        ink:    THEME.ink,
        accent: THEME.accent,
      },
      fontFamily: {
        sans: THEME.fontSans,
      },
      fontWeight: {
        500: '500',
        600: '600',
        700: '700',
        800: '800',
      },
      animation: {
        'fade-in':               'fadeIn 0.4s ease-out',
        'slide-up':              'slideUp 0.4s ease-out',
        'progress-indeterminate':'progressIndeterminate 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        progressIndeterminate: {
          '0%':   { transform: 'translateX(-100%) scaleX(0.4)' },
          '50%':  { transform: 'translateX(0%) scaleX(0.6)' },
          '100%': { transform: 'translateX(200%) scaleX(0.4)' },
        },
      },
    },
  },
  plugins: [],
};
