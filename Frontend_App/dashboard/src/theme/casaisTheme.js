/**
 * DESIGN SYSTEM - CASAIS FLEET INTELLIGENCE
 *
 * Baseado em análise do site oficial: https://casais.pt/
 *
 * CORES REAIS CASAIS:
 * - Azul Oficial: #005EB8 (principal - do logo)
 * - Branco (fundo)
 * - Azul Claro (acentos - derivado do azul oficial)
 * - Cinza (textos secundários)
 *
 * ❌ NÃO usar verde! (correção importante)
 */

export const casaisTheme = {
  // Cores Principais (Azul Oficial Casais + Branco)
  colors: {
    // Azul Oficial Casais: #005EB8
    primary: {
      50: '#e6f2ff',
      100: '#b3d9ff',
      200: '#80bfff',
      300: '#4da6ff',
      400: '#1a8cff',
      500: '#005EB8', // Azul oficial Casais (principal)
      600: '#004b94',
      700: '#003870',
      800: '#00254c',
      900: '#001228',
    },

    // Azul Claro (Acentos e highlights)
    accent: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9', // Azul claro Casais
      600: '#0284c7',
    },

    // Neutros (Cinzas)
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },

    // Semânticas
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#16a34a',
    },

    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706',
    },

    error: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626',
    },

    info: {
      50: '#e6f2ff',
      500: '#005EB8', // Azul oficial Casais
      600: '#004b94',
    },
  },

  // Tipografia
  typography: {
    fontFamily: {
      sans: [
        'Inter',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'sans-serif',
      ],
      mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
    },

    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem', // 48px
    },

    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },

    lineHeight: {
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },

  // Espaçamentos (Sistema 8px)
  spacing: {
    0: '0',
    1: '0.25rem', // 4px
    2: '0.5rem', // 8px
    3: '0.75rem', // 12px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    8: '2rem', // 32px
    10: '2.5rem', // 40px
    12: '3rem', // 48px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
    32: '8rem', // 128px
  },

  // Sombras
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },

  // Bordas e Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem', // 2px
    base: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Animações
  animations: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms',
    },

    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // Breakpoints
  breakpoints: {
    sm: '640px', // Mobile
    md: '768px', // Tablet
    lg: '1024px', // Desktop
    xl: '1280px', // Large Desktop
    '2xl': '1536px', // Extra Large
  },
};

export default casaisTheme;
