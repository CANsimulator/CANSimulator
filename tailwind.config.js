/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        screens: {
            'xs': '375px',
            'sm': '640px',
            'md': '768px',
            'lg': '1024px',
            'xl': '1280px',
            '2xl': '1536px',
        },
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'ui-monospace', 'SFMono-Regular', 'monospace'],
            },
            colors: {
                cyber: {
                    blue: '#00f3ff',     // Electric Cyan
                    purple: '#bd00ff',   // Neon Purple
                    pink: '#ff0099',     // Cyber Pink
                    green: '#00ff9f',    // Neon Green
                    yellow: '#ffea00',   // Cyber Yellow
                    slate: '#1e293b',    // Slate for panels
                },
                dark: {
                    950: '#020617',      // Deep Void
                    900: '#0a0a0f',      // Original Dark
                    800: '#131318',      // Panel BG
                    700: '#1a1a24',
                    600: '#252530',
                    500: '#30303c',
                },
                light: {
                    50: '#F8FAFC',
                    100: '#F1F5F9',
                    150: '#E2E8F0',
                    200: '#CBD5E1',
                    250: '#94A3B8',
                    300: '#64748B',
                    350: '#475569',
                    400: '#334155',
                    500: '#1E293B',
                    600: '#0F172A',
                    700: '#020617',
                    800: '#1e293b',
                    900: '#0f172a',
                },
                status: {
                    critical: {
                        light: '#D32F2F',
                        dark: '#FF4444',
                    },
                    warning: {
                        light: '#E65100',
                        dark: '#f59e0b',
                    },
                    success: {
                        light: '#43A047',
                        dark: '#00ff9f',
                    },
                    info: {
                        light: '#1976D2',
                        dark: '#00f3ff',
                    }
                },
            },
            animation: {
                'glow': 'glow 2s ease-in-out infinite alternate',
                'pulse-slow': 'pulseSlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
                'fade-in': 'fadeIn 0.5s ease-out',
                'shimmer': 'shimmer 2s linear infinite',
                'gradient-shift': 'gradientShift 3s ease-in-out infinite',
                'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
                'meteor': "meteor 5s linear infinite",
                'shine': "shine var(--duration) infinite linear",
                'grid': "grid 15s linear infinite",
                'float': 'float 3s ease-in-out infinite',
                'float-slow': 'float-slow 4s ease-in-out infinite',
                'marquee': 'marquee 30s linear infinite',
                'marquee-vertical': 'marquee-vertical 30s linear infinite',
                'slide-in-down': 'slide-in-down 0.2s ease-out',
            },
            keyframes: {
                shine: {
                    "0%": { "background-position": "0% 0%" },
                    "50%": { "background-position": "100% 100%" },
                    "100%": { "background-position": "0% 0%" },
                },
                grid: {
                    "0%": { "transform": "translateY(-50%)" },
                    "100%": { "transform": "translateY(0)" },
                },
                meteor: {
                    "0%": { transform: "rotate(215deg) translateX(0)", opacity: "1" },
                    "70%": { opacity: "1" },
                    "100%": { transform: "rotate(215deg) translateX(-500px)", opacity: "0" },
                },
                "border-beam": {
                    "100%": {
                        "offset-distance": "100%",
                    },
                },
                glow: {
                    'from': { textShadow: '0 0 5px #00f3ff, 0 0 10px #00f3ff, 0 0 15px #00f3ff' },
                    'to': { textShadow: '0 0 10px #00f3ff, 0 0 20px #00f3ff, 0 0 30px #00f3ff' }
                },
                pulseSlow: {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%': { opacity: '0.8', transform: 'scale(1.05)' }
                },
                slideUp: {
                    'from': { transform: 'translateY(10px)', opacity: '0' },
                    'to': { transform: 'translateY(0)', opacity: '1' }
                },
                slideDown: {
                    'from': { transform: 'translateY(-10px)', opacity: '0' },
                    'to': { transform: 'translateY(0)', opacity: '1' }
                },
                slideInRight: {
                    'from': { transform: 'translateX(100%)', opacity: '0' },
                    'to': { transform: 'translateX(0)', opacity: '1' }
                },
                fadeIn: {
                    'from': { opacity: '0' },
                    'to': { opacity: '1' }
                },
                shimmer: {
                    'from': { backgroundPosition: '0 0' },
                    'to': { backgroundPosition: '-200% 0' }
                },
                gradientShift: {
                    '0%, 100%': { backgroundSize: '200% 200%', backgroundPosition: 'left center' },
                    '50%': { backgroundSize: '200% 200%', backgroundPosition: 'right center' }
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-12px)' },
                },
                'float-slow': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-8px)' },
                },
                marquee: {
                    '0%': { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                'marquee-vertical': {
                    '0%': { transform: 'translateY(0%)' },
                    '100%': { transform: 'translateY(-50%)' },
                },
                'slide-in-down': {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            boxShadow: {
                'neon': '0 0 5px theme("colors.cyber.blue"), 0 0 20px theme("colors.cyber.blue")',
                'neon-pink': '0 0 5px theme("colors.cyber.pink"), 0 0 20px theme("colors.cyber.pink")',
                'neon-purple': '0 0 5px theme("colors.cyber.purple"), 0 0 20px theme("colors.cyber.purple")',
                'neon-green': '0 0 5px theme("colors.cyber.green"), 0 0 20px theme("colors.cyber.green")',
                'neon-cyan': '0 0 5px #00f3ff, 0 0 20px #00f3ff40',
                '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.5)',
            }
        },
    },
    plugins: [],
}
