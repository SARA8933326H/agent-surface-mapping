import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#111827',
        'surface-elevated': '#1F2937',
        border: '#374151',
        primary: '#6366F1',
        'primary-hover': '#4F46E5',
        muted: '#9CA3AF',
        danger: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
      },
    },
  },
  plugins: [],
};

export default config;
