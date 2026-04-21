export default {
  content: ['./index.html', './src/**/*.{js,scss}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: { 900: '#0f172a', 800: '#1e293b', 700: '#334155' },
        accent: { 500: '#06b6d4' }
      }
    }
  },
  plugins: []
}