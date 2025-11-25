import React, { useState, useEffect } from 'react';
import { AppView } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import BoletosAReceber from './components/ControleCheques'; // Renomeado para clareza
import GestaoBoletos from './components/GestaoBoletos';
import BoletosAPagar from './components/ControleBoletos'; // Renomeado para clareza
import TitulosProrrogados from './components/TitulosProrrogados';
import Login from './components/Login';
import CadastroContasBancarias from './components/CadastroContasBancarias';
import GerenciadorCartoes from './components/GerenciadorCartoes';
import FechamentoPeriodo from './components/FechamentoPeriodo';
import ConfiguracaoSeguranca from './components/ConfiguracaoSeguranca';
import PrevisaoFinanceiraHome from './components/PrevisaoFinanceiraHome';
import PagamentosDiariosHome from './components/PagamentosDiariosHome';
import GerenciadorTarefas from './components/GerenciadorTarefas';


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('isAuthenticated') === 'true';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Apply theme on load
    const isDarkMode = localStorage.getItem('theme') === 'dark';
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
    
    const loadAndApplyFont = (target: 'body' | 'heading', fontName: string | null) => {
      const effectiveFont = fontName || 'Inter';
      
      document.documentElement.style.setProperty(`--font-${target}`, effectiveFont);
      
      const sanitizedFontName = effectiveFont.replace(/ /g, '+');
      const linkId = `google-font-${target}`;
      let link = document.getElementById(linkId) as HTMLLinkElement;
      
      if (!link) {
          link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          document.head.appendChild(link);
      }
      
      const newHref = `https://fonts.googleapis.com/css2?family=${sanitizedFontName}:wght@400;500;700;900&display=swap`;
      
      if (link.href !== newHref) {
        link.href = newHref;
      }
    };

    // Apply fonts on load
    loadAndApplyFont('body', localStorage.getItem('fontBody'));
    loadAndApplyFont('heading', localStorage.getItem('fontHeading'));

    // --- Force Fullscreen Logic ---
    const enableFullScreen = async () => {
        const doc = document.documentElement;
        if (!document.fullscreenElement) {
            try {
                if (doc.requestFullscreen) {
                    await doc.requestFullscreen();
                } else if ((doc as any).webkitRequestFullscreen) {
                    await (doc as any).webkitRequestFullscreen(); // Safari
                } else if ((doc as any).msRequestFullscreen) {
                    await (doc as any).msRequestFullscreen(); // IE11
                }
            } catch (err) {
                // Expected error if not user-initiated (Browser Policy)
                console.debug("Fullscreen request blocked by browser policy (waiting for user interaction).");
            }
        }
    };

    // Attempt immediately on load
    enableFullScreen();

    // Setup listeners to trigger on first interaction
    const handleInteraction = () => {
        enableFullScreen();
        // Cleanup listeners after attempt to avoid persistent triggering
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
        document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
        document.removeEventListener('touchstart', handleInteraction);
    };

  }, []);

  const handleLoginSuccess = () => {
    sessionStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
    setCurrentView(AppView.DASHBOARD); 
  };
  
  const handleToggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderView = () => {
    switch (currentView) {
      case AppView.CONTROLE_CHEQUES:
        return <BoletosAReceber />;
      case AppView.GESTAO_BOLETOS:
        return <GestaoBoletos />;
      case AppView.CONTROLE_BOLETOS:
        return <BoletosAPagar />;
      case AppView.TITULOS_PRORROGADOS:
        return <TitulosProrrogados />;
      case AppView.PREVISAO_FINANCEIRA:
        return <PrevisaoFinanceiraHome initialTab="fabrica" />;
      case AppView.PAGAMENTOS_DIARIOS:
        return <PagamentosDiariosHome initialTab="fabrica" />;
      case AppView.PREVISAO_FABRICA: // These are sub-views, their `onBack` prop will be to return to PrevisaoFinanceiraHome
        return <PrevisaoFinanceiraHome initialTab="fabrica" />;
      case AppView.PREVISAO_CRISTIANO: // These are sub-views, their `onBack` prop will be to return to PrevisaoFinanceiraHome
        return <PrevisaoFinanceiraHome initialTab="cristiano" />;
      case AppView.PAGAMENTOS_FABRICA: // These are sub-views, their `onBack` prop will be to return to PagamentosDiariosHome
        return <PagamentosDiariosHome initialTab="fabrica" />;
      case AppView.PAGAMENTOS_CRISTIANO: // These are sub-views, their `onBack` prop will be to return to PagamentosDiariosHome
        return <PagamentosDiariosHome initialTab="cristiano" />;
      case AppView.CADASTRO_CONTAS_BANCARIAS:
        return <CadastroContasBancarias />;
      case AppView.GERENCIADOR_CARTOES:
        return <GerenciadorCartoes />;
      case AppView.FECHAMENTO_PERIODO:
        return <FechamentoPeriodo />;
      case AppView.CONFIGURACAO_SEGURANCA:
        return <ConfiguracaoSeguranca />;
      case AppView.GERENCIADOR_TAREFAS:
        return <GerenciadorTarefas />;
      case AppView.DASHBOARD:
      default:
        return <Dashboard setView={setCurrentView} />;
    }
  };

  const isDashboard = currentView === AppView.DASHBOARD;

  return (
    <div className="h-screen bg-background font-sans flex flex-col overflow-hidden">
      <Header 
        setView={setCurrentView} 
        onToggleSidebar={handleToggleSidebar} 
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
            currentView={currentView} 
            setView={setCurrentView} 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)}
            onLogout={handleLogout}
        />
        <main className={`flex-1 overflow-y-auto bg-background ${isDashboard ? 'p-4 sm:p-6 lg:p-8' : ''}`}>
            <div className="max-w-full mx-auto">
                {renderView()}
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;