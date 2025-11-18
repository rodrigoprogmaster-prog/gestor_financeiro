import React, { useState } from 'react';
import PagamentosFabrica from './PagamentosFabrica';
import PagamentosCristiano from './PagamentosCristiano';
import { ArrowLeftIcon } from './icons';

interface PagamentosDiariosHomeProps {
  initialTab: 'fabrica' | 'cristiano';
  onBack?: () => void;
}

const PagamentosDiariosHome: React.FC<PagamentosDiariosHomeProps> = ({ initialTab, onBack }) => {
  const [activeTab, setActiveTab] = useState<'fabrica' | 'cristiano'>(initialTab || 'fabrica');

  const renderContent = () => {
    switch (activeTab) {
      case 'fabrica':
        return <PagamentosFabrica />;
      case 'cristiano':
        return <PagamentosCristiano />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-grow w-full">
        <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-6">
            <div className="flex items-center gap-4 mb-6">
                {onBack && (
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Voltar
                    </button>
                )}
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
                    Pagamentos Diários
                </h2>
            </div>
            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('fabrica')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'fabrica'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
                        }`}
                    >
                        Fábrica
                    </button>
                    <button
                        onClick={() => setActiveTab('cristiano')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'cristiano'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
                        }`}
                    >
                        Cristiano
                    </button>
                </nav>
            </div>
        </div>

        <div className="flex-grow flex flex-col">
          {renderContent()}
        </div>
    </div>
  );
};

export default PagamentosDiariosHome;