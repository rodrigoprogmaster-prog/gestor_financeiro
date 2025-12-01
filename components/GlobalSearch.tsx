import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AppView, SearchItem } from '../types';
import { SearchIcon, XIcon, PlusIcon, ArrowRightIcon } from './icons';

interface GlobalSearchProps {
  isOpen: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onNavigate: (view: AppView) => void;
  onClose: () => void;
}

// Define the searchable items and their mapping to AppView
const SEARCH_ITEMS: SearchItem[] = [
  // --- Actions ---
  { label: 'Nova Tarefa', view: AppView.GERENCIADOR_TAREFAS, keywords: ['adicionar tarefa', 'nova tarefa', 'criar tarefa', 'task'], action: 'trigger:add-task' },
  { label: 'Lançar Cheque', view: AppView.CONTROLE_CHEQUES, keywords: ['adicionar cheque', 'novo cheque', 'lançar cheque'], action: 'trigger:add-cheque' },
  { label: 'Novo Boleto a Receber', view: AppView.GESTAO_BOLETOS, keywords: ['adicionar boleto', 'novo boleto receber', 'fatura'], action: 'trigger:add-boleto-receber' },
  { label: 'Novo Boleto a Pagar', view: AppView.CONTROLE_BOLETOS, keywords: ['adicionar conta', 'novo boleto pagar', 'despesa'], action: 'trigger:add-boleto-pagar' },
  { label: 'Nova Conta Bancária', view: AppView.CADASTRO_CONTAS_BANCARIAS, keywords: ['adicionar conta', 'nova conta', 'banco'], action: 'trigger:add-conta' },
  
  // --- Navigation ---
  { label: 'Dashboard', view: AppView.DASHBOARD, keywords: ['início', 'home', 'painel', 'resumo'] },
  { label: 'Boletos a Receber', view: AppView.GESTAO_BOLETOS, keywords: ['recebimento', 'contas a receber', 'faturas', 'crédito'] },
  { label: 'Gerenciador de Cheques', view: AppView.CONTROLE_CHEQUES, keywords: ['cheques', 'compensar', 'devolvido', 'depósito'] },
  { label: 'Boletos a Pagar', view: AppView.CONTROLE_BOLETOS, keywords: ['pagamentos', 'contas a pagar', 'despesas', 'débito'] },
  { label: 'Tarefas', view: AppView.GERENCIADOR_TAREFAS, keywords: ['lista', 'afazeres', 'pendências', 'prioridades', 'kanban'] },
  { label: 'Títulos Prorrogados', view: AppView.TITULOS_PRORROGADOS, keywords: ['prorrogação', 'vencimento', 'dívidas'] },
  { label: 'Contas Bancárias', view: AppView.CADASTRO_CONTAS_BANCARIAS, keywords: ['bancos', 'agências', 'cc', 'pix', 'cadastro'] },
  { label: 'Consulta CNPJ', view: AppView.CONSULTA_CNPJ, keywords: ['cnpj', 'receita', 'cadastro', 'situação', 'sócios'] },
  { label: 'Cartões', view: AppView.GERENCIADOR_CARTOES, keywords: ['crédito', 'mma', 'worldwide', 'adm', 'fatura'] },
  { label: 'Fechamento de Período', view: AppView.FECHAMENTO_PERIODO, keywords: ['conciliação', 'caixa', 'liquidação'] },
  { label: 'Previsão Financeira', view: AppView.PREVISAO_FINANCEIRA, keywords: ['previsão', 'futuro', 'planejamento'] },
  { label: 'Previsão - Fábrica', view: AppView.PREVISAO_FABRICA, keywords: ['previsão', 'fábrica', 'planejamento'] },
  { label: 'Previsão - Cristiano', view: AppView.PREVISAO_CRISTIANO, keywords: ['previsão', 'cristiano', 'planejamento'] },
  { label: 'Pagamentos Diários', view: AppView.PAGAMENTOS_DIARIOS, keywords: ['pagamentos', 'diário', 'movimentação'] },
  { label: 'Pagamentos - Fábrica', view: AppView.PAGAMENTOS_FABRICA, keywords: ['pagamentos', 'fábrica', 'diário'] },
  { label: 'Pagamentos - Cristiano', view: AppView.PAGAMENTOS_CRISTIANO, keywords: ['pagamentos', 'cristiano', 'diário'] },
  { label: 'Configurações', view: AppView.CONFIGURACAO_SEGURANCA, keywords: ['segurança', 'senha', 'perfil', 'tema', 'backup'] },
];

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, searchTerm, setSearchTerm, onNavigate, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Filter results based on search term
  const filteredResults = useMemo(() => {
    if (!searchTerm) {
      return [];
    }
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    
    const results = SEARCH_ITEMS.filter(item =>
      item.label.toLowerCase().includes(lowercasedSearchTerm) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(lowercasedSearchTerm))
    );

    // Prioritize Actions over Navigation
    return results.sort((a, b) => {
        if (a.action && !b.action) return -1;
        if (!a.action && b.action) return 1;
        return 0;
    }).slice(0, 10);
  }, [searchTerm]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setHighlightedIndex(-1); // Reset highlight on open
    }
  }, [isOpen]);

  const handleSelectResult = useCallback((item: SearchItem) => {
    onNavigate(item.view);
    
    if (item.action) {
        // Dispatch the custom event after a short delay to ensure the component is mounted
        setTimeout(() => {
            window.dispatchEvent(new Event(item.action!));
        }, 150);
    }
    onClose();
  }, [onNavigate, onClose]);

  // Handle keyboard navigation for results
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex(prev =>
        prev < filteredResults.length - 1 ? prev + 1 : prev
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex(prev =>
        prev > 0 ? prev - 1 : 0
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (highlightedIndex !== -1 && filteredResults[highlightedIndex]) {
        handleSelectResult(filteredResults[highlightedIndex]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }, [isOpen, filteredResults, highlightedIndex, handleSelectResult, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] animate-fade-in p-4"
      onClick={onClose} // Close when clicking outside
    >
      <div
        className="bg-card rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-down"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        role="dialog"
        aria-modal="true"
        aria-label="Busca Global"
      >
        <div className="p-6 border-b border-border flex items-center gap-4">
          <div className="relative flex-1">
            <SearchIcon className="h-5 w-5 text-text-secondary absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Digite um comando (ex: 'nova tarefa') ou busque..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-secondary border-transparent rounded-2xl text-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white placeholder-text-secondary/60 transition-all"
              aria-label="Campo de busca"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-text-secondary hover:bg-secondary hover:text-text-primary transition-colors"
            aria-label="Fechar busca"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
          {filteredResults.length > 0 ? (
            <ul role="listbox" aria-label="Resultados da busca">
              {filteredResults.map((item, index) => (
                <li key={`${item.view}-${index}`} role="option" aria-selected={highlightedIndex === index}>
                  <button
                    onClick={() => handleSelectResult(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${
                      highlightedIndex === index
                        ? 'bg-secondary text-primary'
                        : 'text-text-primary hover:bg-secondary'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${item.action ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                        {item.action ? <PlusIcon className="h-4 w-4" /> : <SearchIcon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                        <span className="font-medium">{item.label}</span>
                        {item.action && <span className="text-xs text-text-secondary ml-2 font-normal opacity-70">Ação Rápida</span>}
                    </div>
                    {highlightedIndex === index && (
                        <ArrowRightIcon className="h-4 w-4 text-text-secondary animate-pulse" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-16 text-text-secondary">
              {searchTerm ? (
                  <>
                    <SearchIcon className="w-12 h-12 mb-4 text-gray-300 mx-auto" />
                    <p className="text-lg font-medium text-text-primary">Nenhum resultado encontrado</p>
                    <p className="text-sm mt-2">Tente "nova tarefa", "cheque" ou "configurações".</p>
                  </>
              ) : (
                  <div className="flex flex-col gap-2 opacity-50">
                      <p className="text-xs font-bold uppercase tracking-wider">Sugestões</p>
                      <div className="flex flex-wrap justify-center gap-2 mt-2">
                          <span className="px-2 py-1 bg-secondary rounded-md text-xs">Nova Tarefa</span>
                          <span className="px-2 py-1 bg-secondary rounded-md text-xs">Dashboard</span>
                          <span className="px-2 py-1 bg-secondary rounded-md text-xs">Lançar Cheque</span>
                      </div>
                  </div>
              )}
            </div>
          )}
        </div>
        <div className="px-6 py-2 bg-gray-50 border-t border-border flex justify-between items-center text-[10px] text-text-secondary font-medium">
            <div className="flex gap-4">
                <span><span className="bg-white border border-gray-200 rounded px-1 py-0.5 mx-1">↑↓</span> navegar</span>
                <span><span className="bg-white border border-gray-200 rounded px-1 py-0.5 mx-1">enter</span> selecionar</span>
            </div>
            <span><span className="bg-white border border-gray-200 rounded px-1 py-0.5 mx-1">esc</span> fechar</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;