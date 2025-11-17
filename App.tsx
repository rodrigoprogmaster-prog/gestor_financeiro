import React, { useState, useEffect } from 'react';
import { AppView } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ControleCheques from './components/ControleCheques';
import GestaoBoletos from './components/GestaoBoletos';
import ControleBoletos from './components/ControleBoletos';
import TitulosProrrogados from './components/TitulosProrrogados';
import PrevisaoFabrica from './components/PrevisaoFinanceira';
import PrevisaoCristiano from './components/HistoricoPrevisoes';
import PagamentosFabrica from './components/PagamentosFabrica';
import PagamentosCristiano from './components/PagamentosCristiano';
import Login from './components/Login';
import CadastroContasBancarias from './components/CadastroContasBancarias';
import GerenciadorCartoes from './components/GerenciadorCartoes';
import FechamentoPeriodo from './components/FechamentoPeriodo';
import ConfiguracaoSeguranca from './components/ConfiguracaoSeguranca';
import PrevisaoFinanceiraHome from './components/PrevisaoFinanceiraHome';
import PagamentosDiariosHome from './components/PagamentosDiariosHome';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('isAuthenticated') === 'true';
  });

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
  
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderView = () => {
    switch (currentView) {
      case AppView.CONTROLE_CHEQUES:
        return <ControleCheques />;
      case AppView.GESTAO_BOLETOS:
        return <GestaoBoletos />;
      case AppView.CONTROLE_BOLETOS:
        return <ControleBoletos />;
      case AppView.TITULOS_PRORROGADOS:
        return <TitulosProrrogados />;
      case AppView.PREVISAO_FINANCEIRA:
        return <PrevisaoFinanceiraHome setView={setCurrentView} />;
      case AppView.PAGAMENTOS_DIARIOS:
        return <PagamentosDiariosHome setView={setCurrentView} />;
      case AppView.PREVISAO_FABRICA:
        return <PrevisaoFabrica />;
      case AppView.PREVISAO_CRISTIANO:
        return <PrevisaoCristiano />;
      case AppView.PAGAMENTOS_FABRICA:
        return <PagamentosFabrica />;
      case AppView.PAGAMENTOS_CRISTIANO:
        return <PagamentosCristiano />;
      case AppView.CADASTRO_CONTAS_BANCARIAS:
        return <CadastroContasBancarias />;
      case AppView.GERENCIADOR_CARTOES:
        return <GerenciadorCartoes />;
      case AppView.FECHAMENTO_PERIODO:
        return <FechamentoPeriodo />;
      case AppView.CONFIGURACAO_SEGURANCA:
        return <ConfiguracaoSeguranca />;
      case AppView.DASHBOARD:
      default:
        return <Dashboard setView={setCurrentView} />;
    }
  };

  const isDashboard = currentView === AppView.DASHBOARD;

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Header setView={setCurrentView} onLogout={handleLogout} />
      <main className={`flex-grow flex flex-col ${isDashboard ? 'p-4 sm:p-6 lg:p-8' : ''}`}>
        {renderView()}
      </main>
    </div>
  );
};

export default App;