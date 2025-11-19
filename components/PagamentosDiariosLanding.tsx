import React from 'react';
import { AppView } from '../types';
import { ReportIcon } from './icons';

interface PagamentosDiariosLandingProps {
  setView: (view: AppView) => void;
}

const PagamentosDiariosLanding: React.FC<PagamentosDiariosLandingProps> = ({ setView }) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col items-center flex-grow justify-center">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-text-primary mb-2 font-heading tracking-tight">Pagamentos Diários</h2>
        <p className="text-text-secondary">Selecione qual grupo de pagamentos você deseja gerenciar.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
        <div
          onClick={() => setView(AppView.PAGAMENTOS_FABRICA)}
          className="bg-card rounded-lg border border-border p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:shadow-sm transition-all duration-200 min-h-[200px] group"
        >
          <div className="mb-4 p-4 bg-secondary rounded-full border border-border group-hover:border-primary/30 transition-colors">
            <ReportIcon className="h-8 w-8 text-primary" />
          </div>
          <h4 className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors">Fábrica</h4>
          <p className="text-sm text-text-secondary mt-2">Gerencie os lançamentos de pagamentos diários da fábrica.</p>
        </div>
        <div
          onClick={() => setView(AppView.PAGAMENTOS_CRISTIANO)}
          className="bg-card rounded-lg border border-border p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:shadow-sm transition-all duration-200 min-h-[200px] group"
        >
          <div className="mb-4 p-4 bg-secondary rounded-full border border-border group-hover:border-primary/30 transition-colors">
            <ReportIcon className="h-8 w-8 text-primary" />
          </div>
          <h4 className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors">Cristiano</h4>
          <p className="text-sm text-text-secondary mt-2">Gerencie os lançamentos de pagamentos diários de Cristiano.</p>
        </div>
      </div>
    </div>
  );
};

export default PagamentosDiariosLanding;