import React, { useState } from 'react';
import { WalletIcon, SpinnerIcon, CheckIcon, UserIcon, KeyIcon } from './icons';

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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4 font-sans antialiased">
      <div className="w-full max-w-sm p-8 space-y-8 bg-card rounded-3xl border-2 border-border shadow-2xl animate-fade-in">
        <div className="flex flex-col items-center">
            {profilePicture ? (
                <div className="relative group mb-4">
                    <img src={profilePicture} alt="Foto de Perfil" className="h-28 w-28 rounded-full object-cover border-3 border-border transition-all duration-300 group-hover:border-primary group-hover:ring-2 ring-primary/20" />
                </div>
            ) : (
                <div className="h-28 w-28 rounded-full bg-secondary flex items-center justify-center mb-4 border-3 border-border">
                    <UserIcon className="h-14 w-14 text-text-secondary" />
                </div>
            )}
            <div className="flex items-center gap-3 mb-2">
                <WalletIcon className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-extrabold text-text-primary tracking-tight font-heading">
                Gerenciador
                </h1>
            </div>
            <p className="text-base text-text-secondary font-medium">Digite sua senha para continuar.</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="relative">
             <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary pointer-events-none" />
             <input
                id="password-input"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-full relative block w-full pl-12 pr-4 py-3 bg-white border placeholder-text-secondary/50 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all ${error ? 'border-danger animate-shake' : 'border-border'}`}
                placeholder="Senha de Acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isSuccess}
                autoFocus
              />
          </div>
          
          {error && (
            <p className="text-center text-sm text-danger mt-3">
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className={`group relative w-full flex justify-center py-3 px-6 h-12 text-sm font-bold rounded-3xl text-white ${getButtonClass()} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg`}
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