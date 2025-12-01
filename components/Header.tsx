
import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import Clock from './Clock';
import {
  MenuIcon,
  UserIcon
} from './icons';

interface HeaderProps {
  setView: (view: AppView) => void;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ setView, onToggleSidebar }) => {
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    // Carregar imagem inicial
    const savedPicture = localStorage.getItem('profile_picture');
    setProfilePicture(savedPicture);

    // Escutar evento de atualização de perfil (disparado em ConfiguracaoSeguranca)
    const handleProfileUpdate = () => {
      const updatedPicture = localStorage.getItem('profile_picture');
      setProfilePicture(updatedPicture);
    };

    window.addEventListener('profilePictureUpdated', handleProfileUpdate);
    // Também escutar evento de storage para sincronia entre abas (opcional)
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);
  
  const handleLogoClick = () => {
    setView(AppView.DASHBOARD);
  };

  const handleProfileClick = () => {
    setView(AppView.CONFIGURACAO_SEGURANCA);
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex justify-between items-center px-4 sm:px-8 sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-4">
        <button
            onClick={onToggleSidebar}
            className="flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-xl transition-colors"
            aria-label="Abrir menu de navegação"
        >
            <MenuIcon className="h-6 w-6" />
        </button>

        {/* Logo Title - Click to go Dashboard (and open sidebar) */}
        <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={handleLogoClick}
            title="Ir para o Dashboard"
        >
            <div className="h-8 w-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center text-white shadow-md shadow-orange-200 lg:hidden">
                <span className="font-bold font-heading text-lg">G</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 font-heading tracking-tight lg:hidden">
                Financeiro
            </h1>
            {/* Desktop breadcrumb style text */}
            <h1 className="hidden lg:block text-lg font-bold text-gray-900 font-heading tracking-tight hover:text-orange-700 transition-colors">
                Financeiro
            </h1>
        </div>
        
        <div className="hidden md:flex items-center text-sm text-gray-500 border-l border-gray-200 pl-4 ml-2">
            <span className="font-medium text-orange-600">Bem-vindo</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:block text-right">
          <Clock />
        </div>
        
        <button 
          onClick={handleProfileClick}
          className="relative h-10 w-10 rounded-full bg-secondary border border-gray-200 shadow-sm overflow-hidden hover:ring-2 hover:ring-orange-200 transition-all cursor-pointer group"
          title="Ir para Configurações"
        >
          {profilePicture ? (
            <img 
              src={profilePicture} 
              alt="Perfil" 
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-tr from-gray-100 to-gray-200 text-gray-400 group-hover:text-orange-600 transition-colors">
               <UserIcon className="h-5 w-5" />
            </div>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
