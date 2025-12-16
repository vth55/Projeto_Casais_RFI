import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set, get) => ({
      // Estado
      theme: 'light', // 'light' | 'dark'

      // Actions
      setTheme: (theme) => {
        set({ theme });
        // Aplicar classe ao document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      // Inicializar tema (chamar no App.jsx)
      initTheme: () => {
        const theme = get().theme;
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      // Getters
      isDark: () => get().theme === 'dark',
    }),
    {
      name: 'casais-theme',
    }
  )
);

export default useThemeStore;
