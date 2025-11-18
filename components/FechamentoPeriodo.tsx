import React, { useState } from 'react';
import FechamentoEmpresas from './FechamentoEmpresas';
import CaixaLiquidacao from './CaixaLiquidacao';
import { ClipboardCheckIcon, DatabaseIcon, ArrowLeftIcon } from './icons';

type FechamentoView = 'cristiano' | 'fabrica' | 'caixa_cristiano' | 'caixa_fabrica';

const FechamentoPeriodo: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const [selectedView, setSelectedView] = useState<FechamentoView | null>(null);

    const handleSelectView = (view: FechamentoView) => {
        setSelectedView(view);
    };

    const handleBack = () => {
        setSelectedView(null);
    };

    if (selectedView === 'cristiano') {
        return <FechamentoEmpresas title="Fechamento Empresas Cristiano" storageKey="fechamento_cristiano" onBack={handleBack} />;
    }

    if (selectedView === 'fabrica') {
        return <FechamentoEmpresas title="Fechamento Empresas Fábrica" storageKey="fechamento_fabrica" onBack={handleBack} />;
    }
    
    if (selectedView === 'caixa_cristiano') {
        return <CaixaLiquidacao title="Caixa Liquidação Cristiano" storageKey="caixa_liquidacao_cristiano" onBack={handleBack} />;
    }

    if (selectedView === 'caixa_fabrica') {
        return <CaixaLiquidacao title="Caixa Liquidação Fábrica" storageKey="caixa_liquidacao_fabrica" onBack={handleBack} />;
    }


    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in">
            <div className="flex items-center gap-4 mb-6">
                {onBack && (
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Voltar
                    </button>
                )}
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
                    Fechamento de Período Financeiro
                </h2>
            </div>
            <p className="text-lg text-text-secondary text-center mb-10">Selecione uma área para gerenciar.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div
                    onClick={() => handleSelectView('cristiano')}
                    className="bg-card rounded-xl shadow-lg p-6 flex flex-col items-center text-center cursor-pointer transform hover:scale-105 transition-transform duration-300 border border-border hover:border-primary"
                >
                    <div className="bg-primary/20 p-4 rounded-full mb-4">
                        <ClipboardCheckIcon className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">Empresas Cristiano</h3>
                    <p className="text-text-secondary">Gerenciar o fechamento do período para as empresas de Cristiano.</p>
                </div>
                <div
                    onClick={() => handleSelectView('fabrica')}
                    className="bg-card rounded-xl shadow-lg p-6 flex flex-col items-center text-center cursor-pointer transform hover:scale-105 transition-transform duration-300 border border-border hover:border-primary"
                >
                    <div className="bg-primary/20 p-4 rounded-full mb-4">
                        <ClipboardCheckIcon className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">Empresas Fábrica</h3>
                    <p className="text-text-secondary">Gerenciar o fechamento do período para as empresas da Fábrica.</p>
                </div>
                 <div
                    onClick={() => handleSelectView('caixa_cristiano')}
                    className="bg-card rounded-xl shadow-lg p-6 flex flex-col items-center text-center cursor-pointer transform hover:scale-105 transition-transform duration-300 border border-border hover:border-primary"
                >
                    <div className="bg-primary/20 p-4 rounded-full mb-4">
                        <DatabaseIcon className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">Caixa Liquidação Cristiano</h3>
                    <p className="text-text-secondary">Gerenciar saldos de liquidação para as empresas de Cristiano.</p>
                </div>
                 <div
                    onClick={() => handleSelectView('caixa_fabrica')}
                    className="bg-card rounded-xl shadow-lg p-6 flex flex-col items-center text-center cursor-pointer transform hover:scale-105 transition-transform duration-300 border border-border hover:border-primary"
                >
                    <div className="bg-primary/20 p-4 rounded-full mb-4">
                        <DatabaseIcon className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">Caixa Liquidação Fábrica</h3>
                    <p className="text-text-secondary">Gerenciar saldos de liquidação para as empresas da Fábrica.</p>
                </div>
            </div>
        </div>
    );
};

export default FechamentoPeriodo;