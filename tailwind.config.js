module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background-rgb))',
        foreground: 'rgb(var(--foreground-rgb))',
        primary: {
          DEFAULT: 'var(--primary-color)',
          hover: 'var(--primary-hover)',
        },
        secondary: 'var(--secondary-color)',
        accent: 'var(--accent-color)',
      },
      // Системный стек вместо веб-шрифта: ничего не скачивается ни при сборке,
      // ни у посетителя. Кириллица есть на всех целевых платформах.
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
        ],
      },
    },
  },
  // Без плагина классы prose на юридических страницах не работают
  plugins: [require('@tailwindcss/typography')],
};
