import React, { useState, useEffect, useRef } from 'react';
import { AppView } from '../types';
import Clock from './Clock';
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
  ChevronDownIcon,
  ClipboardListIcon,
  SparklesIcon,
} from './icons';

interface HeaderProps {
  setView: (view: AppView) => void;
  onLogout: () => void;
  onOpenMeuDia: () => void;
}

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
    { view: AppView.DASHBOARD, name: 'Início', icon: <HomeIcon className="h-4 w-4" /> },
    { view: AppView.CONTROLE_CHEQUES, name: 'Boletos a Receber', icon: <ArrowUpCircleIcon className="h-4 w-4" /> },
    { view: AppView.GESTAO_BOLETOS, name: 'Gerenciador de Cheques', icon: <CheckIcon className="h-4 w-4" /> },
    { view: AppView.CONTROLE_BOLETOS, name: 'Boletos a Pagar', icon: <ArrowDownCircleIcon className="h-4 w-4" /> },
    { view: AppView.GERENCIADOR_TAREFAS, name: 'Tarefas', icon: <ClipboardListIcon className="h-4 w-4" /> },
    { view: AppView.TITULOS_PRORROGADOS, name: 'Títulos Prorrogados', icon: <CalendarClockIcon className="h-4 w-4" /> },
    { view: AppView.CADASTRO_CONTAS_BANCARIAS, name: 'Contas Bancárias', icon: <DatabaseIcon className="h-4 w-4" /> },
    { view: AppView.GERENCIADOR_CARTOES, name: 'Cartões', icon: <CreditCardIcon className="h-4 w-4" /> },
    { view: AppView.FECHAMENTO_PERIODO, name: 'Fechamento', icon: <ClipboardCheckIcon className="h-4 w-4" /> },
    {
        name: 'Previsão',
        icon: <TrendingUpIcon className="h-4 w-4" />,
        children: [
            { view: AppView.PREVISAO_FINANCEIRA, name: 'Fábrica', icon: <TrendingUpIcon className="h-4 w-4" /> },
            { view: AppView.PREVISAO_CRISTIANO, name: 'Cristiano', icon: <DatabaseIcon className="h-4 w-4" /> },
        ]
    },
    {
        name: 'Pagamentos',
        icon: <ReportIcon className="h-4 w-4" />,
        children: [
            { view: AppView.PAGAMENTOS_FABRICA, name: 'Fábrica', icon: <ReportIcon className="h-4 w-4" /> },
            { view: AppView.PAGAMENTOS_CRISTIANO, name: 'Cristiano', icon: <ReportIcon className="h-4 w-4" /> },
        ]
    },
    { view: AppView.CONFIGURACAO_SEGURANCA, name: 'Configurações', icon: <SettingsIcon className="h-4 w-4" /> },
];

const Header: React.FC<HeaderProps> = ({ setView, onLogout, onOpenMeuDia }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setOpenSubMenus({}); // Close all sub-menus too
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
    <header className="bg-card shadow-sm border-b border-border h-16 flex justify-between items-center px-6 sticky top-0 z-40">
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => handleNavigation(AppView.DASHBOARD)}
        title="Voltar para o Início"
      >
        <div className="p-1.5 rounded-md bg-secondary border border-border group-hover:bg-primary group-hover:border-primary transition-colors">
             <WalletIcon className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
        </div>
        <h1 className="text-lg font-bold text-text-primary font-heading tracking-tight">
          Gerenciador Financeiro
        </h1>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="hidden md:block text-right mr-4">
          <Clock />
        </div>
        
        <button
            onClick={onOpenMeuDia}
            className="flex items-center justify-center bg-warning/10 text-warning border border-warning/30 font-medium p-2 rounded-md hover:bg-warning/20 transition-colors h-9 w-9"
            aria-label="Abrir Meu Dia"
            title="Meu Dia"
        >
            <SparklesIcon className="h-5 w-5" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center justify-center bg-secondary text-text-primary border border-border font-medium p-2 rounded-md hover:bg-border transition-colors h-9 w-9"
            aria-label="Abrir menu de navegação"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-lg border border-border animate-fade-in-down overflow-hidden">
              <ul className="py-1 max-h-[80vh] overflow-y-auto">
                {modules.map((module: NavItem) => (
                   'children' in module ? (
                    <li key={module.name} className="border-b border-border last:border-0">
                      <button
                        onClick={() => toggleSubMenu(module.name)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-text-primary hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-text-secondary">{module.icon}</span>
                          <span className="font-medium">{module.name}</span>
                        </div>
                        <ChevronDownIcon className={`h-4 w-4 text-text-secondary transform transition-transform ${openSubMenus[module.name] ? 'rotate-180' : ''}`} />
                      </button>
                      {openSubMenus[module.name] && (
                        <ul className="bg-secondary/50">
                          {module.children.map(child => (
                            <li key={child.view}>
                              <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); handleNavigation(child.view); }}
                                className="flex items-center gap-3 px-4 py-2 pl-10 text-sm text-text-secondary hover:text-primary hover:bg-secondary transition-colors"
                              >
                                <span className="font-medium">{child.name}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ) : (
                    <li key={module.view} className="border-b border-border last:border-0">
                      <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); handleNavigation(module.view); }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-secondary transition-colors"
                      >
                        <span className="text-text-secondary">{module.icon}</span>
                        <span className="font-medium">{module.name}</span>
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
          className="flex items-center justify-center bg-white text-danger border border-border font-medium p-2 rounded-md hover:bg-danger hover:text-white hover:border-danger transition-all h-9 w-9"
          aria-label="Deslogar do sistema"
          title="Sair"
        >
          <LogoutIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;