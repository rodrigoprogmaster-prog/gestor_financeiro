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

    const Card = ({ title, description, icon, onClick }: { title: string, description: string, icon: React.ReactNode, onClick: () => void }) => (
        <div
            onClick={onClick}
            className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center text-center cursor-pointer hover:border-primary hover:shadow-sm transition-all duration-200 group"
        >
            <div className="bg-secondary p-4 rounded-full mb-4 border border-border group-hover:border-primary/30 transition-colors">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2 group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-sm text-text-secondary">{description}</p>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in">
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-border">
                {onBack && (
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-white border border-border hover:bg-secondary font-medium transition-colors h-9 text-sm">
                        <ArrowLeftIcon className="h-4 w-4" />
                        Voltar
                    </button>
                )}
                <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                    Fechamento de Período
                </h2>
            </div>
            
            <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card 
                        title="Empresas Cristiano" 
                        description="Gerenciar o fechamento do período para as empresas de Cristiano." 
                        icon={<ClipboardCheckIcon className="h-6 w-6 text-primary" />} 
                        onClick={() => handleSelectView('cristiano')} 
                    />
                    <Card 
                        title="Empresas Fábrica" 
                        description="Gerenciar o fechamento do período para as empresas da Fábrica." 
                        icon={<ClipboardCheckIcon className="h-6 w-6 text-primary" />} 
                        onClick={() => handleSelectView('fabrica')} 
                    />
                    <Card 
                        title="Caixa Liquidação Cristiano" 
                        description="Gerenciar saldos de liquidação para as empresas de Cristiano." 
                        icon={<DatabaseIcon className="h-6 w-6 text-primary" />} 
                        onClick={() => handleSelectView('caixa_cristiano')} 
                    />
                    <Card 
                        title="Caixa Liquidação Fábrica" 
                        description="Gerenciar saldos de liquidação para as empresas da Fábrica." 
                        icon={<DatabaseIcon className="h-6 w-6 text-primary" />} 
                        onClick={() => handleSelectView('caixa_fabrica')} 
                    />
                </div>
            </div>
        </div>
    );
};

export default FechamentoPeriodo;