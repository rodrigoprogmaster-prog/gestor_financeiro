import React, { useState } from 'react';
import { WalletIcon, SpinnerIcon, CheckIcon } from './icons';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isSuccess) return;

    setError('');
    
    const savedPassword = localStorage.getItem('user_password') || '140552';

    if (password === savedPassword) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsSuccess(true);
        setTimeout(() => {
          onLoginSuccess();
        }, 1000); 
      }, 1000); 
    } else {
      setError('Senha incorreta. Por favor, tente novamente.');
      setPassword('');
    }
  };

  const buttonContent = () => {
    if (isSuccess) {
      return (
        <>
          <CheckIcon className="h-5 w-5 mr-2" />
          Login bem-sucedido!
        </>
      );
    }
    if (isLoading) {
      return (
        <>
          <SpinnerIcon className="h-5 w-5 mr-2 animate-spin" />
          Autenticando...
        </>
      );
    }
    return 'Entrar';
  }

  const getButtonClass = () => {
    if (isSuccess) {
      return 'bg-success hover:bg-success/90';
    }
    if (isLoading) {
        return 'bg-primary/80 cursor-not-allowed';
    }
    return 'bg-primary hover:bg-primary-hover';
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-2xl shadow-2xl border border-border animate-fade-in">
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 mb-4">
                <WalletIcon className="h-10 w-10 text-primary" />
                <h1 className="text-3xl font-bold text-text-primary">
                Gerenciador Financeiro
                </h1>
            </div>
            <p className="text-text-secondary">Por favor, insira sua senha para acessar.</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="relative">
             <input
                id="password-input"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-md relative block w-full px-4 py-3 border placeholder-gray-500 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:z-10 sm:text-sm transition-all duration-300 ${error ? 'border-danger animate-shake' : 'border-border'}`}
                placeholder="Senha de Acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isSuccess}
                autoFocus
              />
          </div>
          
          {error && (
            <p className="text-center text-sm text-danger">
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white ${getButtonClass()} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-300`}
            >
              {buttonContent()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
