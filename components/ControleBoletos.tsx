
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
    diaVencimento: number;
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
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const [despesasRecorrentes, setDespesasRecorrentes] = useState<DespesaRecorrente[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY_RECORRENTES);
        return saved ? JSON.parse(saved) : [];
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    
    const [editingBoleto, setEditingBoleto] = useState<Partial<Boleto> | null>(null);
    const [boletoErrors, setBoletoErrors] = useState<BoletoErrors>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusBoleto | 'Todos'>(StatusBoleto.A_VENCER);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const [editingDespesa, setEditingDespesa] = useState<(Partial<DespesaRecorrente> & { diaMesLaunch?: string }) | null>(null);
    const [despesaErrors, setDespesaErrors] = useState<DespesaErrors>({});
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

    const getDynamicStatus = (boleto: Boleto): StatusBoleto => {
        if (boleto.pago) return StatusBoleto.PAGO;
        if (boleto.lancadoSolinter) return StatusBoleto.LANCADO_SOLINTER;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(boleto.vencimento + 'T00:00:00');
        return vencimento < hoje ? StatusBoleto.VENCIDO : StatusBoleto.A_VENCER;
    };
    
    const allBoletosWithStatus = useMemo(() => boletos.map(b => ({ ...b, dynamicStatus: getDynamicStatus(b) })), [boletos]);

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

    const totalPages = Math.ceil(filteredBoletos.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedBoletos = filteredBoletos.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const filteredRecorrentes = useMemo(() => {
        return despesasRecorrentes.filter(item => {
            const empresaMatch = !recorrentesFilters.empresa || item.empresa === recorrentesFilters.empresa;
            const descricaoMatch = !recorrentesFilters.descricao || item.descricao.toLowerCase().includes(recorrentesFilters.descricao.toLowerCase());
            const statusMatch = !recorrentesFilters.status || item.status === recorrentesFilters.status;
            let diaMatch = true;
            if (recorrentesFilters.diaMes) {
                const cleanInput = recorrentesFilters.diaMes.replace(/\D/g, '');
                if (cleanInput.length > 0) {
                    const searchDay = parseInt(cleanInput.slice(0, 2), 10);
                    diaMatch = item.diaVencimento === searchDay;
                }
            }
            return empresaMatch && descricaoMatch && diaMatch && statusMatch;
        }).sort((a, b) => a.diaVencimento - b.diaVencimento);
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
            setEditingDespesa({ diaVencimento: 1, recorrencia: 'Mensal', status: 'Pendente', diaMesLaunch: '' });
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
             let finalValue: string | number = value;
             if (name === 'diaVencimento') {
                 finalValue = parseInt(value, 10);
                 if (isNaN(finalValue)) finalValue = 0;
             }
             setEditingDespesa(prev => ({ ...prev, [name]: finalValue }));
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
            if (!editingDespesa.diaVencimento || editingDespesa.diaVencimento < 1 || editingDespesa.diaVencimento > 31) newErrors.diaVencimento = "Dia de vencimento inválido.";
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

    const renderBoletosView = () => {
        return (
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex-grow shadow-sm flex flex-col">
                <div className="overflow-x-auto overflow-y-auto flex-grow">
                    <table className="min-w-full divide-y divide-border text-sm text-left">
                        <thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 cursor-pointer select-none" onClick={() => requestSort('dynamicStatus')}>Status {renderSortIcon('dynamicStatus')}</th>
                                <th className="px-6 py-3 cursor-pointer select-none" onClick={() => requestSort('fornecedor')}>Fornecedor {renderSortIcon('fornecedor')}</th>
                                <th className="px-6 py-3 cursor-pointer select-none" onClick={() => requestSort('pagador')}>Pagador {renderSortIcon('pagador')}</th>
                                <th className="px-6 py-3 cursor-pointer select-none" onClick={() => requestSort('vencimento')}>Vencimento {renderSortIcon('vencimento')}</th>
                                <th className="px-6 py-3 text-right cursor-pointer select-none" onClick={() => requestSort('valor')}>Valor {renderSortIcon('valor')}</th>
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                            {paginatedBoletos.map(boleto => (
                                <tr key={boleto.id} className="hover:bg-secondary transition-colors">
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${
                                            boleto.dynamicStatus === StatusBoleto.VENCIDO ? 'bg-danger/20 text-danger border-danger/30' :
                                            boleto.dynamicStatus === StatusBoleto.PAGO ? 'bg-success/20 text-success border-success/30' :
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
                                            <button onClick={() => handleEditClick(boleto)} className="text-primary hover:bg-primary/10 p-1.5 rounded-full transition-colors"><EditIcon className="h-4 w-4" /></button>
                                            <button onClick={() => handleDeleteClick(boleto.id)} className="text-danger hover:bg-danger/10 p-1.5 rounded-full transition-colors"><TrashIcon className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
        );
    };

    const renderRecorrentesView = () => {
        return (
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex-grow shadow-sm flex flex-col">
                <div className="overflow-x-auto overflow-y-auto flex-grow">
                    <table className="min-w-full divide-y divide-border text-sm text-left">
                        <thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3">Empresa</th>
                                <th className="px-6 py-3">Descrição</th>
                                <th className="px-6 py-3">Dia Venc.</th>
                                <th className="px-6 py-3">Recorrência</th>
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                            {filteredRecorrentes.map(despesa => (
                                <tr key={despesa.id} className="hover:bg-secondary transition-colors">
                                    <td className="px-6 py-4 font-medium text-text-primary">{despesa.empresa}</td>
                                    <td className="px-6 py-4 text-text-secondary">{despesa.descricao}</td>
                                    <td className="px-6 py-4 text-text-secondary">Dia {despesa.diaVencimento}</td>
                                    <td className="px-6 py-4 text-text-secondary">{despesa.recorrencia}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
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
                    <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-medium py-2 px-4 rounded-full hover:bg-primary-hover text-sm h-9 shadow-sm transition-colors">
                        <PlusIcon className="h-4 w-4" /> Novo Boleto
                    </button>
                </div>
            )}
            
            {activeView === 'recorrentes' && (
                <div className="flex justify-end mb-4">
                    <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-medium py-2 px-4 rounded-full hover:bg-primary-hover text-sm h-9 shadow-sm transition-colors">
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
                                    <input name="diaVencimento" type="number" min="1" max="31" value={editingDespesa?.diaVencimento || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${despesaErrors.diaVencimento ? 'border-danger' : ''}`} />
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
                            <button onClick={() => setIsConfirmOpen(false)} className="px-6 py-2.5 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleConfirm} className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BoletosAPagar;
