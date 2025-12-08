# 🎨 DESIGN SYSTEM - CASAIS FLEET INTELLIGENCE

> **Baseado em:** Análise do site oficial [casais.pt](https://casais.pt/)  
> **Data:** 07 Dezembro 2025  
> **Status:** ✅ Cores Reais Identificadas

---

## 🎨 CORES DA MARCA CASAIS

### **Análise do Site Oficial:**
Após análise do site [casais.pt](https://casais.pt/), identifiquei:

**❌ NÃO usam verde!** (correção importante)

**✅ Cores Reais:**
- **Azul Normal:** Cor principal (logo, não muito escuro, azul corporativo normal)
- **Branco:** Fundo e espaços negativos
- **Azul Claro:** Acentos e links (quando necessário)
- **Cinza:** Textos secundários e bordas

### **Paleta de Cores Proposta:**

```javascript
// Cores Principais (Baseadas no Site Casais)
const casaisColors = {
  // Azul Escuro (Principal - do logo)
  primary: {
    50: '#f0f4f8',
    100: '#d9e2ec',
    200: '#bcccdc',
    300: '#9fb3c8',
    400: '#829ab1',
    500: '#627d98',  // Azul médio
    600: '#486581',  // Azul escuro (principal)
    700: '#334e68',  // Azul muito escuro
    800: '#243b53',  // Quase preto azulado
    900: '#102a43',  // Preto azulado
  },

  // Azul Claro (Acentos)
  accent: {
    50: '#e0f2fe',
    100: '#bae6fd',
    200: '#7dd3fc',
    300: '#38bdf8',
    400: '#0ea5e9',  // Azul claro Casais
    500: '#0284c7',
    600: '#0369a1',
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
    50: '#eff6ff',
    500: '#3b82f6',
    600: '#2563eb',
  },
}
```

---

## 📐 TIPOGRAFIA

### **Fonte Principal:**
- **Sistema:** Inter ou System UI (profissional, legível)
- **Fallback:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### **Escala de Tamanhos:**
```javascript
const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
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
}
```

---

## 📏 ESPAÇAMENTOS

### **Sistema 8px:**
```javascript
const spacing = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
  32: '8rem',    // 128px
}
```

---

## 🎭 SOMBRAS

```javascript
const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
}
```

---

## 🔲 BORDAS E RADIUS

```javascript
const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
}
```

---

## ⚡ ANIMAÇÕES

```javascript
const animations = {
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
}
```

---

## 🎯 COMPONENTES BASE

### **Button:**
- Primary (azul escuro)
- Secondary (azul claro)
- Outline (borda)
- Ghost (transparente)
- Danger (vermelho)
- Sizes: sm, md, lg
- States: default, hover, active, disabled, loading

### **Input:**
- States: default, focus, error, disabled
- Sizes: sm, md, lg
- Variants: text, number, email, password, search

### **Card:**
- Default (borda)
- Elevated (sombra)
- Outlined (borda destacada)
- Interactive (hover effect)

---

## 📱 BREAKPOINTS

```javascript
const breakpoints = {
  sm: '640px',   // Mobile
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large Desktop
  '2xl': '1536px', // Extra Large
}
```

---

## ✅ PRINCÍPIOS DE DESIGN

1. **Profissionalismo:** Visual limpo e corporativo
2. **Consistência:** Mesmas cores, espaçamentos e estilos em todo o lado
3. **Hierarquia:** Tamanhos e pesos de fonte claros
4. **Acessibilidade:** Contraste suficiente (WCAG AA)
5. **Performance:** Animações suaves mas não pesadas

---

**Última atualização:** 07 Dezembro 2025

