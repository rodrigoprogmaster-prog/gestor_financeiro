import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, EditIcon, SearchIcon, DownloadIcon, ArrowLeftIcon } from './icons';

// Data structure
interface ManualTransaction {
  id: string;
  dataTransacao: string; // YYYY-MM-DD
  transacao: string;
  categoria: string;
  valor: number;
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
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CartaoManualProps {
    title: string;
    storageKey: string;
    onBack: () => void;
}

const CartaoManual: React.FC<CartaoManualProps> = ({ title, storageKey, onBack }) => {
    const [transactions, setTransactions] = useState<ManualTransaction[]>(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Partial<ManualTransaction> & { dataTransacao_br?: string } | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [monthFilter, setMonthFilter] = useState('');
    
    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(transactions));
    }, [transactions, storageKey]);

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
        if (!monthFilter) return transactions;
        return transactions.filter(t => {
            if (!t.dataTransacao) return false;
            const [year, month] = t.dataTransacao.split('-');
            return `${month}/${year}` === monthFilter;
        });
    }, [transactions, monthFilter]);

    const totals = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => acc + t.valor, 0);
    }, [filteredTransactions]);

    const handleOpenAddModal = () => {
        setEditingTransaction({ 
            dataTransacao_br: '', 
            transacao: '',
            categoria: '',
            valor: 0 
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (transaction: ManualTransaction) => {
        setEditingTransaction({ 
            ...transaction, 
            dataTransacao_br: formatDateToBR(transaction.dataTransacao) 
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        const action = () => setTransactions(prev => prev.filter(t => t.id !== id));
        setConfirmAction({ action, message: 'Deseja excluir esta transação?' });
        setIsConfirmOpen(true);
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
        } else if (name === 'dataTransacao_br') {
            setEditingTransaction({ ...editingTransaction, dataTransacao_br: applyDateMask(value) });
        } else {
            setEditingTransaction({ ...editingTransaction, [name]: value });
        }
    };

    const handleSaveChanges = () => {
        if (!editingTransaction) return;
        if (!editingTransaction.transacao || !editingTransaction.dataTransacao_br || !editingTransaction.valor) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }
        if (!isValidBRDate(editingTransaction.dataTransacao_br)) {
            alert("Data inválida.");
            return;
        }

        const transactionToSave = {
            id: editingTransaction.id || `manual-${Date.now()}`,
            transacao: editingTransaction.transacao,
            categoria: editingTransaction.categoria || 'Geral',
            valor: editingTransaction.valor,
            dataTransacao: formatDateToISO(editingTransaction.dataTransacao_br)
        };

        if (editingTransaction.id) {
            setTransactions(prev => prev.map(t => t.id === transactionToSave.id ? transactionToSave : t));
        } else {
            setTransactions(prev => [...prev, transactionToSave]);
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
            'Valor': t.valor
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        
        XLSX.utils.sheet_add_aoa(ws, [[null, null, 'Total:', totals]], { origin: -1 });
        
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
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Voltar
                    </button>
                    <h3 className="text-xl md:text-2xl font-bold text-text-primary">{title}</h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="bg-background border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10"
                    >
                        <option value="">Todos os Meses</option>
                        {uniqueMonths.map(month => (
                            <option key={month} value={month}>{month}</option>
                        ))}
                    </select>
                    <button onClick={() => setMonthFilter('')} className="py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10">
                        Limpar
                    </button>
                    <button onClick={handleExportXLSX} className="flex items-center gap-2 bg-success text-white font-semibold py-2 px-4 rounded-full hover:bg-green-700 transition-colors duration-300 h-10">
                        <DownloadIcon className="h-5 w-5" /> Exportar
                    </button>
                    <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors duration-300 h-10">
                        <PlusIcon className="h-5 w-5" /> Adicionar
                    </button>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-card p-4 rounded-2xl border border-border shadow-sm text-center">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Valor Total</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(totals)}</p>
                </div>
                <div className="bg-card p-4 rounded-2xl border border-border shadow-sm text-center">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Lançamentos</p>
                    <p className="text-xl font-bold text-primary">{filteredTransactions.length}</p>
                </div>
            </div>

            <div className="bg-card shadow-md rounded-2xl overflow-x-auto">
                <table className="w-full text-base text-left text-text-secondary">
                    <thead className="text-sm text-text-primary uppercase bg-secondary">
                        <tr>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Descrição</th>
                            <th className="px-6 py-3">Categoria</th>
                            <th className="px-6 py-3 text-right">Valor</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.length > 0 ? (
                            filteredTransactions.map(item => (
                                <tr key={item.id} className="bg-card border-b border-border hover:bg-secondary transition-colors">
                                    <td className="px-6 py-4">{formatDateToBR(item.dataTransacao)}</td>
                                    <td className="px-6 py-4 font-medium text-text-primary">{item.transacao}</td>
                                    <td className="px-6 py-4">{item.categoria}</td>
                                    <td className="px-6 py-4 text-right font-semibold text-text-primary">{formatCurrency(item.valor)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleEditClick(item)} className="text-primary hover:text-primary/80 p-2 rounded-full hover:bg-primary/10 transition-colors">
                                                <EditIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => handleDeleteClick(item.id)} className="text-danger hover:text-danger/80 p-2 rounded-full hover:bg-danger/10 transition-colors">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-16">
                                    <div className="flex flex-col items-center justify-center text-text-secondary">
                                        <SearchIcon className="w-12 h-12 mb-4 text-gray-300" />
                                        <h3 className="text-xl font-semibold text-text-primary">Nenhuma Transação Encontrada</h3>
                                        <p className="mt-1">Adicione um lançamento manual para começar.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && editingTransaction && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-6 text-text-primary">{editingTransaction.id ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Data</label>
                                <input 
                                    name="dataTransacao_br" 
                                    value={editingTransaction.dataTransacao_br || ''} 
                                    onChange={handleInputChange} 
                                    placeholder="DD/MM/AAAA"
                                    maxLength={10}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Descrição</label>
                                <input 
                                    name="transacao" 
                                    value={editingTransaction.transacao || ''} 
                                    onChange={handleInputChange} 
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Categoria</label>
                                <input 
                                    name="categoria" 
                                    value={editingTransaction.categoria || ''} 
                                    onChange={handleInputChange} 
                                    placeholder="Ex: Alimentação, Transporte"
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Valor</label>
                                <input 
                                    name="valor" 
                                    value={formatCurrency(editingTransaction.valor || 0)} 
                                    onChange={handleInputChange} 
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-4">
                            <button onClick={handleCloseModal} className="px-4 py-2 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button>
                            <button onClick={handleSaveChanges} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {isConfirmOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
                        <h3 className="text-xl font-bold mb-4 text-text-primary">Confirmar</h3>
                        <p className="text-text-secondary mb-8">{confirmAction.message}</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setIsConfirmOpen(false)} className="px-6 py-2.5 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button>
                            <button onClick={handleConfirm} className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartaoManual;