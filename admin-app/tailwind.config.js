/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2444eb',
          container: '#ddd9ff',
          dim: '#1a32b5',
          fixed: '#8999ff',
        },
        secondary: {
          DEFAULT: '#45fec9',
          container: '#c7fbe5',
          fixed: '#2c2a51',
        },
        tertiary: {
          DEFAULT: '#8999ff',
          container: '#e0e0ff',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        surface: {
          DEFAULT: '#f9f5ff',
          container: {
            lowest: '#ffffff',
            low: '#f7f2fa',
            DEFAULT: '#f3eeff',
            high: '#ede8f4',
            highest: '#e6e1e9',
          },
        },
        outline: {
          DEFAULT: '#79747e',
          variant: '#aca8d7',
        },
        'on-surface': {
          DEFAULT: '#1c1b1f',
          variant: '#49454f',
        },
        'on-primary': '#ffffff',
        'on-secondary': '#00382d',
      },
      fontFamily: {
        headline: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

