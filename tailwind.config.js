// Этот файл определяет:
// - Пути к файлам, где используются классы Tailwind (content)
// - Настройки темы (цвета, шрифты, отступы и т.д.)
// - Плагины Tailwind CSS
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
    },
  },
  plugins: [],
} 