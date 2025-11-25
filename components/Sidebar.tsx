
import React, { useState } from 'react';
import { AppView } from '../types';
import {
  HomeIcon,
  ArrowUpCircleIcon,
  CheckIcon,
  ArrowDownCircleIcon,
  CalendarClockIcon,
  TrendingUpIcon,
  DatabaseIcon,
  ReportIcon,
  CreditCardIcon,
  ClipboardCheckIcon,
  SettingsIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  XIcon,
  LogoutIcon
} from './icons';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
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
    { view: AppView.DASHBOARD, name: 'Início', icon: <HomeIcon className="h-5 w-5" /> },
    { view: AppView.GESTAO_BOLETOS, name: 'Boletos a Receber', icon: <ArrowUpCircleIcon className="h-5 w-5" /> },
    { view: AppView.CONTROLE_CHEQUES, name: 'Gerenciador de Cheques', icon: <CheckIcon className="h-5 w-5" /> },
    { view: AppView.CONTROLE_BOLETOS, name: 'Boletos a Pagar', icon: <ArrowDownCircleIcon className="h-5 w-5" /> },
    { view: AppView.GERENCIADOR_TAREFAS, name: 'Tarefas', icon: <ClipboardListIcon className="h-5 w-5" /> },
    { view: AppView.TITULOS_PRORROGADOS, name: 'Títulos Prorrogados', icon: <CalendarClockIcon className="h-5 w-5" /> },
    { view: AppView.CADASTRO_CONTAS_BANCARIAS, name: 'Contas Bancárias', icon: <DatabaseIcon className="h-5 w-5" /> },
    { view: AppView.GERENCIADOR_CARTOES, name: 'Cartões', icon: <CreditCardIcon className="h-5 w-5" /> },
    { view: AppView.FECHAMENTO_PERIODO, name: 'Fechamento', icon: <ClipboardCheckIcon className="h-5 w-5" /> },
    {
        name: 'Previsão',
        icon: <TrendingUpIcon className="h-5 w-5" />,
        children: [
            { view: AppView.PREVISAO_FINANCEIRA, name: 'Fábrica', icon: <TrendingUpIcon className="h-4 w-4" /> },
            { view: AppView.PREVISAO_CRISTIANO, name: 'Cristiano', icon: <DatabaseIcon className="h-4 w-4" /> },
        ]
    },
    {
        name: 'Pagamentos',
        icon: <ReportIcon className="h-5 w-5" />,
        children: [
            { view: AppView.PAGAMENTOS_FABRICA, name: 'Fábrica', icon: <ReportIcon className="h-4 w-4" /> },
            { view: AppView.PAGAMENTOS_CRISTIANO, name: 'Cristiano', icon: <ReportIcon className="h-4 w-4" /> },
        ]
    },
    { view: AppView.CONFIGURACAO_SEGURANCA, name: 'Configurações', icon: <SettingsIcon className="h-5 w-5" /> },
];

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, onClose, onLogout }) => {
  // Initialize open submenus based on current view or default to false
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>(() => {
      const initialOpen: Record<string, boolean> = {};
      modules.forEach(mod => {
          if ('children' in mod) {
              // Auto-open if a child is active
              if (mod.children.some(child => child.view === currentView)) {
                  initialOpen[mod.name] = true;
              }
          }
      });
      return initialOpen;
  });

  const toggleSubMenu = (name: string) => {
    setOpenSubMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleNavigation = (view: AppView) => {
    setView(view);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Determine if a parent is active (if one of its children is the current view)
  const isParentActive = (parent: NavParent) => {
      return parent.children.some(child => child.view === currentView);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col
        lg:translate-x-0 lg:static lg:h-auto lg:shadow-none shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
            <span className="text-lg font-bold text-white font-heading tracking-tight">Menu</span>
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1 rounded-full transition-colors">
                <XIcon className="h-6 w-6" />
            </button>
        </div>

        <div className="overflow-y-auto flex-1 py-4 custom-scrollbar">
          <ul className="space-y-1 px-3">
            {modules.map((module) => {
              if ('children' in module) {
                const isActive = isParentActive(module);
                return (
                  <li key={module.name}>
                    <button
                      onClick={() => toggleSubMenu(module.name)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-full text-sm transition-colors font-medium
                        ${isActive ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        {module.icon}
                        <span>{module.name}</span>
                      </div>
                      <ChevronDownIcon className={`h-4 w-4 transform transition-transform duration-200 ${openSubMenus[module.name] ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Submenu */}
                    <div className={`overflow-hidden transition-all duration-300 ${openSubMenus[module.name] ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                      <ul className="pl-4 space-y-1 border-l border-slate-700 ml-4">
                        {module.children.map(child => (
                          <li key={child.view}>
                            <button
                              onClick={() => {
                                handleNavigation(child.view);
                                setOpenSubMenus(prev => ({ ...prev, [module.name]: false }));
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2 rounded-full text-sm transition-colors
                                ${currentView === child.view 
                                  ? 'text-white font-semibold bg-blue-600 shadow-md' 
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                              `}
                            >
                              <span>{child.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              } else {
                const isSelected = currentView === module.view;
                return (
                  <li key={module.view}>
                    <button
                      onClick={() => handleNavigation(module.view)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm transition-colors font-medium
                        ${isSelected 
                          ? 'bg-blue-600 text-white shadow-lg ring-1 ring-white/10' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                      `}
                    >
                      <span className={isSelected ? 'text-white' : 'text-slate-400 group-hover:text-white'}>
                        {module.icon}
                      </span>
                      <span>{module.name}</span>
                    </button>
                  </li>
                );
              }
            })}
          </ul>
        </div>
        
        <div className="p-4 border-t border-slate-800 shrink-0 space-y-2">
            <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm transition-colors font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300"
            >
                <LogoutIcon className="h-5 w-5" />
                <span>Sair</span>
            </button>
            <p className="text-xs text-center text-slate-600 pt-2">&copy; 2025 Gerenciador PJ</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
