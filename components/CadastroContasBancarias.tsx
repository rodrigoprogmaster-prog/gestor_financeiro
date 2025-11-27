
import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, EditIcon, ArrowLeftIcon, DatabaseIcon } from './icons';
import AutocompleteInput from './AutocompleteInput';

interface ContaBancaria {
    id: string;
    titular: string;
    cnpj: string;
    pix: string;
    banco: string;
    agencia: string;
    contaCorrente: string;
}

const CadastroContasBancarias: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const [contas, setContas] = useState<ContaBancaria[]>(() => {
        const saved = localStorage.getItem('contas_bancarias');
        return saved ? JSON.parse(saved) : [];
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingConta, setEditingConta] = useState<Partial<ContaBancaria> | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof ContaBancaria, string>>>({});

    useEffect(() => {
        localStorage.setItem('contas_bancarias', JSON.stringify(contas));
    }, [contas]);

    const uniqueTitulares = useMemo(() => [...new Set(contas.map(c => c.titular).filter(Boolean))].sort(), [contas]);
    const uniqueBancos = useMemo(() => [...new Set(contas.map(c => c.banco).filter(Boolean))].sort(), [contas]);
    const uniqueAgencias = useMemo(() => [...new Set(contas.map(c => c.agencia).filter(Boolean))].sort(), [contas]);

    const handleAdd = () => {
        setErrors({});
        setEditingConta({ titular: '', cnpj: '', pix: '', banco: '', agencia: '', contaCorrente: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (conta: ContaBancaria) => {
        setErrors({});
        setEditingConta({ ...conta });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Excluir conta?')) {
            setContas(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingConta) return;
        const { name, value } = e.target;
        setEditingConta(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof ContaBancaria]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name as keyof ContaBancaria];
                return newErrors;
            });
        }
    };

    const handleSave = () => {
        if (!editingConta) return;
        const newErrors: typeof errors = {};
        if (!editingConta.titular) newErrors.titular = 'Obrigatório';
        if (!editingConta.banco) newErrors.banco = 'Obrigatório';
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const conta = editingConta as ContaBancaria;
        if (conta.id) {
            setContas(prev => prev.map(c => c.id === conta.id ? conta : c));
        } else {
            setContas(prev => [...prev, { ...conta, id: `conta-${Date.now()}` }]);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    {onBack && <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-9"><ArrowLeftIcon className="h-4 w-4" /> Voltar</button>}
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Contas Bancárias</h2>
                </div>
                <button onClick={handleAdd} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors h-9"><PlusIcon className="h-4 w-4" /> Nova Conta</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contas.map(conta => (
                    <div key={conta.id} className="bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all group relative">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-full bg-secondary border border-border">
                                <DatabaseIcon className="h-6 w-6 text-primary"/>
                            </div>
                            <h3 className="font-bold text-lg text-text-primary">{conta.titular}</h3>
                        </div>
                        <div className="space-y-2 text-sm text-text-secondary">
                            <p><span className="font-semibold text-text-primary">Banco:</span> {conta.banco}</p>
                            <p><span className="font-semibold text-text-primary">Agência:</span> {conta.agencia}</p>
                            <p><span className="font-semibold text-text-primary">C/C:</span> {conta.contaCorrente}</p>
                            {conta.pix && <p><span className="font-semibold text-text-primary">PIX:</span> {conta.pix}</p>}
                            {conta.cnpj && <p><span className="font-semibold text-text-primary">CNPJ:</span> {conta.cnpj}</p>}
                        </div>
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(conta)} className="p-2 rounded-full bg-secondary hover:bg-border text-primary"><EditIcon className="h-4 w-4"/></button>
                            <button onClick={() => handleDelete(conta.id)} className="p-2 rounded-full bg-secondary hover:bg-border text-danger"><TrashIcon className="h-4 w-4"/></button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && editingConta && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
                        <h3 className="text-2xl font-bold mb-6 text-text-primary text-center">{editingConta.id ? 'Editar Conta' : 'Adicionar Nova Conta'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">TITULAR</label>
                                <AutocompleteInput 
                                    name="titular"
                                    value={editingConta.titular || ''}
                                    onChange={handleInputChange}
                                    suggestions={uniqueTitulares}
                                    className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none ${errors.titular ? 'border-danger' : ''}`} 
                                />
                                {errors.titular && <p className="text-danger text-xs mt-1 ml-1">{errors.titular}</p>}
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">CNPJ</label>
                                <input name="cnpj" value={editingConta.cnpj || ''} onChange={handleInputChange} maxLength={18} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">PIX</label>
                                <input name="pix" value={editingConta.pix || ''} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">BANCO</label>
                                <AutocompleteInput 
                                    name="banco"
                                    value={editingConta.banco || ''}
                                    onChange={handleInputChange}
                                    suggestions={uniqueBancos}
                                    className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none ${errors.banco ? 'border-danger' : ''}`} 
                                />
                                {errors.banco && <p className="text-danger text-xs mt-1 ml-1">{errors.banco}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">AGENCIA</label>
                                    <AutocompleteInput 
                                        name="agencia"
                                        value={editingConta.agencia || ''}
                                        onChange={handleInputChange}
                                        suggestions={uniqueAgencias}
                                        className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">C/C</label>
                                    <input name="contaCorrente" value={editingConta.contaCorrente || ''} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-center gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CadastroContasBancarias;
