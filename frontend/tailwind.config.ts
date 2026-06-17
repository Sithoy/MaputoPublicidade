import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#009639',
          50: '#E6F7EC',
          100: '#C2EBD2',
          200: '#8FDBAE',
          300: '#5BCB8A',
          400: '#31BF70',
          500: '#009639',
          600: '#007A2E',
          700: '#005E24',
          800: '#004219',
          900: '#00260F',
        },
        secondary: '#00B050',
        dark: '#1F2937',
        light: '#F9FAFB',
        accent: '#F59E0B',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
