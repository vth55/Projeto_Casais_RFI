# Frontend_App - PWA Dashboard

Interface principal do Casais Fleet Intelligence.
Desde 2026-05-25 o frontend ativo deixou de ser sobre frota pesada e passou a focar ferramentas pequenas com NFC.

## Tecnologias

- React 19 + Vite
- Tailwind CSS
- Zustand
- Firebase SDK
- Capacitor Android

## Superficies principais

- Dashboard e navegacao operacional
- `FerramentasView.jsx` para CRUD de ferramentas pequenas
- `ToolTagPage.jsx` para deep link `/t/:tagId`
- shell legado de obras, sessoes, manutencao e analytics

## Estrutura relevante

- `src/views/FerramentasView.jsx` - gestao de ferramentas pequenas
- `src/pages/ToolTagPage.jsx` - leitura operacional via NFC URL
- `src/views/MaquinasView.jsx` - referencia legada, nao e a vista ativa principal
- `src/store/` - stores Zustand
- `android/` - projeto nativo Capacitor

## Android

- `npm run build:android` gera `dist/` para o Capacitor
- deep links `https://casais-rfid.web.app/t/*` sao tratados no APK
- NFC e intent filters estao no AndroidManifest

## Como correr

```bash
npm install
npm run dev
```

## Nota

Se encontrares docs ou componentes a falar de maquinas como produto principal, trata isso como legado pre-pivoto a menos que o codigo atual ainda dependa explicitamente deles.
