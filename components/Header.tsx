import React, { useState, useEffect, useRef } from 'react';
import { AppView } from '../types';
import Clock from './Clock'; // Import the new Clock component
import {
  WalletIcon,
  MenuIcon,
  HomeIcon,
  ArrowUpCircleIcon,
  CheckIcon,
  ArrowDownCircleIcon,
  CalendarClockIcon,
  TrendingUpIcon,
  DatabaseIcon,
  ReportIcon,
  LogoutIcon,
  CreditCardIcon,
  ClipboardCheckIcon,
  SettingsIcon,
  ChevronDownIcon, // Importar o novo ícone
  ClipboardListIcon,
  SparklesIcon,
} from './icons';

interface HeaderProps {
  setView: (view: AppView) => void;
  onLogout: () => void;
  onOpenMeuDia: () => void;
}

// Tipos para os itens de navegação
type NavLink = {
  view: AppView;
  name: string;
  icon: React.ReactNode;
};

type NavParent = {
  name: string;
  icon: React.ReactNode;
  children: NavLink[];
};

type NavItem = NavLink | NavParent;

const modules: NavItem[] = [
    { view: AppView.DASHBOARD, name: 'Início', icon: <HomeIcon className="h-5 w-5" /> },
    { view: AppView.CONTROLE_CHEQUES, name: 'Boletos a Receber', icon: <ArrowUpCircleIcon className="h-5 w-5" /> },
    { view: AppView.GESTAO_BOLETOS, name: 'Gerenciador de Cheques', icon: <CheckIcon className="h-5 w-5" /> },
    { view: AppView.CONTROLE_BOLETOS, name: 'Boletos a Pagar', icon: <ArrowDownCircleIcon className="h-5 w-5" /> },
    { view: AppView.GERENCIADOR_TAREFAS, name: 'Gerenciador de Tarefas', icon: <ClipboardListIcon className="h-5 w-5" /> },
    { view: AppView.TITULOS_PRORROGADOS, name: 'Títulos Prorrogados', icon: <CalendarClockIcon className="h-5 w-5" /> },
    { view: AppView.CADASTRO_CONTAS_BANCARIAS, name: 'Contas Bancárias', icon: <DatabaseIcon className="h-5 w-5" /> },
    { view: AppView.GERENCIADOR_CARTOES, name: 'Cartões de Crédito', icon: <CreditCardIcon className="h-5 w-5" /> },
    { view: AppView.FECHAMENTO_PERIODO, name: 'Fechamento de Período', icon: <ClipboardCheckIcon className="h-5 w-5" /> },
    {
        name: 'Previsão Financeira',
        icon: <TrendingUpIcon className="h-5 w-5" />,
        children: [
            { view: AppView.PREVISAO_FABRICA, name: 'Fábrica', icon: <TrendingUpIcon className="h-5 w-5" /> },
            { view: AppView.PREVISAO_CRISTIANO, name: 'Cristiano', icon: <DatabaseIcon className="h-5 w-5" /> },
        ]
    },
    {
        name: 'Pagamentos Diários',
        icon: <ReportIcon className="h-5 w-5" />,
        children: [
            { view: AppView.PAGAMENTOS_FABRICA, name: 'Fábrica', icon: <ReportIcon className="h-5 w-5" /> },
            { view: AppView.PAGAMENTOS_CRISTIANO, name: 'Cristiano', icon: <ReportIcon className="h-5 w-5" /> },
        ]
    },
    { view: AppView.CONFIGURACAO_SEGURANCA, name: 'Configuração e Segurança', icon: <SettingsIcon className="h-5 w-5" /> },
];

const Header: React.FC<HeaderProps> = ({ setView, onLogout, onOpenMeuDia }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNavigation = (view: AppView) => {
    setView(view);
    setIsMenuOpen(false);
    setOpenSubMenus({});
  };

  const toggleSubMenu = (name: string) => {
    setOpenSubMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <header className="bg-secondary shadow-md p-4 flex justify-between items-center border-b border-border">
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => handleNavigation(AppView.DASHBOARD)}
        title="Voltar para o Início"
      >
        <WalletIcon className="h-8 w-8 text-primary" />
        <h1 className="text-xl md:text-2xl font-bold text-text-primary font-heading">
          Gerenciador Financeiro
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:block text-right">
          <Clock />
        </div>
        <button
            onClick={onOpenMeuDia}
            className="flex items-center justify-center bg-yellow-400 text-yellow-900 font-semibold p-2 rounded-lg hover:bg-yellow-500 transition-colors duration-300 h-10 w-10"
            aria-label="Abrir Meu Dia"
            title="Meu Dia"
        >
            <SparklesIcon className="h-6 w-6" />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center justify-center bg-primary text-white font-semibold p-2 rounded-lg hover:bg-primary-hover transition-colors duration-300 h-10 w-10"
            aria-label="Abrir menu de navegação"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-card rounded-lg shadow-xl z-50 border border-border animate-fade-in-down">
              <ul className="py-2">
                {modules.map((module: NavItem) => (
                   'children' in module ? (
                    <li key={module.name}>
                      <button
                        onClick={() => toggleSubMenu(module.name)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-text-primary hover:bg-background transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-primary">{module.icon}</span>
                          <span className="font-semibold">{module.name}</span>
                        </div>
                        <ChevronDownIcon className={`h-5 w-5 transform transition-transform ${openSubMenus[module.name] ? 'rotate-180' : ''}`} />
                      </button>
                      {openSubMenus[module.name] && (
                        <ul className="pl-8 pb-2">
                          {module.children.map(child => (
                            <li key={child.view}>
                              <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); handleNavigation(child.view); }}
                                className="flex items-center gap-3 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                              >
                                <span className="font-semibold">{child.name}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ) : (
                    <li key={module.view}>
                      <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); handleNavigation(module.view); }}
                        className="flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-background transition-colors duration-200"
                      >
                        <span className="text-primary">{module.icon}</span>
                        <span className="font-semibold">{module.name}</span>
                      </a>
                    </li>
                  )
                ))}
              </ul>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          className="flex items-center justify-center bg-danger text-white font-semibold p-2 rounded-lg hover:bg-red-700 transition-colors duration-300 h-10 w-10"
          aria-label="Deslogar do sistema"
        >
          <LogoutIcon className="h-6 w-6" />
        </button>
      </div>
    </header>
  );
};

export default Header;