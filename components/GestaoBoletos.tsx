
import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, EditIcon, CheckIcon, CalendarClockIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ArrowLeftIcon } from './icons';
import AutocompleteInput from './AutocompleteInput';

// Enum for status
enum StatusBoletoReceber {
  A_RECEBER = 'A Receber',
  RECEBIDO = 'Recebido',
}

interface BoletoReceber {
    id: string;
    credor: string; // Cedente
    cliente: string; // Sacado
    vencimento: string; // YYYY-MM-DD
    valor: number;
    recebido: boolean;
}

// Helpers
const formatDateToBR = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const [year, month, day] = isoDate.split('-');
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
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

const ITEMS_PER_PAGE = 20;
const STORAGE_KEY = 'boletos_a_receber_data';

const newBoletoTemplate: Omit<BoletoReceber, 'id'> = {
    credor: '',
    cliente: '',
    vencimento: new Date().toISOString().split('T')[0],
    valor: 0,
    recebido: false
};

const GestaoBoletos: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const [boletos, setBoletos] = useState<BoletoReceber[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBoleto, setEditingBoleto] = useState<Partial<BoletoReceber> & { vencimento_br?: string } | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof BoletoReceber | 'vencimento_br', string>>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'Todos' | 'A Receber' | 'Recebido'>('A Receber');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(boletos));
    }, [boletos]);

    // Unique values for autocomplete
    const uniqueCredores = useMemo(() => [...new Set(boletos.map(b => b.credor).filter(Boolean))].sort(), [boletos]);
    const uniqueClientes = useMemo(() => [...new Set(boletos.map(b => b.cliente).filter(Boolean))].sort(), [boletos]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const filteredBoletos = useMemo(() => {
        return boletos.filter(boleto => {
            const matchesSearch = !searchTerm || 
                boleto.credor.toLowerCase().includes(searchTerm.toLowerCase()) || 
                boleto.cliente.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = 
                statusFilter === 'Todos' ? true :
                statusFilter === 'Recebido' ? boleto.recebido :
                !boleto.recebido;

            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
    }, [boletos, searchTerm, statusFilter]);

    const totalPages = Math.ceil(filteredBoletos.length / ITEMS_PER_PAGE);
    const paginatedBoletos = filteredBoletos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleOpenAddModal = () => {
        setErrors({});
        setEditingBoleto({ ...newBoletoTemplate, vencimento_br: formatDateToBR(newBoletoTemplate.vencimento) });
        setIsModalOpen(true);
    };

    const handleEditClick = (boleto: BoletoReceber) => {
        setErrors({});
        setEditingBoleto({ ...boleto, vencimento_br: formatDateToBR(boleto.vencimento) });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este boleto?')) {
            setBoletos(prev => prev.filter(b => b.id !== id));
        }
    };

    const handleToggleStatus = (id: string) => {
        setBoletos(prev => prev.map(b => b.id === id ? { ...b, recebido: !b.recebido } : b));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingBoleto) return;
        const { name, value } = e.target;
        
        if (name === 'valor') {
            let numericValue = value.replace(/\D/g, '');
            if (numericValue === '') numericValue = '0';
            setEditingBoleto(prev => ({ ...prev, valor: Number(numericValue) / 100 }));
        } else if (name === 'vencimento_br') {
            setEditingBoleto(prev => ({ ...prev, vencimento_br: applyDateMask(value) }));
        } else {
            setEditingBoleto(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSaveChanges = () => {
        if (!editingBoleto) return;
        const newErrors: typeof errors = {};
        
        if (!editingBoleto.credor?.trim()) newErrors.credor = 'Credor obrigatório';
        if (!editingBoleto.cliente?.trim()) newErrors.cliente = 'Cliente obrigatório';
        if (!editingBoleto.vencimento_br || !isValidBRDate(editingBoleto.vencimento_br)) newErrors.vencimento_br = 'Data inválida';
        if ((editingBoleto.valor || 0) <= 0) newErrors.valor = 'Valor deve ser positivo';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const boletoToSave = {
            ...editingBoleto,
            vencimento: formatDateToISO(editingBoleto.vencimento_br!)
        };
        delete (boletoToSave as any).vencimento_br;

        if (boletoToSave.id) {
            setBoletos(prev => prev.map(b => b.id === boletoToSave.id ? (boletoToSave as BoletoReceber) : b));
        } else {
            setBoletos(prev => [...prev, { ...boletoToSave, id: `boleto-${Date.now()}` } as BoletoReceber]);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-9">
                            <ArrowLeftIcon className="h-4 w-4" /> Voltar
                        </button>
                    )}
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Boletos a Receber</h2>
                </div>
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors h-9">
                    <PlusIcon className="h-4 w-4" /> Novo Boleto
                </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 bg-white p-3 rounded-2xl border border-border">
                <div className="relative w-full sm:w-auto flex-grow">
                    <input
                        type="text"
                        placeholder="Buscar credor ou cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-white border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setStatusFilter('A Receber')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === 'A Receber' ? 'bg-primary text-white' : 'bg-secondary text-text-primary'}`}>A Receber</button>
                    <button onClick={() => setStatusFilter('Recebido')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === 'Recebido' ? 'bg-success text-white' : 'bg-secondary text-text-primary'}`}>Recebidos</button>
                    <button onClick={() => setStatusFilter('Todos')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === 'Todos' ? 'bg-gray-600 text-white' : 'bg-secondary text-text-primary'}`}>Todos</button>
                </div>
            </div>

            <div className="bg-card shadow-sm rounded-2xl overflow-hidden flex flex-col flex-grow border border-border">
                <div className="overflow-x-auto flex-grow">
                    <table className="min-w-full divide-y divide-border text-sm text-left">
                        <thead className="bg-secondary text-xs uppercase font-medium text-text-secondary sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Vencimento</th>
                                <th className="px-6 py-3">Credor</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3 text-right">Valor</th>
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                            {paginatedBoletos.length > 0 ? (
                                paginatedBoletos.map((boleto) => (
                                    <tr key={boleto.id} className="hover:bg-secondary transition-colors">
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => handleToggleStatus(boleto.id)}
                                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${boleto.recebido ? 'bg-success/20 text-success border-success/30' : 'bg-warning/20 text-warning border-warning/30'}`}
                                            >
                                                {boleto.recebido ? 'Recebido' : 'A Receber'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-text-secondary">{formatDateToBR(boleto.vencimento)}</td>
                                        <td className="px-6 py-4 font-medium text-text-primary">{boleto.credor}</td>
                                        <td className="px-6 py-4 text-text-secondary">{boleto.cliente}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-text-primary">{formatCurrency(boleto.valor)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEditClick(boleto)} className="text-primary p-1.5 rounded-full hover:bg-primary/10"><EditIcon className="h-4 w-4"/></button>
                                                <button onClick={() => handleDeleteClick(boleto.id)} className="text-danger p-1.5 rounded-full hover:bg-danger/10"><TrashIcon className="h-4 w-4"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-text-secondary">Nenhum boleto encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="flex justify-between items-center p-4 border-t border-border bg-card rounded-b-2xl">
                    <span className="text-sm text-text-secondary">Página {currentPage} de {Math.max(1, totalPages)}</span>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-secondary disabled:opacity-50"><ChevronLeftIcon className="h-5 w-5" /></button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-lg hover:bg-secondary disabled:opacity-50"><ChevronRightIcon className="h-5 w-5" /></button>
                    </div>
                </div>
            </div>

            {isModalOpen && editingBoleto && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                        <h3 className="text-2xl font-bold text-text-primary mb-6 text-center">{editingBoleto.id ? 'Editar Boleto' : 'Novo Boleto a Receber'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Credor (Cedente)</label>
                                <AutocompleteInput 
                                    name="credor" 
                                    value={editingBoleto.credor || ''} 
                                    onChange={handleInputChange} 
                                    suggestions={uniqueCredores}
                                    className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.credor ? 'border-danger' : ''}`} 
                                    placeholder="Nome do Credor" 
                                />
                                {errors.credor && <p className="text-danger text-xs mt-1 ml-1">{errors.credor}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Cliente (Sacado)</label>
                                <AutocompleteInput 
                                    name="cliente" 
                                    value={editingBoleto.cliente || ''} 
                                    onChange={handleInputChange} 
                                    suggestions={uniqueClientes}
                                    className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.cliente ? 'border-danger' : ''}`} 
                                    placeholder="Nome do Cliente" 
                                />
                                {errors.cliente && <p className="text-danger text-xs mt-1 ml-1">{errors.cliente}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Vencimento</label>
                                    <input name="vencimento_br" value={editingBoleto.vencimento_br || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.vencimento_br ? 'border-danger' : ''}`} placeholder="DD/MM/AAAA" />
                                    {errors.vencimento_br && <p className="text-danger text-xs mt-1 ml-1">{errors.vencimento_br}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Valor</label>
                                    <input name="valor" value={formatCurrency(editingBoleto.valor || 0)} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.valor ? 'border-danger' : ''}`} />
                                    {errors.valor && <p className="text-danger text-xs mt-1 ml-1">{errors.valor}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center gap-3 mt-8">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleSaveChanges} className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestaoBoletos;
