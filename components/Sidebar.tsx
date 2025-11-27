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
  LogoutIcon,
  SearchIcon,
  BuildingIcon,
} from './icons';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenGlobalSearch: () => void;
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
    { view: AppView.CONTROLE_CHEQUES, name: 'Cheques', icon: <CheckIcon className="h-5 w-5" /> },
    { view: AppView.CONTROLE_BOLETOS, name: 'Boletos a Pagar', icon: <ArrowDownCircleIcon className="h-5 w-5" /> },
    { view: AppView.GERENCIADOR_TAREFAS, name: 'Tarefas', icon: <ClipboardListIcon className="h-5 w-5" /> },
    { view: AppView.TITULOS_PRORROGADOS, name: 'Títulos Prorrogados', icon: <CalendarClockIcon className="h-5 w-5" /> },
    { view: AppView.CADASTRO_CONTAS_BANCARIAS, name: 'Contas Bancárias', icon: <DatabaseIcon className="h-5 w-5" /> },
    { view: AppView.CONSULTA_CNPJ, name: 'Consulta CNPJ', icon: <BuildingIcon className="h-5 w-5" /> },
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

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, onClose, onLogout, onOpenGlobalSearch }) => {
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>(() => {
      const initialOpen: Record<string, boolean> = {};
      modules.forEach(mod => {
          if ('children' in mod) {
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
  
  const handleOpenSearch = () => {
    onOpenGlobalSearch();
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const isParentActive = (parent: NavParent) => {
      return parent.children.some(child => child.view === currentView);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container - Light Theme */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 shadow-xl lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header Logo Area */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center text-white shadow-sm">
                    <span className="font-bold font-heading text-lg">G</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 font-heading tracking-tight">Financeiro</span>
            </div>
            <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-900 p-1 rounded-md transition-colors">
                <XIcon className="h-6 w-6" />
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 py-6 px-4 custom-scrollbar">
          
          {/* Global Search Button */}
          <button
              onClick={handleOpenSearch}
              className="w-full flex items-center gap-3 px-3 py-2.5 mb-6 rounded-lg text-sm font-medium text-gray-500 bg-gray-50 border border-gray-200 hover:border-orange-300 hover:text-gray-900 hover:bg-white transition-all group shadow-sm"
          >
              <SearchIcon className="h-4 w-4 text-gray-400 group-hover:text-orange-600 transition-colors" />
              <span>Buscar...</span>
              <span className="ml-auto text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">⌘K</span>
          </button>

          <nav className="space-y-1">
            {modules.map((module) => {
              if ('children' in module) {
                const isActive = isParentActive(module);
                return (
                  <div key={module.name} className="mb-1">
                    <button
                      onClick={() => toggleSubMenu(module.name)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                        ${isActive 
                            ? 'text-gray-900 bg-gray-50' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`${isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                            {module.icon}
                        </span>
                        <span>{module.name}</span>
                      </div>
                      <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${openSubMenus[module.name] ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <div className={`overflow-hidden transition-all duration-300 ${openSubMenus[module.name] ? 'max-h-96 opacity-100 pt-1' : 'max-h-0 opacity-0'}`}>
                      <ul className="space-y-0.5 pl-3">
                        {module.children.map(child => {
                            const isChildActive = currentView === child.view;
                            return (
                              <li key={child.view}>
                                <button
                                  onClick={() => handleNavigation(child.view)}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all border-l-2
                                    ${isChildActive 
                                      ? 'border-orange-600 text-orange-700 bg-orange-50 font-medium' 
                                      : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
                                  `}
                                >
                                  {child.name}
                                </button>
                              </li>
                            );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              } else {
                const isSelected = currentView === module.view;
                return (
                  <div key={module.view} className="mb-1">
                    <button
                      onClick={() => handleNavigation(module.view)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative overflow-hidden group
                        ${isSelected 
                          ? 'text-orange-700 bg-orange-50' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                      `}
                    >
                      {isSelected && <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-orange-600 rounded-r-full"></div>}
                      <span className={`transition-colors ${isSelected ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                        {module.icon}
                      </span>
                      <span>{module.name}</span>
                    </button>
                  </div>
                );
              }
            })}
          </nav>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors group"
            >
                <LogoutIcon className="h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                <span>Sair do Sistema</span>
            </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;