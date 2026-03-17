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
                    bgCanvasDark: "#15141A",
                    bgCanvasLight: "#F6F7F9",
                    surfaceDark: "rgba(26, 26, 33, 0.62)",
                    surfaceDarkStrong: "rgba(26, 26, 33, 0.78)",
                    surfaceLight: "rgba(255, 255, 255, 0.62)",
                    surfaceLightStrong: "rgba(255, 255, 255, 0.78)",
                    borderDark: "rgba(255, 255, 255, 0.10)",
                    borderLight: "rgba(15, 23, 42, 0.10)",
                    textPrimaryDark: "rgba(255, 255, 255, 0.92)",
                    textSecondaryDark: "rgba(255, 255, 255, 0.62)",
                    textTertiaryDark: "rgba(255, 255, 255, 0.40)",
                    textPrimaryLight: "rgba(15, 23, 42, 0.92)",
                    textSecondaryLight: "rgba(15, 23, 42, 0.60)",
                    textTertiaryLight: "rgba(15, 23, 42, 0.40)"
                },
                surface: {
                    dark: "rgba(26, 26, 33, 0.62)",
                    darkStrong: "rgba(26, 26, 33, 0.78)",
                    light: "rgba(255, 255, 255, 0.62)",
                    lightStrong: "rgba(255, 255, 255, 0.78)",
                },
                accent: {
                    pink: "#D11E58",
                    pinkDeep: "#8E254C",
                    green: "#7AB851",
                    blue: "#2E93C2",
                    amber: "#F5B23C",
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
