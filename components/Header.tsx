import React from 'react';
import { AppView } from '../types';
import Clock from './Clock';
import {
  WalletIcon,
  MenuIcon,
} from './icons';

interface HeaderProps {
  setView: (view: AppView) => void;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ setView, onToggleSidebar }) => {
  
  const handleLogoClick = () => {
    setView(AppView.DASHBOARD);
  };

  return (
    <header className="bg-card shadow-sm border-b border-border h-16 flex justify-between items-center px-4 sm:px-6 sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-4">
        <button
            onClick={onToggleSidebar}
            className="lg:hidden flex items-center justify-center bg-secondary text-text-primary border border-border font-medium p-2 rounded-full hover:bg-border transition-colors h-9 w-9"
            aria-label="Abrir menu de navegação"
        >
            <MenuIcon className="h-5 w-5" />
        </button>

        <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={handleLogoClick}
            title="Voltar para o Início"
        >
            <div className="p-1.5 rounded-xl bg-secondary border border-border group-hover:bg-primary group-hover:border-primary transition-colors">
                <WalletIcon className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
            </div>
            <h1 className="text-lg font-bold text-text-primary font-heading tracking-tight hidden sm:block">
                Gerenciador Financeiro
            </h1>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="hidden md:block text-right mr-4">
          <Clock />
        </div>
      </div>
    </header>
  );
};

export default Header;