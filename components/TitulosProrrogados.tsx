
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, DownloadIcon, EditIcon, 
    // Add ArrowLeftIcon here
    ArrowLeftIcon, SpinnerIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

// Enum for status
enum StatusTitulo {
  PRORROGADO = 'Prorrogados',
  A_PRORROGAR = 'A Prorrogar',
}

// Data structure
interface Title {
  id: number;
  fornecedor: string;
  numeroTitulo: string;
  vencimentoOriginal: string; // YYYY-MM-DD
  devedor: string;
  novoVencimento: string; // YYYY-MM-DD
  valor: number;
  status: StatusTitulo;
}

// Helper functions for date manipulation
const formatDateToBR = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const [year, month, day] = isoDate.split('-');
    // Create a UTC date to avoid timezone issues
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.toLocaleDateString('pt-BR', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};


const formatDateToISO = (brDate: string): string => {
    if (!brDate || !/^\d{2}\/\d{2}\/\d{4}$/.test(brDate)) return '';
    const [day, month, year] = brDate.split('/');
    return `${year}-${month}-${day}`;
};

const applyDateMask = (value: string): string => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1/$2')
        .replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3')
        .replace(/(\/\d{4})\d+?$/, '$1');
};

const isValidBRDate = (dateString: string): boolean => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false;
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Mock Data
const initialTitles: Title[] = [
  { id: 1, fornecedor: 'Empresa A', numeroTitulo: 'FAT-001', vencimentoOriginal: '2024-07-15', devedor: 'Cliente X', novoVencimento: '2024-08-15', valor: 1500.75, status: StatusTitulo.PRORROGADO },
  { id: 2, fornecedor: 'Empresa B', numeroTitulo: 'NF-1234', vencimentoOriginal: '2024-07-20', devedor: 'Cliente Y', novoVencimento: '2024-08-20', valor: 850.00, status: StatusTitulo.PRORROGADO },
  { id: 3, fornecedor: 'Empresa C', numeroTitulo: 'DUP-567', vencimentoOriginal: '2024-08-01', devedor: 'Cliente Z', novoVencimento: '2024-09-01', valor: 2300.20, status: StatusTitulo.A_PRORROGAR },
  { id: 4, fornecedor: 'Empresa D', numeroTitulo: 'BOL-987', vencimentoOriginal: '2024-07-25', devedor: 'Cliente W', novoVencimento: '2024-08-10', valor: 450.50, status: StatusTitulo.A_PRORROGAR },
  { id: 5, fornecedor: 'Empresa E', numeroTitulo: 'REC-034', vencimentoOriginal: '2024-09-10', devedor: 'Cliente V', novoVencimento: '2024-10-10', valor: 5000.00, status: StatusTitulo.A_PRORROGAR },
];

type TitleForm = Omit<Title, 'id' | 'valor' | 'status' | 'vencimentoOriginal' | 'novoVencimento'> & {
    valor: number | string;
    status: StatusTitulo;
    vencimentoOriginal: string; // DD/MM/YYYY
    novoVencimento: string; // DD/MM/YYYY
};

type TitleErrors = Partial<Record<keyof Omit<Title, 'id' | 'status'>, string>>;

// The editing state will hold dates in BR format for the input fields
type EditingTitleState = Omit<Partial<Title>, 'vencimentoOriginal' | 'novoVencimento'> & {
    vencimentoOriginal?: string; // DD/MM/YYYY
    novoVencimento?: string; // DD/MM/YYYY
};


const newTitleTemplate: Omit<Title, 'id'> = {
  fornecedor: '',
  numeroTitulo: '',
  vencimentoOriginal: '', // YYYY-MM-DD
  devedor: '',
  novoVencimento: '', // YYYY-MM-DD
  valor: 0,
  status: StatusTitulo.A_PRORROGAR,
};

// Constants for pagination
const ITEMS_PER_PAGE = 20;

const TitulosProrrogados: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const STORAGE_KEY = 'titulos_prorrogados_data';

  const [titles, setTitles] = useState<Title[]>(() => {
    const savedTitles = localStorage.getItem(STORAGE_KEY);
    if (savedTitles) {
        try {
            return JSON.parse(savedTitles);
        } catch (e) {
            console.error("Failed to parse titles from localStorage", e);
            return initialTitles;
        }
    }
    return initialTitles;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(titles));
  }, [titles]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<EditingTitleState | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    action: (() => void) | null,
    message: string
  }>({ action: null, message: '' });
  const [errors, setErrors] = useState<TitleErrors>({});
  const [selectedTitles, setSelectedTitles] = useState<Set<number>>(new Set());


  // Filter states
  const [statusFilter, setStatusFilter] = useState<StatusTitulo | 'Todos'>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setSelectedTitles(new Set());
    setCurrentPage(1); // Reset page on filters change
  }, [statusFilter, searchTerm, dateRange]);

  const titlesFilteredBySearchAndDate = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return titles.filter(title => {
      const matchesSearch = (
        title.fornecedor.toLowerCase().includes(lowercasedSearchTerm) ||
        title.devedor.toLowerCase().includes(lowercasedSearchTerm) ||
        title.numeroTitulo.toLowerCase().includes(lowercasedSearchTerm)
      );
      
      const matchesDate = 
        (!dateRange.start || title.novoVencimento >= dateRange.start) &&
        (!dateRange.end || title.novoVencimento <= dateRange.end);

      return matchesSearch && matchesDate;
    });
  }, [titles, searchTerm, dateRange]);

  const filteredTitles = useMemo(() => {
    return titlesFilteredBySearchAndDate.filter(title => {
      return statusFilter === 'Todos' || title.status === statusFilter;
    });
  }, [titlesFilteredBySearchAndDate, statusFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTitles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTitles = filteredTitles.slice(startIndex, startIndex + ITEMS_PER_PAGE);


  const totals = useMemo(() => {
      const result = {
          [StatusTitulo.A_PRORROGAR]: { count: 0, value: 0 },
          [StatusTitulo.PRORROGADO]: { count: 0, value: 0 },
          total: { count: 0, value: 0 }
      };

      titlesFilteredBySearchAndDate.forEach(title => {
          if (result[title.status]) {
              result[title.status].count++;
              result[title.status].value += title.valor;
          }
          result.total.count++;
          result.total.value += title.valor;
      });
      return result;
  }, [titlesFilteredBySearchAndDate]);

  const handleClearFilters = () => {
    setStatusFilter('Todos');
    setSearchTerm('');
    setDateRange({ start: '', end: '' });
  };

  const handleExportXLSX = () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      console.error("XLSX library not loaded.");
      alert("Erro: A biblioteca de exportação não foi carregada.");
      return;
    }

    const dataToExport = filteredTitles.map(title => ({
        'Fornecedor': title.fornecedor,
        'Nº do Título': title.numeroTitulo,
        'Venc. Original': formatDateToBR(title.vencimentoOriginal),
        'Devedor': title.devedor,
        'Novo Vencimento': formatDateToBR(title.novoVencimento),
        'Valor': title.valor,
        'Status': title.status,
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Títulos');

    XLSX.writeFile(workbook, `titulos_prorrogados_${new Date().toISOString().slice(0,10)}.xlsx`);
};

  const handleRowClick = (title: Title) => {
    setErrors({});
    // Convert dates to BR format for editing
    setEditingTitle({ 
        ...title,
        vencimentoOriginal: formatDateToBR(title.vencimentoOriginal),
        novoVencimento: formatDateToBR(title.novoVencimento),
    });
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setErrors({});
    setEditingTitle({ ...newTitleTemplate, vencimentoOriginal: '', novoVencimento: '' });
    setIsModalOpen(true);
  };
  
  const handleSelectTitle = (id: number) => {
    const newSelection = new Set(selectedTitles);
    if (newSelection.has(id)) {
        newSelection.delete(id);
    } else {
        newSelection.add(id);
    }
    setSelectedTitles(newSelection);
  };

  const handleSelectAll = () => {
    if (filteredTitles.length > 0 && selectedTitles.size === filteredTitles.length) {
        setSelectedTitles(new Set());
    } else {
        setSelectedTitles(new Set(filteredTitles.map(t => t.id)));
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, titleId: number) => {
    e.stopPropagation();
    const action = () => {
      setTitles(titles.filter(t => t.id !== titleId));
    };
    setConfirmAction({
      action,
      message: 'Você tem certeza que deseja excluir este título permanentemente?'
    });
    setIsConfirmOpen(true);
  };

  const handleDeleteSelectedClick = () => {
    const action = () => {
        setTitles(titles.filter(t => !selectedTitles.has(t.id)));
        setSelectedTitles(new Set());
    };
    setConfirmAction({
        action,
        message: `Você tem certeza que deseja excluir os ${selectedTitles.size} títulos selecionados?`
    });
    setIsConfirmOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTitle(null);
    setErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editingTitle) {
      const { name, value } = e.target;

      if (name === 'valor') {
        let numericValue = value.replace(/\D/g, '');
        if (numericValue === '') numericValue = '0';
        const numberValue = Number(numericValue) / 100;
        
        setEditingTitle({
          ...editingTitle,
          valor: numberValue,
        });
      } else if (name === 'vencimentoOriginal' || name === 'novoVencimento') {
          setEditingTitle({
              ...editingTitle,
              [name]: applyDateMask(value),
          });
      }
      else {
         setEditingTitle({
           ...editingTitle,
           [name]: value,
         });
      }
       // Clear error on change
      if (errors[name as keyof TitleErrors]) {
          setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors[name as keyof TitleErrors];
              return newErrors;
          });
      }
    }
  };
  
  const validateField = (name: keyof TitleErrors, value: any): string | undefined => {
    switch (name) {
        case 'fornecedor':
        case 'numeroTitulo':
        case 'devedor':
            return !value?.trim() ? `${name.charAt(0).toUpperCase() + name.slice(1)} é obrigatório.` : undefined;
        case 'vencimentoOriginal':
        case 'novoVencimento':
            if (!value) return 'Data é obrigatória.';
            if (!isValidBRDate(value)) return 'Data inválida. Use DD/MM/AAAA.';
            return undefined;
        case 'valor':
            return !value || value <= 0 ? 'O Valor deve ser maior que zero.' : undefined;
        default:
            return undefined;
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (editingTitle) {
        const { name, value } = e.target as { name: keyof TitleErrors; value: any };
        const error = validateField(name, value);
        if (error) {
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    }
  };


  const validate = (): boolean => {
    if (!editingTitle) return false;
    
    const newErrors: TitleErrors = {};
    const fieldsToValidate: (keyof TitleErrors)[] = ['fornecedor', 'numeroTitulo', 'devedor', 'vencimentoOriginal', 'novoVencimento', 'valor'];
    
    fieldsToValidate.forEach(field => {
        const error = validateField(field, editingTitle[field as keyof EditingTitleState]);
        if (error) {
            newErrors[field] = error;
        }
    });

    if (!newErrors.novoVencimento && !newErrors.vencimentoOriginal && editingTitle.vencimentoOriginal && editingTitle.novoVencimento) {
        const originalDate = new Date(formatDateToISO(editingTitle.vencimentoOriginal));
        const newDate = new Date(formatDateToISO(editingTitle.novoVencimento));
        if (newDate <= originalDate) {
            newErrors.novoVencimento = 'Novo Vencimento deve ser após o Vencimento Original.';
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveChanges = () => {
    if (!validate()) {
        return;
    }

    if (!editingTitle || !editingTitle.vencimentoOriginal || !editingTitle.novoVencimento) return;
    
    // Convert dates back to ISO before saving
    const titleToSave = {
        ...editingTitle,
        vencimentoOriginal: formatDateToISO(editingTitle.vencimentoOriginal),
        novoVencimento: formatDateToISO(editingTitle.novoVencimento),
    };

    if (editingTitle.id) { // Editing existing title
        const action = () => {
            setTitles(titles.map(t => t.id === titleToSave.id ? (titleToSave as Title) : t));
            handleCloseModal();
        };
        setConfirmAction({ 
            action, 
            message: 'Você tem certeza que deseja salvar as alterações?'
        });
    } else { // Adding new title
        const action = () => {
            const newId = Date.now();
            const newCompleteTitle: Title = { ...newTitleTemplate, ...titleToSave, id: newId };
            setTitles([...titles, newCompleteTitle]);
            handleCloseModal();
        };
        setConfirmAction({ 
            action, 
            message: 'Você tem certeza que deseja adicionar este novo título?'
        });
    }
    setIsConfirmOpen(true);
  };
  
  const handleConfirm = () => {
      if(confirmAction.action) {
          confirmAction.action();
      }
      setIsConfirmOpen(false);
      setConfirmAction({ action: null, message: '' });
  }
  
  const handleCancelConfirm = () => {
      setIsConfirmOpen(false);
      setConfirmAction({ action: null, message: '' });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add onBack button here */}
           {onBack && (
              <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10">
                  <ArrowLeftIcon className="h-5 w-5" />
                  Voltar
              </button>
            )}
           <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
            Gerenciar Títulos Prorrogados
           </h2>
            {selectedTitles.size > 0 && (
                <button
                    onClick={handleDeleteSelectedClick}
                    className="flex items-center gap-2 bg-danger text-white font-semibold py-2 px-4 rounded-full hover:bg-danger/90 transition-colors duration-300 h-9"
                >
                    <TrashIcon className="h-4 w-4" />
                    Apagar ({selectedTitles.size})
                </button>
            )}
           <button 
             onClick={handleOpenAddModal}
             className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors duration-300 h-9 shadow-sm"
           >
             <PlusIcon className="h-4 w-4" />
             Adicionar Título
           </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleExportXLSX} className="flex items-center gap-2 bg-white border border-border text-text-primary font-semibold py-2 px-4 rounded-full hover:bg-secondary transition-colors duration-300 h-9">
                <DownloadIcon className="h-4 w-4" /> Exportar XLSX
            </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div onClick={() => setStatusFilter(StatusTitulo.A_PRORROGAR)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${statusFilter === StatusTitulo.A_PRORROGAR ? 'border-warning bg-warning/5 ring-1 ring-warning' : 'border-border bg-card hover:border-gray-300'}`}>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">A Prorrogar</p>
                <p className="text-xl font-bold text-warning">{formatCurrency(totals[StatusTitulo.A_PRORROGAR]?.value || 0)}</p>
                <p className="text-xs text-text-secondary mt-1">{totals[StatusTitulo.A_PRORROGAR]?.count || 0} títulos</p>
            </div>
            <div onClick={() => setStatusFilter(StatusTitulo.PRORROGADO)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${statusFilter === StatusTitulo.PRORROGADO ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:border-gray-300'}`}>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Prorrogados</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(totals[StatusTitulo.PRORROGADO]?.value || 0)}</p>
                <p className="text-xs text-text-secondary mt-1">{totals[StatusTitulo.PRORROGADO]?.count || 0} títulos</p>
            </div>
            <div onClick={() => setStatusFilter('Todos')} className={`p-4 rounded-2xl border cursor-pointer transition-all ${statusFilter === 'Todos' ? 'border-gray-400 bg-gray-50 ring-1 ring-gray-300 dark:bg-slate-800 dark:border-slate-600' : 'border-border bg-card hover:border-gray-300'}`}>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Total Geral</p>
                <p className="text-xl font-bold text-text-primary">{formatCurrency(totals.total.value)}</p>
                <p className="text-xs text-text-secondary mt-1">{totals.total.count} títulos</p>
            </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 bg-white p-3 rounded-2xl border border-border">
        <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
            <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 pl-10 pr-3 py-2 bg-white border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors h-9"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-4 w-4 text-text-secondary" />
            </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <div className="relative">
                <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value as StatusTitulo | 'Todos')}
                    className="bg-white border border-border rounded-xl px-3 py-1.5 pr-8 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none h-9"
                >
                    <option value="Todos">Todos os Status</option>
                    <option value={StatusTitulo.A_PRORROGAR}>{StatusTitulo.A_PRORROGAR}</option>
                    <option value={StatusTitulo.PRORROGADO}>{StatusTitulo.PRORROGADO}</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-text-secondary">
                    <ChevronDownIcon className="h-4 w-4" />
                </div>
            </div>

            <div className="flex items-center gap-2 bg-secondary rounded-xl px-2 border border-border h-9">
                <span className="text-xs font-medium text-text-secondary whitespace-nowrap">Novo Venc.:</span>
                <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-transparent border-none p-0 text-sm text-text-primary focus:ring-0 w-24"/>
                <span className="text-xs text-text-secondary">-</span>
                <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-transparent border-none p-0 text-sm text-text-primary focus:ring-0 w-24"/>
            </div>

            <button onClick={handleClearFilters} className="px-3 py-1.5 rounded-full bg-secondary hover:bg-gray-200 text-text-primary font-medium text-sm h-9 transition-colors">Limpar</button>
        </div>
      </div>

      <div className="bg-card shadow-sm rounded-2xl overflow-hidden flex flex-col flex-grow border border-border">
        <div className="overflow-x-auto overflow-y-auto flex-grow">
            <table className="min-w-full divide-y divide-border text-sm text-left">
            <thead className="bg-secondary text-xs uppercase font-medium text-text-secondary sticky top-0 z-10">
                <tr>
                <th className="px-6 py-3">
                    <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        checked={filteredTitles.length > 0 && selectedTitles.size === filteredTitles.length}
                        onChange={handleSelectAll}
                    />
                </th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Fornecedor</th>
                <th className="px-6 py-3">Nº Título</th>
                <th className="px-6 py-3">Venc. Original</th>
                <th className="px-6 py-3">Devedor</th>
                <th className="px-6 py-3">Novo Vencimento</th>
                <th className="px-6 py-3 text-right">Valor</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
                {paginatedTitles.length > 0 ? (
                paginatedTitles.map((title) => (
                    <tr 
                        key={title.id} 
                        className={`hover:bg-secondary transition-colors cursor-pointer ${selectedTitles.has(title.id) ? 'bg-primary/5' : ''}`}
                        onClick={() => handleRowClick(title)}
                    >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                            type="checkbox" 
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            checked={selectedTitles.has(title.id)}
                            onChange={() => handleSelectTitle(title.id)}
                        />
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${
                        title.status === StatusTitulo.A_PRORROGAR 
                            ? 'bg-warning/20 text-warning border-warning/30' 
                            : 'bg-primary/20 text-primary border-primary/30'
                        }`}>
                        {title.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{title.fornecedor}</td>
                    <td className="px-6 py-4 text-text-secondary whitespace-nowrap">{title.numeroTitulo}</td>
                    <td className="px-6 py-4 text-text-secondary whitespace-nowrap">{formatDateToBR(title.vencimentoOriginal)}</td>
                    <td className="px-6 py-4 text-text-secondary whitespace-nowrap">{title.devedor}</td>
                    <td className="px-6 py-4 text-text-secondary whitespace-nowrap">{formatDateToBR(title.novoVencimento)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-text-primary whitespace-nowrap">
                        {formatCurrency(title.valor)}
                    </td>
                    </tr>
                ))
                ) : (
                <tr>
                    <td colSpan={8} className="text-center py-16">
                        <div className="flex flex-col items-center justify-center text-text-secondary">
                            <SearchIcon className="w-10 h-10 mb-4 text-gray-300" />
                            <h3 className="text-lg font-medium text-text-primary">Nenhum Título Encontrado</h3>
                            <p className="mt-1">Tente ajustar os filtros ou adicione um novo título.</p>
                        </div>
                    </td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
        {/* Pagination Footer */}
        <div className="flex justify-between items-center p-4 border-t border-border bg-card rounded-b-2xl">
            <div className="text-sm text-text-secondary">
                Exibindo {filteredTitles.length > 0 ? startIndex + 1 : 0} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredTitles.length)} de {filteredTitles.length} registros
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Página Anterior"
                >
                    <ChevronLeftIcon className="h-5 w-5 text-text-primary" />
                </button>
                <span className="text-sm font-medium text-text-primary">Página {currentPage} de {Math.max(1, totalPages)}</span>
                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-2 rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Próxima Página"
                >
                    <ChevronRightIcon className="h-5 w-5 text-text-primary" />
                </button>
            </div>
        </div>
      </div>

      {isModalOpen && editingTitle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 overflow-visible">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-text-primary">{editingTitle.id ? 'Editar Título' : 'Novo Título'}</h3>
                {editingTitle.id && (
                    <button 
                        onClick={(e) => handleDeleteClick(e, editingTitle.id!)} 
                        className="text-danger hover:bg-danger/10 p-2 rounded-full transition-colors"
                        title="Excluir Título"
                    >
                        <TrashIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Fornecedor</label>
                    <input name="fornecedor" value={editingTitle.fornecedor || ''} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.fornecedor ? 'border-danger' : ''}`} />
                    {errors.fornecedor && <p className="text-danger text-xs mt-1 ml-1">{errors.fornecedor}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Nº Título</label>
                        <input name="numeroTitulo" value={editingTitle.numeroTitulo || ''} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.numeroTitulo ? 'border-danger' : ''}`} />
                        {errors.numeroTitulo && <p className="text-danger text-xs mt-1 ml-1">{errors.numeroTitulo}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Valor</label>
                        <input name="valor" value={formatCurrency(Number(editingTitle.valor || 0))} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.valor ? 'border-danger' : ''}`} />
                        {errors.valor && <p className="text-danger text-xs mt-1 ml-1">{errors.valor}</p>}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Devedor</label>
                    <input name="devedor" value={editingTitle.devedor || ''} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.devedor ? 'border-danger' : ''}`} />
                    {errors.devedor && <p className="text-danger text-xs mt-1 ml-1">{errors.devedor}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Venc. Original</label>
                        <input name="vencimentoOriginal" value={editingTitle.vencimentoOriginal || ''} onChange={handleInputChange} onBlur={handleBlur} placeholder="DD/MM/AAAA" className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.vencimentoOriginal ? 'border-danger' : ''}`} />
                        {errors.vencimentoOriginal && <p className="text-danger text-xs mt-1 ml-1">{errors.vencimentoOriginal}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Novo Vencimento</label>
                        <input name="novoVencimento" value={editingTitle.novoVencimento || ''} onChange={handleInputChange} onBlur={handleBlur} placeholder="DD/MM/AAAA" className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.novoVencimento ? 'border-danger' : ''}`} />
                        {errors.novoVencimento && <p className="text-danger text-xs mt-1 ml-1">{errors.novoVencimento}</p>}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Status</label>
                    <div className="relative">
                        <select name="status" value={editingTitle.status || StatusTitulo.A_PRORROGAR} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 appearance-none">
                            <option value={StatusTitulo.A_PRORROGAR}>{StatusTitulo.A_PRORROGAR}</option>
                            <option value={StatusTitulo.PRORROGADO}>{StatusTitulo.PRORROGADO}</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-text-secondary"><ChevronDownIcon className="h-4 w-4" /></div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-3 mt-8">
              <button onClick={handleCloseModal} className="px-6 py-3 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={handleSaveChanges} className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <h3 className="text-xl font-bold mb-4 text-text-primary">Confirmar</h3>
            <p className="text-text-secondary mb-8">{confirmAction.message}</p>
            <div className="flex justify-center gap-4">
              <button onClick={handleCancelConfirm} className="px-6 py-2.5 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={handleConfirm} className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TitulosProrrogados;
