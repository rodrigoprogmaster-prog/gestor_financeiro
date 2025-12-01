
import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, EditIcon, SearchIcon, DownloadIcon, ArrowLeftIcon, ChevronDownIcon } from './icons';
import DatePicker from './DatePicker';
import CustomSelect from './CustomSelect';

// Data structure
interface ManualTransaction {
  id: string;
  dataTransacao: string; // YYYY-MM-DD
  transacao: string;
  categoria: string;
  valor: number;
  status?: string; // Added status field
}

// Date helpers
const formatDateToBR = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const [year, month, day] = isoDate.split('-');
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.toLocaleDateString('pt-BR', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CartaoManualProps {
    title: string;
    storageKey: string;
    onBack: () => void;
}

type SortConfig = { key: keyof ManualTransaction; direction: 'asc' | 'desc' };

const CartaoManual: React.FC<CartaoManualProps> = ({ title, storageKey, onBack }) => {
    const [transactions, setTransactions] = useState<ManualTransaction[]>(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Partial<ManualTransaction> | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [monthFilter, setMonthFilter] = useState('');
    
    // Sorting state
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    
    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(transactions));
    }, [transactions, storageKey]);

    // Lógica inteligente para definir o mês padrão
    useEffect(() => {
        const now = new Date();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
        const currentYear = now.getFullYear();
        const currentMonthKey = `${currentMonth}/${currentYear}`;

        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonthKey = `${(nextMonthDate.getMonth() + 1).toString().padStart(2, '0')}/${nextMonthDate.getFullYear()}`;

        // Filtrar transações do mês atual
        const currentMonthTransactions = transactions.filter(t => {
            if (!t.dataTransacao) return false;
            const [year, month] = t.dataTransacao.split('-');
            return `${month}/${year}` === currentMonthKey;
        });

        // Se houver transações no mês atual e TODAS estiverem 'Lançado', vai para o próximo mês.
        // Caso contrário, fica no mês atual.
        if (currentMonthTransactions.length > 0 && currentMonthTransactions.every(t => t.status === 'Lançado')) {
            setMonthFilter(nextMonthKey);
        } else {
            setMonthFilter(currentMonthKey);
        }
    }, [transactions]);

    const uniqueMonths = useMemo(() => {
        const months = new Set<string>();
        transactions.forEach(item => {
            if (!item.dataTransacao) return;
            const [year, month] = item.dataTransacao.split('-');
            if (year && month) {
                months.add(`${month}/${year}`);
            }
        });
        return Array.from(months).sort((a, b) => {
            const [monthA, yearA] = a.split('/').map(Number);
            const [monthB, yearB] = b.split('/').map(Number);
            if (yearA !== yearB) return yearB - yearA;
            return monthB - monthA;
        });
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        let result = transactions;
        
        if (monthFilter) {
            result = result.filter(t => {
                if (!t.dataTransacao) return false;
                const [year, month] = t.dataTransacao.split('-');
                return `${month}/${year}` === monthFilter;
            });
        }

        if (sortConfig !== null) {
            result = [...result].sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // Default sort by date desc
            result = [...result].sort((a, b) => b.dataTransacao.localeCompare(a.dataTransacao));
        }
        
        return result;
    }, [transactions, monthFilter, sortConfig]);

    const totals = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => acc + t.valor, 0);
    }, [filteredTransactions]);

    const requestSort = (key: keyof ManualTransaction) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (key: keyof ManualTransaction) => {
        if (sortConfig?.key === key) {
            return (
                <ChevronDownIcon 
                    className={`h-4 w-4 inline-block ml-1 transition-transform duration-200 ${
                        sortConfig.direction === 'asc' ? 'rotate-180' : ''
                    }`} 
                />
            );
        }
        return null;
    };

    const handleOpenAddModal = () => {
        setEditingTransaction({ 
            dataTransacao: '', 
            transacao: '',
            categoria: '',
            valor: 0,
            status: 'Pendente'
        });
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
    }, []);

    const handleEditClick = (transaction: ManualTransaction) => {
        setEditingTransaction({ ...transaction });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        const action = () => setTransactions(prev => prev.filter(t => t.id !== id));
        setConfirmAction({ action, message: 'Deseja excluir esta transação?' });
        setIsConfirmOpen(true);
    };

    const handleStatusToggle = (id: string) => {
        setTransactions(prev => prev.map(t => {
            if (t.id === id) {
                return { ...t, status: t.status === 'Lançado' ? 'Pendente' : 'Lançado' };
            }
            return t;
        }));
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTransaction(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingTransaction) return;
        const { name, value } = e.target;
        
        if (name === 'valor') {
            let numericValue = value.replace(/\D/g, '');
            if (numericValue === '') numericValue = '0';
            setEditingTransaction({ ...editingTransaction, valor: Number(numericValue) / 100 });
        } else {
            setEditingTransaction({ ...editingTransaction, [name]: value });
        }
    };

    const handleSaveChanges = () => {
        if (!editingTransaction) return;
        if (!editingTransaction.transacao || !editingTransaction.dataTransacao || !editingTransaction.valor) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        const transactionToSave = {
            id: editingTransaction.id || `manual-${Date.now()}`,
            transacao: editingTransaction.transacao,
            categoria: editingTransaction.categoria || 'Geral',
            valor: editingTransaction.valor,
            dataTransacao: editingTransaction.dataTransacao,
            status: editingTransaction.status || 'Pendente'
        };

        if (editingTransaction.id) {
            setTransactions(prev => prev.map(t => t.id === transactionToSave.id ? transactionToSave as ManualTransaction : t));
        } else {
            setTransactions(prev => [...prev, transactionToSave as ManualTransaction]);
        }
        handleCloseModal();
    };

    const handleConfirm = () => {
        confirmAction.action?.();
        setIsConfirmOpen(false);
    };

    const handleExportXLSX = () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
            alert("Biblioteca XLSX não carregada.");
            return;
        }
        
        const dataToExport = filteredTransactions.map(t => ({
            'Data': formatDateToBR(t.dataTransacao),
            'Descrição': t.transacao,
            'Categoria': t.categoria,
            'Valor': t.valor,
            'Status': t.status || 'Pendente'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        
        XLSX.utils.sheet_add_aoa(ws, [[null, null, null, 'Total:', totals]], { origin: -1 });
        
        const range = XLSX.utils.decode_range(ws['!ref']);
        // Format value column (index 3 -> D)
        for (let R = 1; R <= range.e.r; ++R) {
            const cellRef = XLSX.utils.encode_cell({c: 3, r: R});
            if(ws[cellRef]) {
                ws[cellRef].t = 'n';
                ws[cellRef].z = 'R$ #,##0.00';
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, title);
        XLSX.writeFile(wb, `${title.replace(/\s/g, '_')}_${monthFilter.replace('/', '-') || 'geral'}.xlsx`);
    };

    return (
        <div className="animate-fade-in flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Voltar
                    </button>
                    <h3 className="text-xl md:text-2xl font-bold text-text-primary">{title}</h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-48">
                        <CustomSelect
                            options={[
                                { label: 'Todos os Meses', value: '' },
                                ...uniqueMonths.map(month => ({ label: month, value: month }))
                            ]}
                            value={monthFilter}
                            onChange={(val) => setMonthFilter(val)}
                            placeholder="Filtrar Mês"
                        />
                    </div>
                    <button onClick={() => setMonthFilter('')} className="py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10">
                        Limpar
                    </button>
                    <button onClick={handleExportXLSX} className="flex items-center gap-2 bg-white border border-gray-300 text-success font-semibold py-2 px-4 rounded-full hover:bg-green-50 transition-colors duration-300 h-10 shadow-sm">
                        <DownloadIcon className="h-5 w-5" /> Exportar
                    </button>
                    <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-white border border-gray-200 text-primary font-semibold py-2 px-4 rounded-full hover:bg-orange-50 hover:border-orange-200 transition-colors duration-300 h-10 shadow-sm">
                        <PlusIcon className="h-5 w-5" /> Adicionar
                    </button>
                </div>
            </div>

            {/* Unified Summary Strip */}
            <div className="bg-white p-3 rounded-2xl border border-border shadow-sm mb-4 flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border shrink-0">
                <div className="px-6 py-2 flex-1 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Valor Total</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(totals)}</p>
                </div>
                <div className="px-6 py-2 flex-1 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Lançamentos</p>
                    <p className="text-xl font-bold text-text-primary">{filteredTransactions.length}</p>
                </div>
            </div>

            <div className="bg-card shadow-md rounded-2xl overflow-hidden flex flex-col flex-grow border border-border">
                <div className="overflow-x-auto overflow-y-auto flex-grow">
                    <table className="min-w-full divide-y divide-border text-sm text-left">
                        <thead className="bg-secondary text-text-primary uppercase text-xs font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 cursor-pointer hover:bg-border/50 select-none" onClick={() => requestSort('dataTransacao')}>Data {renderSortIcon('dataTransacao')}</th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-border/50 select-none" onClick={() => requestSort('transacao')}>Descrição {renderSortIcon('transacao')}</th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-border/50 select-none" onClick={() => requestSort('categoria')}>Categoria {renderSortIcon('categoria')}</th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:bg-border/50 select-none" onClick={() => requestSort('valor')}>Valor {renderSortIcon('valor')}</th>
                                <th className="px-6 py-3 text-center cursor-pointer hover:bg-border/50 select-none" onClick={() => requestSort('status')}>Status {renderSortIcon('status')}</th>
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map(item => (
                                    <tr 
                                        key={item.id} 
                                        className="hover:bg-secondary transition-colors cursor-pointer"
                                        onClick={() => handleStatusToggle(item.id)}
                                    >
                                        <td className="px-6 py-2.5 whitespace-nowrap text-text-secondary">{formatDateToBR(item.dataTransacao)}</td>
                                        <td className="px-6 py-2.5 font-medium text-text-primary">{item.transacao}</td>
                                        <td className="px-6 py-2.5 text-text-secondary">{item.categoria}</td>
                                        <td className="px-6 py-2.5 text-right font-semibold text-text-primary whitespace-nowrap">{formatCurrency(item.valor)}</td>
                                        <td className="px-6 py-2.5 text-center">
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${item.status === 'Lançado' ? 'bg-success/10 text-success border border-success/20' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                                {item.status || 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} className="text-primary hover:text-primary/80 p-1.5 rounded-full hover:bg-primary/10 transition-colors">
                                                    <EditIcon className="h-4 w-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id); }} className="text-danger hover:text-danger/80 p-1.5 rounded-full hover:bg-danger/10 transition-colors">
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center text-text-secondary opacity-60">
                                            <SearchIcon className="w-10 h-10 mb-3 text-gray-300" />
                                            <h3 className="text-base font-semibold text-text-primary">Nenhuma Transação</h3>
                                            <p className="text-sm mt-1">Adicione um lançamento manual para começar.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && editingTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="shrink-0 p-6 pb-2 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-text-primary text-center">{editingTransaction.id ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div>
                                <DatePicker 
                                    label="Data"
                                    value={editingTransaction.dataTransacao || ''} 
                                    onChange={(val) => setEditingTransaction(prev => ({...prev, dataTransacao: val}))} 
                                    placeholder="Selecione"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Descrição</label>
                                <input 
                                    name="transacao" 
                                    value={editingTransaction.transacao || ''} 
                                    onChange={handleInputChange} 
                                    className="w-full bg-background border border-border rounded-xl px-3 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-12"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Categoria</label>
                                <input 
                                    name="categoria" 
                                    value={editingTransaction.categoria || ''} 
                                    onChange={handleInputChange} 
                                    placeholder="Ex: Alimentação, Transporte"
                                    className="w-full bg-background border border-border rounded-xl px-3 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-12"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Valor</label>
                                <input 
                                    name="valor" 
                                    value={formatCurrency(editingTransaction.valor || 0)} 
                                    onChange={handleInputChange} 
                                    className="w-full bg-background border border-border rounded-xl px-3 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-12"
                                />
                            </div>
                        </div>

                        <div className="shrink-0 p-6 pt-4 border-t border-gray-100 flex justify-center gap-3 bg-gray-50">
                            <button onClick={handleCloseModal} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-text-primary font-semibold hover:bg-gray-50 transition-colors shadow-sm">Cancelar</button>
                            <button onClick={handleSaveChanges} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-primary font-bold shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {isConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
                        <h3 className="text-xl font-bold mb-4 text-text-primary">Confirmar</h3>
                        <p className="text-text-secondary mb-8">{confirmAction.message}</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setIsConfirmOpen(false)} className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-text-primary font-semibold hover:bg-gray-50 transition-colors shadow-sm">Cancelar</button>
                            <button onClick={handleConfirm} className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-primary font-bold shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartaoManual;
