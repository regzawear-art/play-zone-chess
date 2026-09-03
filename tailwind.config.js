/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Chess.com "navy" ramp → Charcoal/Dark Grey family
        navy: {
          50: '#f5f5f4',
          100: '#e7e5e4',
          200: '#d6d3d1',
          300: '#a8a29e',
          400: '#78716c',
          500: '#57534e',
          600: '#44403c',
          700: '#312E2B',
          800: '#262522',
          900: '#1c1b18',
          950: '#0c0a09',
        },
        // Chess.com "royal" ramp → Bright Green (#81B64C family)
        royal: {
          50: '#f3f8ec',
          100: '#e3f0d2',
          200: '#c8e1a5',
          300: '#a7cd6f',
          400: '#81B64C',
          500: '#6ba238',
          600: '#58862e',
          700: '#466a26',
          800: '#3a5523',
          900: '#314a22',
        },
        sky: {
          tint: '#312E2B',
          mist: '#3d3a37',
        },
        board: {
          light: '#EEEED2',
          dark: '#769656',
          highlight: '#BBCA2B',
          darkhi: '#1c1b18',
        },
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(129,182,76,0.35), 0 8px 30px rgba(129,182,76,0.30)',
        'glow-sm': '0 0 0 1px rgba(129,182,76,0.25), 0 4px 16px rgba(129,182,76,0.22)',
        'glow-lg': '0 0 40px rgba(129,182,76,0.40)',
        card: '0 10px 40px rgba(0,0,0,0.30)',
        'card-lg': '0 24px 70px rgba(0,0,0,0.40)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'hero-radial':
          'radial-gradient(1200px 600px at 70% -10%, rgba(129,182,76,0.15), transparent 60%), radial-gradient(900px 500px at 0% 20%, rgba(38,37,34,0.40), transparent 55%)',
        'glass-grad':
          'linear-gradient(135deg, rgba(49,46,43,0.92) 0%, rgba(38,37,34,0.85) 100%)',
        'blue-grad': 'linear-gradient(135deg, #81B64C 0%, #6ba238 100%)',
        'amber-grad': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'navy-grad': 'linear-gradient(160deg, #312E2B 0%, #1c1b18 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(8px)' },
          '60%': { opacity: '1', transform: 'scale(1.02) translateY(0)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'glow-pulse': {
          '0%,100%': { boxShadow: '0 0 0 1px rgba(129,182,76,0.25), 0 6px 22px rgba(129,182,76,0.22)' },
          '50%': { boxShadow: '0 0 0 1px rgba(129,182,76,0.45), 0 10px 36px rgba(129,182,76,0.38)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-x': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.5s ease both',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'spin-slow': 'spin-slow 24s linear infinite',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
