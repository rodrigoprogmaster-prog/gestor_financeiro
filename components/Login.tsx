
import React, { useState } from 'react';
import { SpinnerIcon, CheckIcon, UserIcon, KeyIcon, BuildingIcon } from './icons';

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
        }, 800); 
      }, 800); 
    } else {
      setError('Senha incorreta. Por favor, tente novamente.');
      setPassword('');
    }
  };

  return (
    <div className="flex h-full w-full bg-gray-50 font-sans overflow-hidden">
      {/* Left Column - Branding (Desktop only) */}
      <div className="hidden lg:flex w-1/2 bg-gray-900 text-white flex-col justify-between p-16 relative overflow-hidden h-full">
        {/* Abstract shapes for visual interest */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-orange-500 blur-3xl"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
        </div>

        <div className="relative z-10">
            <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-orange-900/40 border border-white/10">
                <BuildingIcon className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-6 text-white leading-tight">
                Gerenciador<br/>
                <span className="text-orange-500">Financeiro</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                Controle total sobre suas finanças empresariais. Gestão de boletos, cheques e previsões em um único lugar.
            </p>
        </div>

        <div className="relative z-10 text-sm text-gray-600 font-medium">
            &copy; {new Date().getFullYear()} Todos os direitos reservados.
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 bg-white relative h-full overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center items-center p-8 lg:p-16">
            {/* Mobile Header (Only visible on small screens) */}
            <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">G</span>
                </div>
                <span className="text-lg font-bold text-gray-900">Financeiro</span>
            </div>

            <div className="w-full max-w-sm space-y-8 animate-fade-in">
                <div className="text-center">
                    {profilePicture ? (
                        <img 
                            src={profilePicture} 
                            alt="Perfil" 
                            className="h-28 w-28 rounded-full mx-auto mb-6 object-cover border-[4px] border-gray-100 shadow-sm"
                        />
                    ) : (
                        <div className="h-24 w-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-100">
                            <UserIcon className="h-10 w-10 text-orange-600" />
                        </div>
                    )}
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Bem-vindo</h2>
                    <p className="text-gray-500 text-sm mt-2">Insira sua senha de acesso para continuar.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-semibold text-gray-700 block ml-1">Senha de Acesso</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <KeyIcon className="h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                            </div>
                            <input
                                id="password"
                                type="password"
                                required
                                className={`block w-full pl-11 pr-4 h-12 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 hover:border-gray-300'}`}
                                placeholder="••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading || isSuccess}
                                autoFocus
                            />
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg mt-2 animate-shake">
                                <div className="w-1 h-1 bg-red-600 rounded-full ml-1"></div>
                                {error}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || isSuccess}
                        className={`w-full flex justify-center items-center h-12 px-4 border rounded-xl text-base font-bold transition-all duration-300
                            ${isSuccess 
                                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                                : 'bg-white border-gray-200 text-primary hover:bg-orange-50 hover:border-orange-200 shadow-sm'}
                            ${isLoading ? 'opacity-90 cursor-not-allowed' : ''}
                        `}
                    >
                        {isLoading ? (
                            <>
                                <SpinnerIcon className="h-5 w-5 animate-spin mr-2" />
                                <span>Verificando...</span>
                            </>
                        ) : isSuccess ? (
                            <>
                                <CheckIcon className="h-5 w-5 mr-2" />
                                <span>Acesso Permitido</span>
                            </>
                        ) : (
                            'Entrar no Sistema'
                        )}
                    </button>
                </form>
                
                <div className="pt-8 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Sistema Seguro v2.2</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
