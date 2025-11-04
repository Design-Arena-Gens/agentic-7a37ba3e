import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f4f5f7',
          100: '#e4e6eb',
          200: '#c6cad4',
          300: '#a7aebc',
          400: '#898fa3',
          500: '#6d7287',
          600: '#55596d',
          700: '#414554',
          800: '#2b2e38',
          900: '#13141a'
        }
      }
    }
  },
  plugins: [],
};

export default config;
