/** @type {import('tailwindcss').Config} */

// ─────────────────────────────────────────────────────────────────────────────
// THEME CONFIG — change these values to restyle the entire site
// ─────────────────────────────────────────────────────────────────────────────
const THEME = {
  // Fonts — body sans + serif display face (update index.html too)
  fontSans:    ['Inter', 'system-ui', 'sans-serif'],
  fontDisplay: ['Fraunces', 'Georgia', 'serif'],

  // Primary brand colour (buttons, active states, highlights) — coral red
  brand: {
    50:  '#FEF1EE',
    100: '#FDDFD9',
    200: '#FAC0B4',
    400: '#F58269',
    500: '#F2654E',  // Coral
    600: '#DC4A33',
    700: '#B83A27',
    900: '#7A2418',
  },

  // Neutral / text colours — warm black on cream, ink-900 is the dark button colour
  ink: {
    50:  '#F2EFE9',  // Cream page background
    100: '#EAE6DD',
    200: '#DCD7CB',
    300: '#C2BCAD',
    400: '#8F8A7E',
    500: '#6E6A60',
    600: '#4D4A43',
    700: '#33312C',
    800: '#222019',
    900: '#141310',  // Near black
  },

  // Accent colours — playful tile palette (bg-accent-yellow etc.)
  accent: {
    yellow:      '#FFD43B',
    navy:        '#141310',
    teal:        '#2E90FA',
    green:       '#1DB870',
    lightGreen:  '#9B6DFF', // purple (key kept for backwards compat)
    pink:        '#F2654E',
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
        display: THEME.fontDisplay,
      },
      boxShadow: {
        'hard':    '4px 4px 0 0 #141310',
        'hard-sm': '3px 3px 0 0 #141310',
        'hard-lg': '6px 6px 0 0 #141310',
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
