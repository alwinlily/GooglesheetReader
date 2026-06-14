/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: "#F7F2F4",
                    100: "#E9D8E1",
                    200: "#D3AFC0",
                    300: "#BC859E",
                    400: "#A65D7C",
                    500: "#8E3C62",
                    600: "#74304F",
                    700: "#5B243E",
                    800: "#42182C",
                    900: "#2A0D1C"
                },
                secondary: {
                    50: "#F1FAF8",
                    100: "#D7F1EB",
                    200: "#AEE3D7",
                    300: "#7FD2C0",
                    400: "#4DBCA6",
                    500: "#2AA089",
                    600: "#1F7F6D",
                    700: "#186255",
                    800: "#12463E",
                    900: "#0B2D28"
                },
                neutral: {
                    bgCanvasDark: "#0f172a",
                    bgCanvasLight: "#0f172a",
                    surfaceDark: "#1e293b",
                    surfaceDarkStrong: "#2d3f55",
                    surfaceLight: "#1e293b",
                    surfaceLightStrong: "#2d3f55",
                    borderDark: "#334155",
                    borderLight: "#334155",
                    textPrimaryDark: "#f1f5f9",
                    textSecondaryDark: "#94a3b8",
                    textTertiaryDark: "#64748b",
                    textPrimaryLight: "#f1f5f9",
                    textSecondaryLight: "#94a3b8",
                    textTertiaryLight: "#64748b"
                },
                surface: {
                    dark: "#1e293b",
                    darkStrong: "#2d3f55",
                    light: "#1e293b",
                    lightStrong: "#2d3f55",
                },
                accent: {
                    pink: "#ef4444",
                    pinkDeep: "#ef4444",
                    green: "#10b981",
                    blue: "#3b82f6",
                    amber: "#f59e0b",
                    purple: "#8b5cf6",
                }
            },
            fontFamily: {
                display: ["SerifDisplay", "ui-serif", "Georgia", "serif"],
                ui: ["SansUI", "ui-sans-serif", "system-ui", "sans-serif"],
                numeric: ["NumericSans", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
            },
            borderRadius: {
                '3xl': '28px',
                '2xl': '18px',
            },
            backdropBlur: {
                'glass': '18px',
            },
            boxShadow: {
                'soft': '0 14px 40px rgba(0,0,0,0.35)',
                'card': '0 10px 30px rgba(0,0,0,0.30)',
                'pill': '0 8px 20px rgba(0,0,0,0.25)',
            }
        },
    },
    plugins: [],
}
