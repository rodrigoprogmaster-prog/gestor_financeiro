
import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, EditIcon } from './icons';
import AutocompleteInput from './AutocompleteInput';

interface Previsao {
    id: string;
    data: string;
    semana: string;
    empresa: string;
    tipo: string; // Banco
    receitas: number;
    despesas: number;
}

const PREDEFINED_ENTRIES = [
    { empresa: 'PXT' }, { empresa: 'SJB' }, { empresa: 'CSJ' }, { empresa: 'MMA' }, { empresa: 'FIBER' }
];
const FIXED_BANKS = ['Inter', 'BB', 'Santander', 'Itaú', 'Caixa'];

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const PrevisaoFabrica: React.FC = () => {
    const [previsoes, setPrevisoes] = useState<Previsao[]>(() => {
        const saved = localStorage.getItem('previsoes');
        return saved ? JSON.parse(saved) : [];
    });
    const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [newEntry, setNewEntry] = useState<Partial<Previsao>>({ data: '', semana: '', empresa: '', tipo: '', receitas: 0, despesas: 0 });
    const [editingPrevisao, setEditingPrevisao] = useState<Previsao | null>(null);
    const [closedDates, setClosedDates] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem('closedDates') || '[]')));

    useEffect(() => { localStorage.setItem('previsoes', JSON.stringify(previsoes)); }, [previsoes]);
    useEffect(() => { localStorage.setItem('closedDates', JSON.stringify(Array.from(closedDates))); }, [closedDates]);

    const uniqueEmpresas = useMemo(() => {
        const fromHistory = new Set(previsoes.map(p => p.empresa).filter(Boolean));
        PREDEFINED_ENTRIES.forEach(e => fromHistory.add(e.empresa));
        return Array.from(fromHistory).sort();
    }, [previsoes]);

    const uniqueBancos = useMemo(() => {
        const fromHistory = new Set(previsoes.map(p => p.tipo).filter(Boolean));
        FIXED_BANKS.forEach(b => fromHistory.add(b));
        return Array.from(fromHistory).sort();
    }, [previsoes]);

    const handleNewEntryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'receitas' || name === 'despesas') {
            const numeric = Number(value.replace(/\D/g, '')) / 100;
            setNewEntry(prev => ({ ...prev, [name]: numeric }));
        } else {
            setNewEntry(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAddNewEntry = () => {
        if (!newEntry.empresa || !newEntry.data) return;
        setPrevisoes(prev => [...prev, { ...newEntry, id: `prev-${Date.now()}` } as Previsao]);
        setIsAddEntryModalOpen(false);
        setNewEntry({ data: '', semana: '', empresa: '', tipo: '', receitas: 0, despesas: 0 });
    };

    const handleEditClick = (previsao: Previsao) => {
        setEditingPrevisao(previsao);
        setIsEditModalOpen(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingPrevisao) return;
        const { name, value } = e.target;
        if (name === 'receitas' || name === 'despesas') {
            const numeric = Number(value.replace(/\D/g, '')) / 100;
            setEditingPrevisao(prev => ({ ...prev!, [name]: numeric }));
        } else {
            setEditingPrevisao(prev => ({ ...prev!, [name]: value }));
        }
    };

    const handleSaveChanges = () => {
        if (!editingPrevisao) return;
        setPrevisoes(prev => prev.map(p => p.id === editingPrevisao.id ? editingPrevisao : p));
        setIsEditModalOpen(false);
    };

    const handleCloseModal = () => {
        setIsEditModalOpen(false);
        setEditingPrevisao(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Excluir previsão?')) {
            setPrevisoes(prev => prev.filter(p => p.id !== id));
        }
    };

    return (
        <div className="p-4 sm:p-6 w-full h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-text-primary">Previsão Fábrica</h3>
                <button onClick={() => setIsAddEntryModalOpen(true)} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors h-9"><PlusIcon className="h-4 w-4" /> Adicionar</button>
            </div>

            <div className="bg-card shadow-sm rounded-2xl overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-secondary text-text-secondary uppercase">
                        <tr>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Semana</th>
                            <th className="px-6 py-3">Empresa</th>
                            <th className="px-6 py-3">Banco</th>
                            <th className="px-6 py-3 text-right">Receitas</th>
                            <th className="px-6 py-3 text-right">Despesas</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {previsoes.map(p => (
                            <tr key={p.id} className="hover:bg-secondary transition-colors">
                                <td className="px-6 py-4">{new Date(p.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                <td className="px-6 py-4">{p.semana}</td>
                                <td className="px-6 py-4">{p.empresa}</td>
                                <td className="px-6 py-4">{p.tipo}</td>
                                <td className="px-6 py-4 text-right text-success">{formatCurrency(p.receitas)}</td>
                                <td className="px-6 py-4 text-right text-danger">{formatCurrency(p.despesas)}</td>
                                <td className="px-6 py-4 text-center flex justify-center gap-2">
                                    <button onClick={() => handleEditClick(p)} className="text-primary p-1 rounded hover:bg-primary/10"><EditIcon className="h-4 w-4"/></button>
                                    <button onClick={() => handleDelete(p.id)} className="text-danger p-1 rounded hover:bg-danger/10"><TrashIcon className="h-4 w-4"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isAddEntryModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
                        <h3 className="text-xl font-bold mb-4">Adicionar Lançamento</h3>
                        <div className="space-y-4">
                            <input type="date" name="data" value={newEntry.data} onChange={handleNewEntryChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                            <input type="text" name="semana" placeholder="Semana" value={newEntry.semana} onChange={handleNewEntryChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                            <AutocompleteInput name="empresa" value={newEntry.empresa} onChange={handleNewEntryChange} suggestions={uniqueEmpresas} placeholder="Empresa" className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                            <AutocompleteInput name="tipo" value={newEntry.tipo} onChange={handleNewEntryChange} suggestions={uniqueBancos} placeholder="Banco" className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                            <input type="text" name="receitas" value={formatCurrency(newEntry.receitas || 0)} onChange={handleNewEntryChange} placeholder="Receitas" className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                            <input type="text" name="despesas" value={formatCurrency(newEntry.despesas || 0)} onChange={handleNewEntryChange} placeholder="Despesas" className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsAddEntryModalOpen(false)} className="px-4 py-2 rounded-lg bg-secondary">Cancelar</button>
                            <button onClick={handleAddNewEntry} className="px-4 py-2 rounded-lg bg-primary text-white">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && editingPrevisao && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
                        <h3 className="text-xl font-bold mb-4">Editar Previsão</h3>
                        <div className="space-y-4">
                            <input type="date" name="data" value={editingPrevisao.data} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                            <input type="text" name="semana" value={editingPrevisao.semana} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                            <AutocompleteInput name="empresa" value={editingPrevisao.empresa} onChange={handleInputChange} suggestions={uniqueEmpresas} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                            <AutocompleteInput name="tipo" value={editingPrevisao.tipo} onChange={handleInputChange} suggestions={uniqueBancos} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                            <input type="text" name="receitas" value={formatCurrency(editingPrevisao.receitas)} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                            <input type="text" name="despesas" value={formatCurrency(editingPrevisao.despesas)} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={handleCloseModal} className="px-4 py-2 rounded-lg bg-secondary">Cancelar</button>
                            <button onClick={handleSaveChanges} className="px-4 py-2 rounded-lg bg-primary text-white">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
