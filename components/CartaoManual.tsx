
import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, EditIcon, SearchIcon, DownloadIcon, ArrowLeftIcon } from './icons';
import AutocompleteInput from './AutocompleteInput';

interface Transaction {
    id: string;
    dataTransacao: string;
    transacao: string;
    valor: number;
    categoria: string;
}

interface CartaoManualProps {
    title: string;
    storageKey: string;
    onBack: () => void;
}

const formatDateToBR = (isoDate: string): string => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const formatDateToISO = (brDate: string): string => {
    if (!brDate) return '';
    const [day, month, year] = brDate.split('/');
    return `${year}-${month}-${day}`;
};

const applyDateMask = (value: string): string => value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3').replace(/(\/\d{4})\d+?$/, '$1');
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CartaoManual: React.FC<CartaoManualProps> = ({ title, storageKey, onBack }) => {
    const [transactions, setTransactions] = useState<Transaction[]>(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Partial<Transaction> & { dataTransacao_br?: string } | null>(null);
    const [monthFilter, setMonthFilter] = useState('');

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(transactions));
    }, [transactions, storageKey]);

    const uniqueDescriptions = useMemo(() => [...new Set(transactions.map(t => t.transacao).filter(Boolean))].sort(), [transactions]);
    const uniqueCategories = useMemo(() => [...new Set(transactions.map(t => t.categoria).filter(Boolean))].sort(), [transactions]);

    const uniqueMonths = useMemo(() => {
        const months = new Set<string>();
        transactions.forEach(t => {
            if (t.dataTransacao) {
                const date = new Date(t.dataTransacao);
                if (!isNaN(date.getTime())) {
                    months.add(`${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getUTCFullYear()}`);
                }
            }
        });
        return Array.from(months).sort();
    }, [transactions]);

    const handleAdd = () => {
        setEditingTransaction({ 
            dataTransacao: new Date().toISOString().split('T')[0], 
            dataTransacao_br: formatDateToBR(new Date().toISOString().split('T')[0]),
            transacao: '', categoria: '', valor: 0 
        });
        setIsModalOpen(true);
    };

    const handleEdit = (transaction: Transaction) => {
        setEditingTransaction({ ...transaction, dataTransacao_br: formatDateToBR(transaction.dataTransacao) });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Excluir lançamento?')) {
            setTransactions(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingTransaction) return;
        const { name, value } = e.target;
        if (name === 'valor') {
            const numeric = Number(value.replace(/\D/g, '')) / 100;
            setEditingTransaction(prev => ({ ...prev, valor: numeric }));
        } else if (name === 'dataTransacao_br') {
            setEditingTransaction(prev => ({ ...prev, dataTransacao_br: applyDateMask(value) }));
        } else {
            setEditingTransaction(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = () => {
        if (!editingTransaction?.transacao || !editingTransaction.dataTransacao_br) return;
        
        const transaction = { ...editingTransaction, dataTransacao: formatDateToISO(editingTransaction.dataTransacao_br) } as Transaction;
        delete (transaction as any).dataTransacao_br;

        if (transaction.id) setTransactions(prev => prev.map(t => t.id === transaction.id ? transaction : t));
        else setTransactions(prev => [...prev, { ...transaction, id: `trx-${Date.now()}` }]);
        setIsModalOpen(false);
    };

    const filteredTransactions = useMemo(() => {
        if (!monthFilter) return transactions;
        return transactions.filter(t => {
            const date = new Date(t.dataTransacao);
            const monthYear = `${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getUTCFullYear()}`;
            return monthYear === monthFilter;
        });
    }, [transactions, monthFilter]);

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-9"><ArrowLeftIcon className="h-4 w-4" /> Voltar</button>
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary">{title}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-9">
                        <option value="">Todos os Meses</option>
                        {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button onClick={handleAdd} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors h-9"><PlusIcon className="h-4 w-4" /> Lançar</button>
                </div>
            </div>

            <div className="bg-card shadow-md rounded-2xl overflow-x-auto">
                <table className="w-full text-sm text-left text-text-secondary">
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
                            filteredTransactions.map(t => (
                                <tr key={t.id} className="hover:bg-secondary transition-colors">
                                    <td className="px-6 py-4">{formatDateToBR(t.dataTransacao)}</td>
                                    <td className="px-6 py-4 font-medium text-text-primary">{t.transacao}</td>
                                    <td className="px-6 py-4">{t.categoria}</td>
                                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(t.valor)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleEdit(t)} className="text-primary p-1 rounded-full hover:bg-primary/10"><EditIcon className="h-4 w-4"/></button>
                                            <button onClick={() => handleDelete(t.id)} className="text-danger p-1 rounded-full hover:bg-danger/10"><TrashIcon className="h-4 w-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={5} className="text-center py-10">Nenhum lançamento.</td></tr>
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
                                <input name="dataTransacao_br" value={editingTransaction.dataTransacao_br || ''} onChange={handleInputChange} placeholder="DD/MM/AAAA" maxLength={10} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Descrição</label>
                                <AutocompleteInput name="transacao" value={editingTransaction.transacao || ''} onChange={handleInputChange} suggestions={uniqueDescriptions} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Categoria</label>
                                <AutocompleteInput name="categoria" value={editingTransaction.categoria || ''} onChange={handleInputChange} suggestions={uniqueCategories} placeholder="Ex: Alimentação, Transporte" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Valor</label>
                                <input name="valor" value={formatCurrency(editingTransaction.valor || 0)} onChange={handleInputChange} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartaoManual;
