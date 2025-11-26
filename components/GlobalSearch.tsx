
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AppView, SearchItem } from '../types';
import { SearchIcon, XIcon } from './icons';

interface GlobalSearchProps {
  isOpen: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onNavigate: (view: AppView) => void;
  onClose: () => void;
}

// Define the searchable items and their mapping to AppView
const SEARCH_ITEMS: SearchItem[] = [
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
    return SEARCH_ITEMS.filter(item =>
      item.label.toLowerCase().includes(lowercasedSearchTerm) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(lowercasedSearchTerm))
    ).slice(0, 10); // Limit to 10 results for brevity
  }, [searchTerm]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setHighlightedIndex(-1); // Reset highlight on open
    }
  }, [isOpen]);

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
        onNavigate(filteredResults[highlightedIndex].view);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }, [isOpen, filteredResults, highlightedIndex, onNavigate, onClose]);

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
              placeholder="Buscar módulos, relatórios ou configurações..."
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

        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-4">
          {filteredResults.length > 0 ? (
            <ul role="listbox" aria-label="Resultados da busca">
              {filteredResults.map((item, index) => (
                <li key={item.view} role="option" aria-selected={highlightedIndex === index}>
                  <button
                    onClick={() => onNavigate(item.view)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${
                      highlightedIndex === index
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-text-primary hover:bg-secondary'
                    }`}
                  >
                    <SearchIcon className="h-5 w-5 opacity-60" />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-16 text-text-secondary">
              <SearchIcon className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-text-primary">Nenhum resultado encontrado</p>
              <p className="text-sm mt-2">Tente outra palavra-chave.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
