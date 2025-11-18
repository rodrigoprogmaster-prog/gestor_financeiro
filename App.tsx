import React, { useState, useEffect } from 'react';
import { AppView } from './types';
import Header from './components/Header';
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
import MeuDiaModal from './components/MeuDiaModal';


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('isAuthenticated') === 'true';
  });
  const [isMeuDiaModalOpen, setIsMeuDiaModalOpen] = useState(false);

  useEffect(() => {
    // Apply theme on load
    const isDarkMode = localStorage.getItem('theme') === 'dark';
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
    
    const loadAndApplyFont = (target: 'body' | 'heading', fontName: string | null) => {
      const effectiveFont = fontName || 'Roboto';
      
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
  
  const handleBackToDashboard = () => {
    setCurrentView(AppView.DASHBOARD);
  };

  const handleOpenMeuDiaModal = () => setIsMeuDiaModalOpen(true);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderView = () => {
    switch (currentView) {
      case AppView.CONTROLE_CHEQUES:
        return <BoletosAReceber onBack={handleBackToDashboard} />;
      case AppView.GESTAO_BOLETOS:
        return <GestaoBoletos onBack={handleBackToDashboard} />;
      case AppView.CONTROLE_BOLETOS:
        return <BoletosAPagar onBack={handleBackToDashboard} />;
      case AppView.TITULOS_PRORROGADOS:
        return <TitulosProrrogados onBack={handleBackToDashboard} />;
      case AppView.PREVISAO_FINANCEIRA:
        return <PrevisaoFinanceiraHome initialTab="fabrica" onBack={handleBackToDashboard} />;
      case AppView.PAGAMENTOS_DIARIOS:
        return <PagamentosDiariosHome initialTab="fabrica" onBack={handleBackToDashboard} />;
      case AppView.PREVISAO_FABRICA:
        return <PrevisaoFinanceiraHome initialTab="fabrica" onBack={handleBackToDashboard} />;
      case AppView.PREVISAO_CRISTIANO:
        return <PrevisaoFinanceiraHome initialTab="cristiano" onBack={handleBackToDashboard} />;
      case AppView.PAGAMENTOS_FABRICA:
        return <PagamentosDiariosHome initialTab="fabrica" onBack={handleBackToDashboard} />;
      case AppView.PAGAMENTOS_CRISTIANO:
        return <PagamentosDiariosHome initialTab="cristiano" onBack={handleBackToDashboard} />;
      case AppView.CADASTRO_CONTAS_BANCARIAS:
        return <CadastroContasBancarias onBack={handleBackToDashboard} />;
      case AppView.GERENCIADOR_CARTOES:
        return <GerenciadorCartoes onBack={handleBackToDashboard} />;
      case AppView.FECHAMENTO_PERIODO:
        return <FechamentoPeriodo onBack={handleBackToDashboard} />;
      case AppView.CONFIGURACAO_SEGURANCA:
        return <ConfiguracaoSeguranca onBack={handleBackToDashboard} />;
      case AppView.GERENCIADOR_TAREFAS:
        return <GerenciadorTarefas onBack={handleBackToDashboard} />;
      case AppView.DASHBOARD:
      default:
        return <Dashboard setView={setCurrentView} />;
    }
  };

  const isDashboard = currentView === AppView.DASHBOARD;

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Header setView={setCurrentView} onLogout={handleLogout} onOpenMeuDia={handleOpenMeuDiaModal} />
      <main className={`flex-grow flex flex-col ${isDashboard ? 'p-4 sm:p-6 lg:p-8' : ''}`}>
        {renderView()}
      </main>
      {isMeuDiaModalOpen && <MeuDiaModal onClose={() => setIsMeuDiaModalOpen(false)} />}
    </div>
  );
};

export default App;