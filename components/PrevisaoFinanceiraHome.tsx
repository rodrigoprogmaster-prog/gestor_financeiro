import React, { useState } from 'react';
// Fix: Changed import from default to named import
import { PrevisaoFabrica } from './PrevisaoFinanceira';
// Fix: Changed import from default to named import
import { PrevisaoCristiano } from './HistoricoPrevisoes';
import { ArrowLeftIcon } from './icons';

interface PrevisaoFinanceiraHomeProps {
  initialTab: 'fabrica' | 'cristiano';
  onBack?: () => void;
}

const PrevisaoFinanceiraHome: React.FC<PrevisaoFinanceiraHomeProps> = ({ initialTab, onBack }) => {
  const [activeTab, setActiveTab] = useState<'fabrica' | 'cristiano'>(initialTab || 'fabrica');

  const renderContent = () => {
    switch (activeTab) {
      case 'fabrica':
        return <PrevisaoFabrica />;
      case 'cristiano':
        return <PrevisaoCristiano />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-grow w-full h-full bg-background">
        <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-6 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-white border border-border hover:bg-secondary font-medium transition-colors text-sm">
                            <ArrowLeftIcon className="h-4 w-4" />
                            Voltar
                        </button>
                    )}
                    <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                        Previsão Financeira
                    </h2>
                </div>

                {/* Compact Segmented Control */}
                <div className="bg-secondary p-1 rounded-full inline-flex border border-border">
                    <button
                        onClick={() => setActiveTab('fabrica')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                            activeTab === 'fabrica'
                            ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        Fábrica
                    </button>
                    <button
                        onClick={() => setActiveTab('cristiano')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                            activeTab === 'cristiano'
                            ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        Cristiano
                    </button>
                </div>
            </div>
        </div>

        <div className="flex-grow flex flex-col overflow-hidden">
          {renderContent()}
        </div>
    </div>
  );
};

export default PrevisaoFinanceiraHome;