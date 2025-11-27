
import React, { useState, useMemo, useEffect } from 'react';
import TransferenciasEmpresas from './TransferenciasEmpresas';
import AutorizacaoPagamento from './AutorizacaoPagamento';
import { TrashIcon, EditIcon, PlusIcon } from './icons';
import AutocompleteInput from './AutocompleteInput';

interface Pagamento {
    id: string;
    data: string;
    empresa: string;
    tipo: string;
    valor: number;
}

const LOCAL_STORAGE_KEY = 'pagamentos_cristiano';

const formatDateToBR = (isoDate: string) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const PagamentosCristiano: React.FC = () => {
    const [pagamentos, setPagamentos] = useState<Pagamento[]>(() => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]'));
    const [activeTab, setActiveTab] = useState<'pagamentos' | 'transferencias' | 'autorizacao'>('pagamentos');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPagamento, setEditingPagamento] = useState<Partial<Pagamento> | null>(null);

    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pagamentos)); }, [pagamentos]);

    const uniqueEmpresas = useMemo(() => [...new Set(pagamentos.map(p => p.empresa).filter(Boolean))].sort(), [pagamentos]);

    const handleAdd = () => {
        setEditingPagamento({ data: new Date().toISOString().split('T')[0], empresa: '', tipo: '', valor: 0 });
        setIsEditModalOpen(true);
    };

    const handleEdit = (p: Pagamento) => {
        setEditingPagamento(p);
        setIsEditModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Excluir pagamento?')) {
            setPagamentos(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingPagamento) return;
        const { name, value } = e.target;
        if (name === 'valor') {
            const numeric = Number(value.replace(/\D/g, '')) / 100;
            setEditingPagamento(prev => ({ ...prev, valor: numeric }));
        } else {
            setEditingPagamento(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = () => {
        if (!editingPagamento) return;
        const p = editingPagamento as Pagamento;
        if (p.id) setPagamentos(prev => prev.map(x => x.id === p.id ? p : x));
        else setPagamentos(prev => [...prev, { ...p, id: `pay-${Date.now()}` }]);
        setIsEditModalOpen(false);
    };

    return (
        <div className="p-4 sm:p-6 w-full h-full overflow-y-auto">
            <div className="flex gap-4 mb-6 border-b border-border pb-2">
                <button onClick={() => setActiveTab('pagamentos')} className={`pb-2 ${activeTab === 'pagamentos' ? 'border-b-2 border-primary font-bold text-primary' : 'text-text-secondary'}`}>Pagamentos</button>
                <button onClick={() => setActiveTab('transferencias')} className={`pb-2 ${activeTab === 'transferencias' ? 'border-b-2 border-primary font-bold text-primary' : 'text-text-secondary'}`}>Transferências</button>
                <button onClick={() => setActiveTab('autorizacao')} className={`pb-2 ${activeTab === 'autorizacao' ? 'border-b-2 border-primary font-bold text-primary' : 'text-text-secondary'}`}>Autorização</button>
            </div>

            {activeTab === 'pagamentos' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <button onClick={handleAdd} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover h-9"><PlusIcon className="h-4 w-4" /> Novo Pagamento</button>
                    </div>
                    <div className="bg-card shadow-sm rounded-2xl overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-secondary text-text-secondary uppercase">
                                <tr>
                                    <th className="px-6 py-3">Data</th>
                                    <th className="px-6 py-3">Empresa</th>
                                    <th className="px-6 py-3">Banco/Tipo</th>
                                    <th className="px-6 py-3 text-right">Valor</th>
                                    <th className="px-6 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {pagamentos.map(p => (
                                    <tr key={p.id} className="hover:bg-secondary">
                                        <td className="px-6 py-4">{formatDateToBR(p.data)}</td>
                                        <td className="px-6 py-4">{p.empresa}</td>
                                        <td className="px-6 py-4">{p.tipo}</td>
                                        <td className="px-6 py-4 text-right">{p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="px-6 py-4 text-center flex justify-center gap-2">
                                            <button onClick={() => handleEdit(p)} className="text-primary p-1 hover:bg-primary/10 rounded"><EditIcon className="h-4 w-4"/></button>
                                            <button onClick={() => handleDelete(p.id)} className="text-danger p-1 hover:bg-danger/10 rounded"><TrashIcon className="h-4 w-4"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'transferencias' && <TransferenciasEmpresas storageKeySuffix="_cristiano" />}
            {activeTab === 'autorizacao' && <AutorizacaoPagamento storageKeySuffix="_cristiano" />}

            {isEditModalOpen && editingPagamento && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
                        <h3 className="text-xl font-bold mb-4">{editingPagamento.id ? 'Editar' : 'Novo'} Pagamento</h3>
                        <div className="space-y-4">
                            <input type="date" name="data" value={editingPagamento.data} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                            <AutocompleteInput name="empresa" value={editingPagamento.empresa} onChange={handleInputChange} suggestions={uniqueEmpresas} placeholder="Empresa" className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                            <input type="text" name="tipo" placeholder="Banco / Tipo" value={editingPagamento.tipo} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                            <input type="text" name="valor" value={editingPagamento.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 outline-none" />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-lg bg-secondary">Cancelar</button>
                            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-white">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PagamentosCristiano;
