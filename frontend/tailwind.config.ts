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
          DEFAULT: '#087247',
          50: '#EAF5EF',
          100: '#D7EADE',
          200: '#B3D8C3',
          300: '#80C09D',
          400: '#49A477',
          500: '#087247',
          600: '#07633E',
          700: '#065236',
          800: '#063F2B',
          900: '#032A1D',
        },
        secondary: '#0B8A58',
        dark: '#17211D',
        light: '#FAFBF8',
        accent: '#D6A842',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
