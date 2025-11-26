
import React, { useState } from 'react';
import { SpinnerIcon, CheckIcon, UserIcon, KeyIcon, CheckCircleIcon } from './icons';

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
    return 'Acessar Sistema';
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
      <div className="flex w-full max-w-6xl overflow-hidden rounded-3xl shadow-2xl animate-fade-in bg-card">
        {/* Left Column - Branding */}
        <div className="hidden md:flex flex-col justify-center items-center p-12 bg-gradient-to-br from-blue-600 to-blue-800 text-white w-1/2">
            <div className="p-4 rounded-full bg-white/20 mb-8">
                <CheckCircleIcon className="h-16 w-16 text-white" />
            </div>
            <h2 className="text-5xl font-extrabold text-center mb-4 tracking-tight font-heading">
                Gerenciador Financeiro
            </h2>
            <p className="text-lg text-center opacity-80 max-w-sm">
                Gestão integrada, processos seguros e relatórios inteligentes. O cuidado que seus negócios merecem começa aqui.
            </p>
        </div>

        {/* Right Column - Login Form */}
        <div className="flex-1 p-12 w-full md:w-1/2 flex flex-col justify-center">
            <div className="flex flex-col items-center mb-10">
                {profilePicture ? (
                    <div className="relative group mb-6">
                        <img src={profilePicture} alt="Foto de Perfil" className="h-28 w-28 rounded-full object-cover border-3 border-border transition-all duration-300 group-hover:border-primary group-hover:ring-2 ring-primary/20" />
                    </div>
                ) : (
                    <div className="h-28 w-28 rounded-full bg-secondary flex items-center justify-center mb-6 border-3 border-border">
                        <UserIcon className="h-14 w-14 text-text-secondary" />
                    </div>
                )}
                <h1 className="text-3xl font-bold text-text-primary mb-2">Bem-vindo de volta</h1>
                <p className="text-base text-text-secondary font-medium">Faça login para acessar o sistema.</p>
            </div>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="relative">
                 <label htmlFor="password-input" className="block text-sm font-medium text-text-secondary mb-1 ml-1">Senha de Acesso</label>
                 <KeyIcon className="absolute left-4 top-[calc(50%+0.5rem)] -translate-y-1/2 h-5 w-5 text-text-secondary pointer-events-none" />
                 <input
                    id="password-input"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className={`appearance-none relative block w-full pl-12 pr-4 py-3 bg-background border placeholder-text-secondary/50 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all rounded-xl h-12 ${error ? 'border-danger animate-shake' : 'border-border'}`}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || isSuccess}
                    autoFocus
                  />
              </div>
              
              {error && (
                <p className="text-center text-sm text-danger mt-3" role="alert">
                  {error}
                </p>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading || isSuccess}
                  className={`group relative w-full flex justify-center py-3 px-6 h-12 text-base font-bold rounded-xl text-white ${getButtonClass()} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg`}
                >
                  {buttonContent()}
                </button>
              </div>
            </form>
            <p className="text-xs text-center text-text-secondary mt-10">Sistema Protegido • Versão 1.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;