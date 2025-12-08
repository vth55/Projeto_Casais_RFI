# 📋 INSTRUÇÕES PARA INTEGRAR LOGOTIPO CASAIS

> **Ficheiro:** `logotipo_2024_azul.svg`  
> **Localização:** `Frontend_App/dashboard/public/logotipo_2024_azul.svg`

---

## ✅ O QUE FOI CRIADO:

1. **Estrutura para logotipo:**
   - ✅ Ficheiro placeholder criado em `public/logotipo_2024_azul.svg`
   - ✅ Componente `CasaisLogo.jsx` criado
   - ✅ Componente integrado na Sidebar (`App.jsx`)

2. **Componente CasaisLogo:**
   - ✅ Suporta diferentes tamanhos (sm, md, lg, xl)
   - ✅ Opção de mostrar/ocultar texto
   - ✅ Fallback se SVG não existir
   - ✅ Classes CSS personalizáveis

---

## 📝 PRÓXIMOS PASSOS:

### **1. Adicionar o SVG Oficial:**

1. Copiar o ficheiro `logotipo_2024_azul.svg` oficial do Grupo Casais
2. Colocar em: `Frontend_App/dashboard/public/logotipo_2024_azul.svg`
3. Substituir o ficheiro placeholder atual

### **2. Verificar o SVG:**

Garantir que o SVG:
- ✅ Usa cores corretas (azul normal Casais + branco)
- ✅ É otimizado (sem código desnecessário)
- ✅ É responsivo (usa viewBox)
- ✅ Tem dimensões adequadas

### **3. Testar:**

- ✅ Verificar que aparece na Sidebar
- ✅ Verificar em diferentes tamanhos
- ✅ Verificar em mobile/tablet
- ✅ Verificar que cores estão corretas

---

## 🎨 ONDE O LOGOTIPO É USADO:

1. **Sidebar** (já integrado)
   - Tamanho: `md` (h-8)
   - Com texto: Sim

2. **Header** (pode ser adicionado)
   - Tamanho: `sm` (h-6)
   - Com texto: Opcional

3. **Favicon** (pode ser criado)
   - Converter SVG para PNG/ICO
   - Tamanhos: 16x16, 32x32, 192x192, 512x512

4. **PWA Icons** (pode ser criado)
   - Converter SVG para PNG
   - Tamanhos: 192x192, 512x512

---

## 🔧 COMO USAR O COMPONENTE:

```jsx
import CasaisLogo from './components/CasaisLogo';

// Tamanho pequeno, sem texto
<CasaisLogo size="sm" showText={false} />

// Tamanho médio, com texto (padrão)
<CasaisLogo size="md" showText={true} />

// Tamanho grande, com texto
<CasaisLogo size="lg" showText={true} />

// Com classes CSS personalizadas
<CasaisLogo size="md" className="mb-4" />
```

---

## ⚠️ NOTA IMPORTANTE:

**O ficheiro SVG atual é apenas um placeholder!**

**Deves substituir pelo logotipo oficial do Grupo Casais.**

---

**Última atualização:** 07 Dezembro 2025

