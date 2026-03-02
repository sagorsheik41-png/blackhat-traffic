/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './views/**/*.ejs',
        './public/js/**/*.js'
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                inter: ['Inter', 'sans-serif'],
            },
            colors: {
                brand: {
                    50: '#f0f1ff',
                    100: '#e0e3ff',
                    200: '#c7cbff',
                    300: '#a4a8ff',
                    400: '#8183ff',
                    500: '#667eea',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                },
                accent: {
                    purple: '#764ba2',
                    pink: '#f093fb',
                    coral: '#f5576c',
                    sky: '#4facfe',
                }
            },
            backgroundImage: {
                'gradient-brand': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'gradient-dark': 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 25%, #2d1b4e 50%, #1e293b 75%, #0f172a 100%)',
                'gradient-hero': 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            },
            animation: {
                'shimmer': 'shimmer 3s infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                shimmer: {
                    '0%, 100%': { transform: 'translateX(-100%)' },
                    '50%': { transform: 'translateX(100%)' },
                }
            }
        },
    },
    plugins: [],
};
