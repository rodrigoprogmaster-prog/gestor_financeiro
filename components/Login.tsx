import React, { useState } from 'react';
import { WalletIcon, SpinnerIcon, CheckIcon, UserIcon } from './icons';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [profilePicture] = useState(() => localStorage.getItem('profile_picture'));


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
      return 'bg-success hover:bg-success/90 border-transparent';
    }
    if (isLoading) {
        return 'bg-primary/80 border-transparent cursor-not-allowed';
    }
    return 'bg-primary hover:bg-primary-hover border-transparent shadow-sm';
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-sm p-8 space-y-8 bg-card rounded-2xl border border-border shadow-sm animate-fade-in">
        <div className="flex flex-col items-center">
            {profilePicture ? (
                <img src={profilePicture} alt="Foto de Perfil" className="h-20 w-20 rounded-full object-cover mb-4 border border-border" />
            ) : (
                <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-4 border border-border">
                    <UserIcon className="h-10 w-10 text-text-secondary" />
                </div>
            )}
            <div className="flex items-center gap-2 mb-2">
                <WalletIcon className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                Gerenciador
                </h1>
            </div>
            <p className="text-sm text-text-secondary">Digite sua senha para continuar.</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="relative">
             <input
                id="password-input"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-full relative block w-full px-4 py-3 bg-white border placeholder-text-secondary/50 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-all ${error ? 'border-danger animate-shake' : 'border-border'}`}
                placeholder="Senha de Acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isSuccess}
                autoFocus
              />
          </div>
          
          {error && (
            <p className="text-center text-xs text-danger">
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className={`group relative w-full flex justify-center py-3 px-4 border text-sm font-medium rounded-full text-white ${getButtonClass()} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200`}
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