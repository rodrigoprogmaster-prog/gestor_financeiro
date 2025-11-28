
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, DownloadIcon, EditIcon, UploadIcon, CheckIcon, ArrowLeftIcon, SpinnerIcon, ChevronDownIcon, RefreshIcon, ClipboardCheckIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import AutocompleteInput from './AutocompleteInput';
import GerenciadorNotasFiscais from './GerenciadorNotasFiscais';
import DatePicker from './DatePicker';
import CustomSelect from './CustomSelect';

enum StatusBoleto {
  A_VENCER = 'A Vencer',
  LANCADO_SOLINTER = 'Lançado no Solinter',
  VENCIDO = 'Vencido',
  PAGO = 'Pago',
}

interface Boleto {
  id: string;
  fornecedor: string;
  pagador: string;
  vencimento: string; // YYYY-MM-DD
  valor: number;
  pago: boolean;
  lancadoSolinter?: boolean;
}

interface DespesaRecorrente {
    id: string;
    empresa: string;
    descricao: string;
    diaVencimento: string; // Changed to string to support "DD" or "DD/MM"
    recorrencia: string; // 'Mensal', 'Semanal', etc.
    status: 'Lançado' | 'Pendente';
}

type BoletoErrors = Partial<Record<keyof Omit<Boleto, 'id' | 'pago'>, string>>;
type DespesaErrors = Partial<Record<keyof Omit<DespesaRecorrente, 'id' | 'status'>, string>>;

const formatDateToBR = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const [year, month, day] = isoDate.split('-');
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ITEMS_PER_PAGE = 20;

type SortConfig = { key: keyof Boleto | 'dynamicStatus'; direction: 'asc' | 'desc' };

const BoletosAPagar: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const STORAGE_KEY = 'boletos_a_pagar_data';
    const STORAGE_KEY_RECORRENTES = 'despesas_recorrentes_data';

    const [activeView, setActiveView] = useState<'boletos' | 'recorrentes' | 'notas_fiscais'>('boletos');

    const [boletos, setBoletos] = useState<Boleto[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Erro ao carregar boletos:", e);
            return [];
        }
    });

    const [despesasRecorrentes, setDespesasRecorrentes] = useState<DespesaRecorrente[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_RECORRENTES);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Erro ao carregar despesas recorrentes:", e);
            return [];
        }
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    
    const [editingBoleto, setEditingBoleto] = useState<Partial<Boleto> | null>(null);
    const [boletoErrors, setBoletoErrors] = useState<BoletoErrors>({});
    
    // Default filter set to 'Todos' to show data immediately
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusBoleto | 'Todos'>('Todos');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const [editingDespesa, setEditingDespesa] = useState<Partial<DespesaRecorrente> | null>(null);
    const [despesaErrors, setDespesaErrors] = useState<DespesaErrors>({});
    
    // Filters for Recorrentes
    const [recorrentesFilters, setRecorrentesFilters] = useState({
        empresa: '',
        descricao: '',
        diaMes: '',
        status: ''
    });

    const uniqueFornecedores = useMemo(() => [...new Set(boletos.map(b => b.fornecedor).filter(Boolean))].sort(), [boletos]);
    const uniquePagadores = useMemo(() => [...new Set(boletos.map(b => b.pagador).filter(Boolean))].sort(), [boletos]);
    const uniqueEmpresasRecorrentes = useMemo(() => [...new Set(despesasRecorrentes.map(d => d.empresa).filter(Boolean))].sort(), [despesasRecorrentes]);
    const uniqueDescricoesRecorrentes = useMemo(() => [...new Set(despesasRecorrentes.map(d => d.descricao).filter(Boolean))].sort(), [despesasRecorrentes]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(boletos));
    }, [boletos]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_RECORRENTES, JSON.stringify(despesasRecorrentes));
    }, [despesasRecorrentes]);

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchTerm, dateRange, sortConfig, activeView]);

    const getDynamicStatus = useMemo(() => (boleto: Boleto): StatusBoleto => {
        if (boleto.pago) return StatusBoleto.PAGO;
        if (boleto.lancadoSolinter) return StatusBoleto.LANCADO_SOLINTER;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(boleto.vencimento + 'T00:00:00');
        return vencimento < hoje ? StatusBoleto.VENCIDO : StatusBoleto.A_VENCER;
    }, []);
    
    const allBoletosWithStatus = useMemo(() => boletos.map(b => ({ ...b, dynamicStatus: getDynamicStatus(b) })), [boletos, getDynamicStatus]);

    const filteredBoletos = useMemo(() => {
        const filtered = allBoletosWithStatus.filter(boleto => {
            const statusMatch = statusFilter === 'Todos' || boleto.dynamicStatus === statusFilter;
            const searchMatch = !searchTerm || boleto.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) || boleto.pagador.toLowerCase().includes(searchTerm.toLowerCase());
            const startDateMatch = !dateRange.start || boleto.vencimento >= dateRange.start;
            const endDateMatch = !dateRange.end || boleto.vencimento <= dateRange.end;
            return statusMatch && searchMatch && startDateMatch && endDateMatch;
        });

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'asc' 
                        ? aValue.localeCompare(bValue, undefined, { sensitivity: 'base' }) 
                        : bValue.localeCompare(aValue, undefined, { sensitivity: 'base' });
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            filtered.sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
        }

        return filtered;
    }, [allBoletosWithStatus, statusFilter, searchTerm, dateRange, sortConfig]);

    // Calculate totals for cards
    const totals = useMemo(() => {
        return allBoletosWithStatus.reduce((acc, boleto) => {
            const searchMatch = !searchTerm || boleto.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) || boleto.pagador.toLowerCase().includes(searchTerm.toLowerCase());
            const startDateMatch = !dateRange.start || boleto.vencimento >= dateRange.start;
            const endDateMatch = !dateRange.end || boleto.vencimento <= dateRange.end;
            
            // Only count items that match search/date criteria, ignoring status filter
            if (searchMatch && startDateMatch && endDateMatch) {
                const status = boleto.dynamicStatus;
                if (!acc[status]) acc[status] = { count: 0, value: 0 };
                acc[status].count++;
                acc[status].value += boleto.valor;
            }
            return acc;
        }, {} as Record<StatusBoleto, { count: number; value: number }>);
    }, [allBoletosWithStatus, searchTerm, dateRange]);

    const totalPages = Math.ceil(filteredBoletos.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedBoletos = filteredBoletos.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // -- Recorrentes Logic --
    const filteredRecorrentes = useMemo(() => {
        return despesasRecorrentes.filter(item => {
            const empresaMatch = !recorrentesFilters.empresa || item.empresa.toLowerCase().includes(recorrentesFilters.empresa.toLowerCase());
            const descricaoMatch = !recorrentesFilters.descricao || item.descricao.toLowerCase().includes(recorrentesFilters.descricao.toLowerCase());
            const statusMatch = !recorrentesFilters.status || item.status === recorrentesFilters.status;
            
            // Filter by "Dia/Mês" string inclusion (e.g. searching "5" matches "05" and "15")
            // Safe conversion to string to prevent crash on legacy data
            const diaMatch = !recorrentesFilters.diaMes || String(item.diaVencimento || '').includes(recorrentesFilters.diaMes);

            return empresaMatch && descricaoMatch && diaMatch && statusMatch;
        }).sort((a, b) => {
            // Sort by day component. "05" -> 5, "05/10" -> 5.
            const getDayValue = (val: any) => {
                if (!val) return 0;
                const strVal = String(val);
                const parts = strVal.split('/');
                return parseInt(parts[0], 10) || 0;
            };
            const dayA = getDayValue(a.diaVencimento);
            const dayB = getDayValue(b.diaVencimento);
            
            if (dayA !== dayB) return dayA - dayB;
            return a.empresa.localeCompare(b.empresa);
        });
    }, [despesasRecorrentes, recorrentesFilters]);

    const requestSort = (key: keyof Boleto | 'dynamicStatus') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (key: keyof Boleto | 'dynamicStatus') => {
        if (sortConfig?.key === key) {
            return <ChevronDownIcon className={`h-4 w-4 inline-block ml-1 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />;
        }
        return null;
    };

    const handleOpenAddModal = () => {
        if (activeView === 'boletos') {
            setBoletoErrors({});
            setEditingBoleto({ vencimento: '', pago: false, lancadoSolinter: false });
        } else {
            setDespesaErrors({});
            setEditingDespesa({ diaVencimento: '', recorrencia: 'Mensal', status: 'Pendente' });
        }
        setIsModalOpen(true);
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === '+') {
                event.preventDefault();
                handleOpenAddModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeView]);

    const handleEditClick = (item: any) => {
        if (activeView === 'boletos') {
            setBoletoErrors({});
            setEditingBoleto({ ...item });
        } else {
            setDespesaErrors({});
            setEditingDespesa({ ...item });
        }
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        const action = () => {
            if (activeView === 'boletos') {
                setBoletos(boletos.filter(b => b.id !== id));
            } else {
                setDespesasRecorrentes(despesasRecorrentes.filter(d => d.id !== id));
            }
        };
        setConfirmAction({ action, message: 'Tem certeza que deseja excluir?' });
        setIsConfirmOpen(true);
    };

    const handleToggleRecorrenteStatus = (id: string) => {
        setDespesasRecorrentes(prev => prev.map(d => 
            d.id === id ? { ...d, status: d.status === 'Lançado' ? 'Pendente' : 'Lançado' } : d
        ));
    };

    const handleTogglePago = (boleto: Boleto) => {
        const action = () => {
            setBoletos(prev => prev.map(b => b.id === boleto.id ? { ...b, pago: !b.pago } : b));
        };
        setConfirmAction({ 
            action, 
            message: boleto.pago 
                ? `Deseja desfazer o pagamento do boleto de ${boleto.fornecedor}?` 
                : `Confirmar pagamento do boleto de ${boleto.fornecedor}?` 
        });
        setIsConfirmOpen(true);
    };

    const handleToggleSolinter = (boleto: Boleto) => {
         setBoletos(prev => prev.map(b => b.id === boleto.id ? { ...b, lancadoSolinter: !b.lancadoSolinter } : b));
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingBoleto(null);
        setEditingDespesa(null);
        setBoletoErrors({}); 
        setDespesaErrors({});
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (activeView === 'boletos' && editingBoleto) {
            const { name, value } = e.target;
            let finalValue: string | number | boolean = value;
            if (name === 'valor') {
                let numericValue = value.replace(/\D/g, '');
                if (numericValue === '') numericValue = '0';
                finalValue = Number(numericValue) / 100;
            } 
            setEditingBoleto(prev => ({ ...prev, [name]: finalValue }));
            if (boletoErrors[name as keyof BoletoErrors]) {
                 setBoletoErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[name as keyof BoletoErrors];
                    return newErrors;
                });
            }
        } else if (activeView === 'recorrentes' && editingDespesa) {
             const { name, value } = e.target;
             setEditingDespesa(prev => ({ ...prev, [name]: value }));
             if (despesaErrors[name as keyof DespesaErrors]) {
                 setDespesaErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[name as keyof DespesaErrors];
                    return newErrors;
                });
            }
        }
    };

    const validate = (): boolean => {
        if (activeView === 'boletos') {
            if (!editingBoleto) return false;
            const newErrors: BoletoErrors = {};
            if (!editingBoleto.fornecedor?.trim()) newErrors.fornecedor = "Fornecedor é obrigatório.";
            if (!editingBoleto.pagador?.trim()) newErrors.pagador = "Pagador é obrigatório.";
            if (!editingBoleto.vencimento) newErrors.vencimento = "Vencimento inválido.";
            if (!editingBoleto.valor || editingBoleto.valor <= 0) newErrors.valor = "Valor deve ser maior que zero.";
            setBoletoErrors(newErrors);
            return Object.keys(newErrors).length === 0;
        } else {
            if (!editingDespesa) return false;
            const newErrors: DespesaErrors = {};
            if (!editingDespesa.empresa?.trim()) newErrors.empresa = "Empresa é obrigatória.";
            if (!editingDespesa.descricao?.trim()) newErrors.descricao = "Descrição é obrigatória.";
            if (!editingDespesa.diaVencimento?.trim()) newErrors.diaVencimento = "Dia é obrigatório.";
            setDespesaErrors(newErrors);
            return Object.keys(newErrors).length === 0;
        }
    };

    const handleSaveChanges = () => {
        if (!validate()) return;

        if (activeView === 'boletos') {
            if (!editingBoleto) return;
            const boletoToSave = { ...editingBoleto };
            if (boletoToSave.id) {
                setBoletos(prev => prev.map(b => b.id === boletoToSave.id ? boletoToSave as Boleto : b));
            } else {
                setBoletos(prev => [...prev, { ...boletoToSave, id: `boleto-${Date.now()}` } as Boleto]);
            }
        } else {
            if (!editingDespesa) return;
            const despesaToSave = { ...editingDespesa };
            if (despesaToSave.id) {
                setDespesasRecorrentes(prev => prev.map(d => d.id === despesaToSave.id ? despesaToSave as DespesaRecorrente : d));
            } else {
                setDespesasRecorrentes(prev => [...prev, { ...despesaToSave, id: `despesa-${Date.now()}` } as DespesaRecorrente]);
            }
        }
        handleCloseModal();
    };

    const handleConfirm = () => {
        confirmAction.action?.();
        setIsConfirmOpen(false);
    };

    const handleCancelConfirm = () => {
        setIsConfirmOpen(false);
        setConfirmAction({ action: null, message: '' });
    };

    const renderBoletosView = () => {
        return (
            <>
                {/* Cards Grid */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(Object.values(StatusBoleto) as StatusBoleto[]).map(status => {
                        const total = totals[status] || { count: 0, value: 0 };
                        let borderColor = 'border-border';
                        let textColor = 'text-primary';
                        let bgColor = 'bg-card';

                        if (status === StatusBoleto.VENCIDO) {
                            textColor = 'text-danger';
                            if (statusFilter === status) borderColor = 'border-danger';
                        } else if (status === StatusBoleto.PAGO) {
                            textColor = 'text-success';
                            if (statusFilter === status) borderColor = 'border-success';
                        } else if (status === StatusBoleto.LANCADO_SOLINTER) {
                            textColor = 'text-blue-600';
                            if (statusFilter === status) borderColor = 'border-blue-500';
                        } else if (statusFilter === status) {
                            borderColor = 'border-primary';
                        }

                        return (
                            <div 
                                key={status} 
                                onClick={() => setStatusFilter(status === statusFilter ? 'Todos' : status)} 
                                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${statusFilter === status ? `bg-opacity-5 ${bgColor.replace('card', '')}` : 'bg-card hover:border-gray-300'} ${borderColor}`}
                                style={statusFilter === status ? { backgroundColor: status === StatusBoleto.VENCIDO ? 'rgba(220, 38, 38, 0.05)' : status === StatusBoleto.PAGO ? 'rgba(5, 150, 105, 0.05)' : status === StatusBoleto.LANCADO_SOLINTER ? 'rgba(37, 99, 235, 0.05)' : 'rgba(194, 65, 12, 0.05)' } : {}}
                            >
                                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">{status}</p>
                                <p className={`text-xl font-bold ${textColor}`}>
                                    {formatCurrency(total.value)}
                                </p>
                                <p className="text-xs text-text-secondary mt-1">{total.count} boletos</p>
                            </div>
                        );
                    })}
                </div>

                {/* Filter Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 bg-white p-3 rounded-2xl border border-border shadow-sm">
                    <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                        <input 
                            type="text" 
                            placeholder="Buscar Fornecedor ou Pagador..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full sm:w-80 pl-10 pr-3 bg-white border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-12 transition-colors"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-text-secondary"/></div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                        <div className="flex items-center gap-2">
                            <DatePicker 
                                value={dateRange.start} 
                                onChange={(val) => setDateRange(prev => ({ ...prev, start: val }))} 
                                placeholder="Início"
                                className="w-32 h-12"
                            />
                            <span className="text-xs text-text-secondary">até</span>
                            <DatePicker 
                                value={dateRange.end} 
                                onChange={(val) => setDateRange(prev => ({ ...prev, end: val }))} 
                                placeholder="Fim"
                                className="w-32 h-12"
                            />
                        </div>
                        <button onClick={() => { setSearchTerm(''); setStatusFilter('Todos'); setDateRange({start: '', end: ''}); setSortConfig(null); }} className="px-4 py-2 rounded-xl bg-secondary hover:bg-gray-200 text-text-primary font-medium text-sm h-12 transition-colors">Limpar</button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden flex-grow shadow-sm flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto flex-grow">
                        <table className="min-w-full divide-y divide-border text-sm text-left">
                            <thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 cursor-pointer select-none hover:bg-border/50 transition-colors" onClick={() => requestSort('dynamicStatus')}>Status {renderSortIcon('dynamicStatus')}</th>
                                    <th className="px-6 py-3 cursor-pointer select-none hover:bg-border/50 transition-colors" onClick={() => requestSort('fornecedor')}>Fornecedor {renderSortIcon('fornecedor')}</th>
                                    <th className="px-6 py-3 cursor-pointer select-none hover:bg-border/50 transition-colors" onClick={() => requestSort('pagador')}>Pagador {renderSortIcon('pagador')}</th>
                                    <th className="px-6 py-3 cursor-pointer select-none hover:bg-border/50 transition-colors" onClick={() => requestSort('vencimento')}>Vencimento {renderSortIcon('vencimento')}</th>
                                    <th className="px-6 py-3 text-right cursor-pointer select-none hover:bg-border/50 transition-colors" onClick={() => requestSort('valor')}>Valor {renderSortIcon('valor')}</th>
                                    <th className="px-6 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-white">
                                {paginatedBoletos.length > 0 ? paginatedBoletos.map(boleto => (
                                    <tr key={boleto.id} className="hover:bg-secondary transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${
                                                boleto.dynamicStatus === StatusBoleto.VENCIDO ? 'bg-danger/20 text-danger border-danger/30' :
                                                boleto.dynamicStatus === StatusBoleto.PAGO ? 'bg-success/20 text-success border-success/30' :
                                                boleto.dynamicStatus === StatusBoleto.LANCADO_SOLINTER ? 'bg-blue-100 text-blue-600 border-blue-200' :
                                                'bg-primary/20 text-primary border-primary/30'
                                            }`}>
                                                {boleto.dynamicStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-text-primary">{boleto.fornecedor}</td>
                                        <td className="px-6 py-4 text-text-secondary">{boleto.pagador}</td>
                                        <td className="px-6 py-4 text-text-secondary">{formatDateToBR(boleto.vencimento)}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-text-primary">{formatCurrency(boleto.valor)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                {/* Toggle Solinter */}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleToggleSolinter(boleto); }} 
                                                    className={`p-1.5 rounded-full transition-colors ${boleto.lancadoSolinter ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                                    title={boleto.lancadoSolinter ? "Remover do Solinter" : "Marcar como Lançado no Solinter"}
                                                >
                                                    <ClipboardCheckIcon className="h-4 w-4" />
                                                </button>

                                                {/* Toggle Pago */}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleTogglePago(boleto); }} 
                                                    className={`p-1.5 rounded-full transition-colors ${boleto.pago ? 'text-success bg-green-50 hover:bg-green-100' : 'text-gray-400 hover:text-success hover:bg-green-50'}`}
                                                    title={boleto.pago ? "Marcar como Não Pago" : "Marcar como Pago"}
                                                >
                                                    <CheckIcon className="h-4 w-4" />
                                                </button>

                                                <button onClick={() => handleEditClick(boleto)} className="text-primary hover:bg-primary/10 p-1.5 rounded-full transition-colors"><EditIcon className="h-4 w-4" /></button>
                                                <button onClick={() => handleDeleteClick(boleto.id)} className="text-danger hover:bg-danger/10 p-1.5 rounded-full transition-colors"><TrashIcon className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="text-center py-16">
                                            <div className="flex flex-col items-center text-text-secondary">
                                                <SearchIcon className="w-10 h-10 mb-3 text-gray-300"/>
                                                <h3 className="text-lg font-medium text-text-primary">Nenhum Boleto Encontrado</h3>
                                                <p className="text-sm">Tente ajustar os filtros ou adicione um novo boleto.</p>
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
                            Exibindo {filteredBoletos.length > 0 ? startIndex + 1 : 0} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredBoletos.length)} de {filteredBoletos.length} registros
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-full hover:bg-secondary disabled:opacity-50 transition-colors"><ChevronLeftIcon className="h-5 w-5 text-text-primary" /></button>
                            <span className="text-sm font-medium text-text-primary">Página {currentPage} de {Math.max(1, totalPages)}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-full hover:bg-secondary disabled:opacity-50 transition-colors"><ChevronRightIcon className="h-5 w-5 text-text-primary" /></button>
                        </div>
                    </div>
                </div>
            </>
        );
    };

    const renderRecorrentesView = () => {
        return (
            <div className="flex flex-col flex-grow h-full overflow-hidden">
                {/* Search Bar for Recorrentes */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 bg-white p-3 rounded-2xl border border-border shadow-sm shrink-0">
                    <div className="relative w-full sm:w-64">
                        <input 
                            type="text" 
                            placeholder="Buscar Empresa..." 
                            value={recorrentesFilters.empresa} 
                            onChange={e => setRecorrentesFilters(prev => ({...prev, empresa: e.target.value}))} 
                            className="w-full pl-10 pr-3 bg-white border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-12 transition-colors"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-text-secondary"/></div>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <input 
                            type="text" 
                            placeholder="Buscar Descrição..." 
                            value={recorrentesFilters.descricao} 
                            onChange={e => setRecorrentesFilters(prev => ({...prev, descricao: e.target.value}))} 
                            className="w-full pl-3 pr-3 bg-white border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-12 transition-colors"
                        />
                    </div>
                    <div className="relative w-full sm:w-32">
                        <input 
                            type="text" 
                            placeholder="Dia/Mês" 
                            value={recorrentesFilters.diaMes} 
                            onChange={e => setRecorrentesFilters(prev => ({...prev, diaMes: e.target.value}))} 
                            className="w-full pl-3 pr-3 bg-white border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-12 transition-colors text-center"
                        />
                    </div>
                    <button 
                        onClick={() => setRecorrentesFilters({ empresa: '', descricao: '', diaMes: '', status: '' })} 
                        className="px-4 py-2 rounded-xl bg-secondary hover:bg-gray-200 text-text-primary font-medium text-sm h-12 transition-colors"
                    >
                        Limpar
                    </button>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden flex-grow shadow-sm flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto flex-grow">
                        <table className="min-w-full divide-y divide-border text-sm text-left">
                            <thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3">Dia Venc.</th>
                                    <th className="px-6 py-3">Empresa</th>
                                    <th className="px-6 py-3">Descrição</th>
                                    <th className="px-6 py-3">Recorrência</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                    <th className="px-6 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-white">
                                {filteredRecorrentes.map(despesa => (
                                    <tr 
                                        key={despesa.id} 
                                        onClick={() => handleToggleRecorrenteStatus(despesa.id)}
                                        className={`cursor-pointer transition-colors ${despesa.status === 'Lançado' ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-secondary'}`}
                                    >
                                        <td className="px-6 py-4 text-text-secondary font-medium">{despesa.diaVencimento}</td>
                                        <td className="px-6 py-4 font-medium text-text-primary">{despesa.empresa}</td>
                                        <td className="px-6 py-4 text-text-secondary">{despesa.descricao}</td>
                                        <td className="px-6 py-4 text-text-secondary">{despesa.recorrencia}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${despesa.status === 'Lançado' ? 'bg-success/20 text-success border-success/30' : 'bg-warning/20 text-warning border-warning/30'}`}>
                                                {despesa.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => handleEditClick(despesa)} className="text-primary hover:bg-primary/10 p-1.5 rounded-full transition-colors"><EditIcon className="h-4 w-4" /></button>
                                                <button onClick={() => handleDeleteClick(despesa.id)} className="text-danger hover:bg-danger/10 p-1.5 rounded-full transition-colors"><TrashIcon className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    {onBack && (
                      <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-9">
                          <ArrowLeftIcon className="h-4 w-4" />
                          Voltar
                      </button>
                    )}
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Controle de Boletos e Despesas</h2>
                </div>
                <div className="flex bg-secondary p-1 rounded-full border border-border">
                    <button onClick={() => setActiveView('boletos')} className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${activeView === 'boletos' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}>Boletos</button>
                    <button onClick={() => setActiveView('recorrentes')} className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${activeView === 'recorrentes' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}>Recorrentes</button>
                    <button onClick={() => setActiveView('notas_fiscais')} className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${activeView === 'notas_fiscais' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}>Notas Fiscais</button>
                </div>
            </div>

            {activeView === 'boletos' && (
                <div className="flex justify-end mb-4">
                    <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-medium py-2 px-4 rounded-full hover:bg-primary-hover text-sm h-10 shadow-sm transition-colors">
                        <PlusIcon className="h-4 w-4" /> Novo Boleto
                    </button>
                </div>
            )}
            
            {activeView === 'recorrentes' && (
                <div className="flex justify-end mb-4">
                    <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-medium py-2 px-4 rounded-full hover:bg-primary-hover text-sm h-10 shadow-sm transition-colors">
                        <PlusIcon className="h-4 w-4" /> Nova Despesa
                    </button>
                </div>
            )}

            {activeView === 'boletos' && renderBoletosView()}
            {activeView === 'recorrentes' && renderRecorrentesView()}
            {activeView === 'notas_fiscais' && <GerenciadorNotasFiscais />}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                        <h3 className="text-2xl font-bold text-text-primary mb-6 text-center">
                            {editingBoleto?.id || editingDespesa?.id ? 'Editar' : 'Adicionar'}
                        </h3>
                        {activeView === 'boletos' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Fornecedor</label>
                                    <AutocompleteInput name="fornecedor" value={editingBoleto?.fornecedor || ''} onChange={handleInputChange} suggestions={uniqueFornecedores} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${boletoErrors.fornecedor ? 'border-danger' : ''}`} />
                                    {boletoErrors.fornecedor && <p className="text-danger text-xs mt-1 ml-1">{boletoErrors.fornecedor}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Pagador</label>
                                    <AutocompleteInput name="pagador" value={editingBoleto?.pagador || ''} onChange={handleInputChange} suggestions={uniquePagadores} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${boletoErrors.pagador ? 'border-danger' : ''}`} />
                                    {boletoErrors.pagador && <p className="text-danger text-xs mt-1 ml-1">{boletoErrors.pagador}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Valor</label>
                                    <input name="valor" value={formatCurrency(editingBoleto?.valor || 0)} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${boletoErrors.valor ? 'border-danger' : ''}`} />
                                    {boletoErrors.valor && <p className="text-danger text-xs mt-1 ml-1">{boletoErrors.valor}</p>}
                                </div>
                                <div>
                                    <DatePicker 
                                        label="Vencimento"
                                        value={editingBoleto?.vencimento || ''} 
                                        onChange={(val) => setEditingBoleto(prev => ({...prev!, vencimento: val}))} 
                                        placeholder="Selecione"
                                    />
                                    {boletoErrors.vencimento && <p className="text-danger text-xs mt-1 ml-1">{boletoErrors.vencimento}</p>}
                                </div>
                            </div>
                        )}
                        {activeView === 'recorrentes' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Empresa</label>
                                    <AutocompleteInput name="empresa" value={editingDespesa?.empresa || ''} onChange={handleInputChange} suggestions={uniqueEmpresasRecorrentes} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${despesaErrors.empresa ? 'border-danger' : ''}`} />
                                    {despesaErrors.empresa && <p className="text-danger text-xs mt-1 ml-1">{despesaErrors.empresa}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Descrição</label>
                                    <AutocompleteInput name="descricao" value={editingDespesa?.descricao || ''} onChange={handleInputChange} suggestions={uniqueDescricoesRecorrentes} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${despesaErrors.descricao ? 'border-danger' : ''}`} />
                                    {despesaErrors.descricao && <p className="text-danger text-xs mt-1 ml-1">{despesaErrors.descricao}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Dia Vencimento</label>
                                    <input 
                                        name="diaVencimento" 
                                        type="text" 
                                        placeholder="DD ou DD/MM"
                                        value={editingDespesa?.diaVencimento || ''} 
                                        onChange={handleInputChange} 
                                        className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${despesaErrors.diaVencimento ? 'border-danger' : ''}`} 
                                    />
                                    {despesaErrors.diaVencimento && <p className="text-danger text-xs mt-1 ml-1">{despesaErrors.diaVencimento}</p>}
                                </div>
                                <div>
                                    <CustomSelect
                                        label="Recorrência"
                                        options={[
                                            { label: 'Semanal', value: 'Semanal' },
                                            { label: 'Mensal', value: 'Mensal' },
                                            { label: 'Anual', value: 'Anual' },
                                        ]}
                                        value={editingDespesa?.recorrencia || 'Mensal'}
                                        onChange={(val) => handleInputChange({ target: { name: 'recorrencia', value: val } } as any)}
                                    />
                                </div>
                            </div>
                        )}
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

export default BoletosAPagar;
