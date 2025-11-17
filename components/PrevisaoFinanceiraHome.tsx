import React from 'react';
import { AppView } from '../types';
import { TrendingUpIcon, DatabaseIcon } from './icons';

interface PrevisaoFinanceiraHomeProps {
  setView: (view: AppView) => void;
}

const PrevisaoFinanceiraHome: React.FC<PrevisaoFinanceiraHomeProps> = ({ setView }) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col items-center flex-grow justify-center">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary mb-2 font-heading">Previsão Financeira</h2>
        <p className="text-lg text-text-secondary">Selecione qual previsão você deseja gerenciar.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl w-full">
        <div
          onClick={() => setView(AppView.PREVISAO_FABRICA)}
          className="bg-card rounded-xl shadow-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transform hover:scale-105 transition-transform duration-300 border border-border hover:border-primary min-h-[250px]"
        >
          <div className="mb-4">
            <TrendingUpIcon className="h-12 w-12 text-primary" />
          </div>
          <h4 className="text-xl font-semibold text-text-primary">Fábrica</h4>
          <p className="text-sm text-text-secondary mt-2">Acesse a previsão de receitas e despesas da operação da fábrica.</p>
        </div>
        <div
          onClick={() => setView(AppView.PREVISAO_CRISTIANO)}
          className="bg-card rounded-xl shadow-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transform hover:scale-105 transition-transform duration-300 border border-border hover:border-primary min-h-[250px]"
        >
          <div className="mb-4">
            <DatabaseIcon className="h-12 w-12 text-primary" />
          </div>
          <h4 className="text-xl font-semibold text-text-primary">Cristiano</h4>
          <p className="text-sm text-text-secondary mt-2">Acesse a previsão de receitas e despesas da operação de Cristiano.</p>
        </div>
      </div>
    </div>
  );
};

export default PrevisaoFinanceiraHome;