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
    <header className="bg-white border-b border-gray-200 h-16 flex justify-between items-center px-4 sm:px-8 sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-4">
        <button
            onClick={onToggleSidebar}
            className="lg:hidden flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-colors"
            aria-label="Abrir menu de navegação"
        >
            <MenuIcon className="h-6 w-6" />
        </button>

        {/* Mobile Logo Title */}
        <div
            className="flex items-center gap-3 cursor-pointer lg:hidden"
            onClick={handleLogoClick}
        >
            <h1 className="text-lg font-bold text-gray-900 font-heading tracking-tight">
                Financeiro
            </h1>
        </div>
        
        {/* Breadcrumb Placeholder or Page Title could go here */}
        <div className="hidden md:flex items-center text-sm text-gray-500">
            <span className="font-medium text-orange-600">Bem-vindo</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:block text-right">
          <Clock />
        </div>
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 border border-white shadow-sm"></div>
      </div>
    </header>
  );
};

export default Header;