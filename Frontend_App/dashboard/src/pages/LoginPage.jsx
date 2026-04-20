/**
 * Página de Login
 * CASAIS Fleet Intelligence
 *
 * Autenticação via Firebase Auth (email + password).
 * Só é exibida quando o utilizador não está autenticado.
 */

import React, { useState } from 'react';
import useAuthStore from '../store/useAuthStore';

const LoginPage = () => {
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Mapeia códigos de erro do Firebase Auth para mensagens em português.
   * @param {string} code - Código de erro Firebase
   * @returns {string}
   */
  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Email ou palavra-passe incorretos.';
      case 'auth/invalid-email':
        return 'Endereço de email inválido.';
      case 'auth/user-disabled':
        return 'Esta conta foi desativada. Contacte o administrador.';
      case 'auth/too-many-requests':
        return 'Demasiadas tentativas falhadas. Aguarde alguns minutos e tente novamente.';
      case 'auth/network-request-failed':
        return 'Erro de ligação. Verifique a sua ligação à internet.';
      default:
        return 'Erro ao iniciar sessão. Tente novamente.';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha o email e a palavra-passe.');
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Card de login */}
      <div className="w-full max-w-sm">
        {/* Logotipo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo_casais.png"
            alt="Casais"
            className="h-12 w-auto object-contain mb-4"
            onError={(e) => {
              // Fallback se o logo não carregar
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              CASAIS
            </h1>
            <p className="text-primary-400 text-sm font-medium mt-0.5">
              Fleet Intelligence
            </p>
          </div>
        </div>

        {/* Formulário */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-black/40 p-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Iniciar Sessão
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Introduza as suas credenciais para aceder ao sistema.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Campo email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="utilizador@casais.pt"
                disabled={loading}
                className="
                  w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600
                  bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white
                  placeholder:text-slate-400 dark:placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors text-sm
                "
              />
            </div>

            {/* Campo password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Palavra-passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="
                  w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600
                  bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white
                  placeholder:text-slate-400 dark:placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors text-sm
                "
              />
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <svg
                  className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Botão de submissão */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white
                bg-primary-500 hover:bg-primary-600 active:bg-primary-700
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-all duration-150 shadow-lg shadow-primary-500/30
                flex items-center justify-center gap-2
              "
            >
              {loading ? (
                <>
                  <span
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  A verificar...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs text-slate-500 mt-6">
          CASAIS Fleet Intelligence &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
