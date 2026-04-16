# 💻 Padrões de Código - Casais Fleet Intelligence

Este documento define como escrevemos código e desenhamos interfaces. Essencial para consistência visual e lógica.

---

## 🎨 1. Design System (Tailwind)
**Regra de Ouro**: Usar a paleta oficial da Casais. **PROIBIDO** o uso de tons de roxo/violeta.

- **Cor Primária**: `text-[#005EB8]` ou `bg-[#005EB8]`.
- **Ações Críticas**: Vermelho (`text-red-600`).
- **Estados de Sucesso**: Verde (`text-green-600`).
- **Typography**: Usar fontes limpas (Inter/Roboto). Headers sempre Bold.

---

## ⚛️ 2. React / Frontend
- **Estado Global**: Usar o `useStore` (Zustand). Evitar prop drilling.
- **Componentes**: Focados e atómicos. Se um componente cresce > 200 linhas, deve ser refatorado.
- **Icons**: Usar exclusivamente a biblioteca `lucide-react`.
- **Feedback**: Sempre mostrar estados de `Loading` e utilizar `Toasts` para confirmações de escrita no DB.

---

## ⚡ 3. Backend (Cloud Functions)
- **Functions v2**: Usar exclusivamente a sintaxe da v2 (`onRequest`, `onDocumentCreated`).
- **Async/Await**: Sempre usar blocos `try/catch` para capturar erros de rede.
- **Logs**: Usar `console.log` para fluxos normais e `console.error` para falhas críticas.
- **Idempotência**: Garantir que se uma função correr duas vezes com o mesmo ID de sessão, o resultado no Procore é apenas um registo.

---

## ⚙️ 4. Resolução de Parâmetros (Hierarquia)
Sempre que o sistema necessitar de um parâmetro operacional (CO₂, Manutenção, Custos), deve seguir esta ordem de precedência:
1. **Machine Override**: Valor definido na ficha da máquina no Firestore.
2. **System Setting**: Valor global definido em `settings/system`.
3. **Internal Default**: Valor hardcoded no código como salvaguarda (ex: 2.68 para CO₂).

---

## 🧹 5. Clean Code
- **Nomes**: Variáveis em inglês, descritivas (`machines`, não `macs`).
- **Comentários**: Explicar o **PORQUÊ**, e não o "quê".
- **Imports**: Agrupar imports de bibliotecas externas vs. componentes internos.

---
