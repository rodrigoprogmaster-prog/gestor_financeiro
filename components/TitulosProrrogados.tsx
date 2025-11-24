import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, DownloadIcon, EditIcon, ArrowLeftIcon, SpinnerIcon } from './icons';

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

// Constants for infinite scroll
const ITEMS_PER_LOAD = 20;
const SCROLL_THRESHOLD = 100; // pixels from the bottom to trigger loading

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
  // Fix: Initialize selectedTitles state correctly with useState
  const [selectedTitles, setSelectedTitles] = useState<Set<number>>(new Set());


  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Infinite scroll states
  const scrollRef = useRef<HTMLDivElement>(null);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setSelectedTitles(new Set());
  }, [statusFilter, searchTerm]);

  const filteredTitles = useMemo(() => {
    setDisplayCount(ITEMS_PER_LOAD); // Reset display count on filter change
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return titles.filter(title => {
      const statusMatch = statusFilter === 'Todos' || title.status === statusFilter;
      const searchMatch =
        title.fornecedor.toLowerCase().includes(lowercasedSearchTerm) ||
        title.devedor.toLowerCase().includes(lowercasedSearchTerm) ||
        title.numeroTitulo.toLowerCase().includes(lowercasedSearchTerm);
      return statusMatch && searchMatch;
    });
  }, [titles, statusFilter, searchTerm]);

  const totalValor = useMemo(() => {
    return filteredTitles.reduce((acc, title) => acc + title.valor, 0);
  }, [filteredTitles]);

  const handleClearFilters = () => {
    setStatusFilter('Todos');
    setSearchTerm('');
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

    // Add a totals row at the bottom
    XLSX.utils.sheet_add_aoa(worksheet, [
        ['', '', '', '', 'Total:', totalValor]
    ], { origin: -1 });

    // Set number format for the 'Valor' column
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) { // +1 to skip header
        const cell_address = { c: 5, r: R }; // Column F (Valor)
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        if (worksheet[cell_ref]) {
            worksheet[cell_ref].t = 'n';
            worksheet[cell_ref].z = 'R$ #,##0.00';
        }
    }

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

  const handleScroll = () => {
    if (scrollRef.current) {
        const { scrollTop, clientHeight, scrollHeight } = scrollRef.current;
        if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD && !isLoadingMore && displayCount < filteredTitles.length) {
            setIsLoadingMore(true);
            setTimeout(() => {
                setDisplayCount(prevCount => Math.min(prevCount + ITEMS_PER_LOAD, filteredTitles.length));
                setIsLoadingMore(false);
            }, 300); // Simulate network delay
        }
    }
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          
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
             <PlusIcon className="h-4 w-4"/>
             Adicionar Título
           </button>
           <button
            onClick={handleExportXLSX}
            className="flex items-center gap-2 bg-white border border-border text-text-primary font-semibold py-2 px-4 rounded-full hover:bg-secondary transition-colors duration-300 h-9"
            aria-label="Exportar para XLSX"
          >
            <DownloadIcon className="h-4 w-4" />
            Exportar XLSX
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <input 
                type="text" 
                placeholder="Buscar por Fornecedor, Devedor, Nº Título..."
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="bg-white border border-border rounded-xl px-3 py-2 pl-10 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9 w-full sm:w-64"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-text-secondary" />
              </div>
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9">
                <option value="Todos">Todos Status</option>
                <option value={StatusTitulo.PRORROGADO}>Prorrogados</option>
                <option value={StatusTitulo.A_PRORROGAR}>A Prorrogar</option>
            </select>
            <button onClick={handleClearFilters} className="py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-9">Limpar</button>
        </div>
      </div>
       <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card p-4 rounded-2xl shadow-sm border border-border text-center">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Valor Total</p>
          <p className="text-xl font-bold text-primary">{totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
        <div className="bg-card p-4 rounded-2xl shadow-sm border border-border text-center">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Títulos</p>
          <p className="text-xl font-bold text-primary">{filteredTitles.length}</p>
        </div>
      </div>
      <div className="bg-card shadow-sm rounded-2xl overflow-hidden flex-grow border border-border">
        <div ref={scrollRef} onScroll={handleScroll} className="overflow-x-auto overflow-y-auto h-full">
            <table className="min-w-full divide-y divide-border text-sm text-left text-text-secondary">
            <thead className="bg-secondary text-xs text-text-secondary uppercase font-medium tracking-wider sticky top-0">
                <tr>
                <th scope="col" className="px-6 py-3">
                    <input
                        type="checkbox"
                        className="h-4 w-4 text-primary bg-white border-border rounded focus:ring-primary"
                        checked={filteredTitles.length > 0 && selectedTitles.size === filteredTitles.length}
                        onChange={handleSelectAll}
                        aria-label="Selecionar todos os títulos"
                    />
                </th>
                <th scope="col" className="px-6 py-3">Fornecedor</th>
                <th scope="col" className="px-6 py-3">Nº do Título</th>
                <th scope="col" className="px-6 py-3">Venc. Original</th>
                <th scope="col" className="px-6 py-3">Devedor</th>
                <th scope="col" className="px-6 py-3">Novo Vencimento</th>
                <th scope="col" className="px-6 py-3 text-right">Valor</th>
                <th scope="col" className="px-6 py-3 text-center">Status</th>
                <th scope="col" className="px-6 py-3 text-center">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
                {filteredTitles.length > 0 ? (
                filteredTitles.slice(0, displayCount).map((title) => (
                    <tr
                    key={title.id}
                    className={`bg-card border-b border-border hover:bg-secondary transition-colors duration-200 ${selectedTitles.has(title.id) ? 'bg-primary/10' : ''}`}
                    >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            className="h-4 w-4 text-primary bg-white border-border rounded focus:ring-primary"
                            checked={selectedTitles.has(title.id)}
                            onChange={() => handleSelectTitle(title.id)}
                            aria-label={`Selecionar título de ${title.fornecedor}`}
                        />
                    </td>
                    <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{title.fornecedor}</td>
                    <td className="px-6 py-4 text-text-secondary">{title.numeroTitulo}</td>
                    <td className="px-6 py-4 text-text-secondary">{formatDateToBR(title.vencimentoOriginal)}</td>
                    <td className="px-6 py-4 text-text-secondary">{title.devedor}</td>
                    <td className="px-6 py-4 font-semibold text-warning whitespace-nowrap">{formatDateToBR(title.novoVencimento)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-text-primary whitespace-nowrap">{title.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${
                        title.status === StatusTitulo.PRORROGADO 
                        ? 'bg-success/20 text-success border-success/30' 
                        : 'bg-warning/20 text-warning border-warning/30'
                        }`}>
                        {title.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowClick(title);
                                }} 
                                className="text-primary hover:text-primary/80 p-1.5 rounded-full hover:bg-primary/10 transition-colors"
                                aria-label="Editar título"
                            >
                                <EditIcon className="h-4 w-4"/>
                            </button>
                            <button 
                                onClick={(e) => handleDeleteClick(e, title.id)} 
                                className="text-danger hover:text-danger/80 p-1.5 rounded-full hover:bg-danger/10 transition-colors"
                                aria-label="Excluir título"
                            >
                                <TrashIcon className="h-4 w-4"/>
                            </button>
                        </div>
                    </td>
                    </tr>
                ))
                ) : (
                <tr>
                    <td colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center text-text-secondary">
                        <SearchIcon className="w-10 h-10 mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-text-primary">Nenhum Título Encontrado</h3>
                        <p className="text-sm mt-1">Tente ajustar seus filtros de busca ou adicione um novo título.</p>
                    </div>
                    </td>
                </tr>
                )}
                {isLoadingMore && (
                    <tr>
                        <td colSpan={9} className="text-center py-4 text-primary">
                            <SpinnerIcon className="h-5 w-5 animate-spin mx-auto" />
                            Carregando mais...
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {isModalOpen && editingTitle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-secondary/30">
                <h3 className="text-lg font-bold text-text-primary">{editingTitle.id ? 'Editar Título' : 'Adicionar Novo Título'}</h3>
            </div>
            <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="fornecedor" className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Fornecedor <span className="text-danger">*</span></label>
                  <input id="fornecedor" type="text" name="fornecedor" value={editingTitle.fornecedor || ''} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-white border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 h-9 ${errors.fornecedor ? 'border-danger focus:ring-danger focus:border-danger' : 'border-border focus:ring-primary'}`}/>
                  {errors.fornecedor && <p className="text-danger text-xs mt-1">{errors.fornecedor}</p>}
                </div>
                <div>
                  <label htmlFor="numeroTitulo" className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Número do Título <span className="text-danger">*</span></label>
                  <input id="numeroTitulo" type="text" name="numeroTitulo" value={editingTitle.numeroTitulo || ''} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-white border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 h-9 ${errors.numeroTitulo ? 'border-danger focus:ring-danger focus:border-danger' : 'border-border focus:ring-primary'}`}/>
                  {errors.numeroTitulo && <p className="text-danger text-xs mt-1">{errors.numeroTitulo}</p>}
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="vencimentoOriginal" className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Venc. Original <span className="text-danger">*</span></label>
                        <input id="vencimentoOriginal" type="text" name="vencimentoOriginal" value={editingTitle.vencimentoOriginal || ''} onChange={handleInputChange} onBlur={handleBlur} placeholder="DD/MM/AAAA" maxLength={10} className={`w-full bg-white border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 h-9 ${errors.vencimentoOriginal ? 'border-danger focus:ring-danger focus:border-danger' : 'border-border focus:ring-primary'}`}/>
                        {errors.vencimentoOriginal && <p className="text-danger text-xs mt-1">{errors.vencimentoOriginal}</p>}
                    </div>
                    <div>
                        <label htmlFor="novoVencimento" className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Novo Vencimento <span className="text-danger">*</span></label>
                        <input id="novoVencimento" type="text" name="novoVencimento" value={editingTitle.novoVencimento || ''} onChange={handleInputChange} onBlur={handleBlur} placeholder="DD/MM/AAAA" maxLength={10} className={`w-full bg-white border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 h-9 ${errors.novoVencimento ? 'border-danger focus:ring-danger focus:border-danger' : 'border-border focus:ring-primary'}`}/>
                        {errors.novoVencimento && <p className="text-danger text-xs mt-1">{errors.novoVencimento}</p>}
                    </div>
                </div>
                 <div>
                  <label htmlFor="devedor" className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Devedor <span className="text-danger">*</span></label>
                  <input id="devedor" type="text" name="devedor" value={editingTitle.devedor || ''} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-white border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 h-9 ${errors.devedor ? 'border-danger focus:ring-danger focus:border-danger' : 'border-border focus:ring-primary'}`}/>
                  {errors.devedor && <p className="text-danger text-xs mt-1">{errors.devedor}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="valor" className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Valor (R$) <span className="text-danger">*</span></label>
                        <input id="valor" type="text" name="valor" value={editingTitle.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || ''} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-white border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 h-9 ${errors.valor ? 'border-danger focus:ring-danger focus:border-danger' : 'border-border focus:ring-primary'}`}/>
                        {errors.valor && <p className="text-danger text-xs mt-1">{errors.valor}</p>}
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Status</label>
                        <select id="status" name="status" value={editingTitle.status} onChange={handleInputChange} className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9">
                            <option value={StatusTitulo.A_PRORROGAR}>A Prorrogar</option>
                            <option value={StatusTitulo.PRORROGADO}>Prorrogados</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="px-6 py-4 border-t border-border bg-secondary/30 flex justify-end gap-3">
                <button onClick={handleCloseModal} className="py-2 px-4 rounded-full bg-white border border-border text-text-primary text-sm font-medium hover:bg-secondary transition-colors">Cancelar</button>
                <button onClick={handleSaveChanges} className="py-2 px-4 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-sm">
                    {editingTitle.id ? 'Salvar Alterações' : 'Adicionar Título'}
                </button>
            </div>
          </div>
        </div>
      )}
      
      {isConfirmOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-sm p-6">
                    <h3 className="text-lg font-bold mb-2 text-text-primary">Confirmar Ação</h3>
                    <p className="text-sm text-text-secondary mb-6">{confirmAction.message}</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={handleCancelConfirm} className="px-4 py-2 rounded-full bg-white border border-border text-text-primary text-sm font-medium hover:bg-secondary transition-colors">Cancelar</button>
                        <button onClick={handleConfirm} className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-colors">Confirmar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default TitulosProrrogados;