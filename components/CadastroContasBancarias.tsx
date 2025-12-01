
import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, EditIcon, ArrowLeftIcon, CopyIcon, CheckIcon } from './icons';
import { useHideSidebarOnModal } from '../UIContext';

// Data structure for a bank account
interface ContaBancaria {
  id: string;
  titular: string;
  cnpj: string;
  pix: string;
  banco: string;
  agencia: string;
  contaCorrente: string; // Represents C/C
}

// Mock data to start with if no data is in local storage
const initialContas: ContaBancaria[] = [
  { id: '1', titular: 'Empresa Exemplo LTDA', cnpj: '12.345.678/0001-99', pix: 'contato@empresa.com', banco: 'Banco do Brasil', agencia: '1234-5', contaCorrente: '98765-4' },
  { id: '2', titular: 'Comércio Varejista S.A.', cnpj: '98.765.432/0001-11', pix: 'financeiro@comercio.com', banco: 'Itaú Unibanco', agencia: '5678-9', contaCorrente: '12345-6' },
];

type ContaErrors = Partial<Record<keyof Omit<ContaBancaria, 'id'>, string>>;

const newContaTemplate: Omit<ContaBancaria, 'id'> = {
  titular: '',
  cnpj: '',
  pix: '',
  banco: '',
  agencia: '',
  contaCorrente: '',
};

const applyCnpjMask = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
};

const CadastroContasBancarias: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const STORAGE_KEY = 'contas_bancarias';
    const [contas, setContas] = useState<ContaBancaria[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : initialContas;
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingConta, setEditingConta] = useState<Partial<ContaBancaria> | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [errors, setErrors] = useState<ContaErrors>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    useHideSidebarOnModal(isModalOpen || isConfirmOpen);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(contas));
    }, [contas]);

    const filteredContas = useMemo(() => {
        return contas.filter(conta => 
            conta.titular.toLowerCase().includes(searchTerm.toLowerCase()) ||
            conta.banco.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contas, searchTerm]);

    const handleCopyPix = (id: string, pix: string) => {
        navigator.clipboard.writeText(pix);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleRowDoubleClick = (conta: ContaBancaria) => {
        const textToCopy = [
            `Titular: ${conta.titular}`,
            `Banco: ${conta.banco}`,
            `Agência: ${conta.agencia}`,
            `Conta: ${conta.contaCorrente}`,
            `PIX: ${conta.pix}`,
            `CNPJ: ${conta.cnpj}`
        ].join('\n');

        navigator.clipboard.writeText(textToCopy).then(() => {
            setNotification('Dados da conta copiados!');
            setTimeout(() => setNotification(null), 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    };

    const handleOpenAddModal = () => {
        setErrors({});
        setEditingConta({ ...newContaTemplate });
        setIsModalOpen(true);
    };

    const handleEditClick = (conta: ContaBancaria) => {
        setErrors({});
        setEditingConta({ ...conta });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        const action = () => setContas(prev => prev.filter(c => c.id !== id));
        setConfirmAction({ action, message: 'Tem certeza que deseja excluir esta conta?' });
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingConta(null);
        setErrors({});
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingConta) return;
        const { name, value } = e.target;
        let formattedValue = value;
        
        if (name === 'cnpj') {
            formattedValue = applyCnpjMask(value);
        }

        setEditingConta(prev => ({ ...prev, [name]: formattedValue }));
        
        if (errors[name as keyof ContaErrors]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name as keyof ContaErrors];
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        if (!editingConta) return false;
        const newErrors: ContaErrors = {};
        if (!editingConta.titular?.trim()) newErrors.titular = "Titular é obrigatório.";
        if (!editingConta.banco?.trim()) newErrors.banco = "Banco é obrigatório.";
        if (!editingConta.agencia?.trim()) newErrors.agencia = "Agência é obrigatória.";
        if (!editingConta.contaCorrente?.trim()) newErrors.contaCorrente = "Conta Corrente é obrigatória.";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveChanges = () => {
        if (!validate() || !editingConta) return;
        const contaToSave = { ...editingConta };

        const action = () => {
            if (contaToSave.id) {
                setContas(prev => prev.map(c => c.id === contaToSave.id ? (contaToSave as ContaBancaria) : c));
            } else {
                setContas(prev => [...prev, { ...contaToSave, id: `conta-${Date.now()}` } as ContaBancaria]);
            }
            handleCloseModal();
        };

        setConfirmAction({
            action,
            message: contaToSave.id ? 'Deseja salvar as alterações?' : 'Deseja adicionar esta conta?'
        });
        setIsConfirmOpen(true);
    };

    const handleConfirm = () => {
        if (confirmAction.action) confirmAction.action();
        setIsConfirmOpen(false);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full max-w-[1600px] mx-auto">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10 text-sm">
                            <ArrowLeftIcon className="h-4 w-4" />
                            Voltar
                        </button>
                    )}
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Contas Bancárias</h2>
                </div>
                <button 
                    onClick={handleOpenAddModal} 
                    className="flex items-center gap-2 bg-white border border-gray-200 text-primary font-bold py-2 px-4 rounded-full hover:bg-orange-50 hover:border-orange-200 transition-colors h-10 text-sm shadow-sm"
                >
                    <PlusIcon className="h-4 w-4" /> Nova Conta
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-card p-3 rounded-2xl border border-border shadow-sm mb-6 flex items-center">
                <div className="relative w-full sm:w-80">
                    <input 
                        type="text" 
                        placeholder="Buscar por titular ou banco..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2 bg-secondary border-transparent rounded-xl text-sm text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-10"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-4 w-4 text-text-secondary"/>
                    </div>
                </div>
                <div className="ml-auto text-xs text-text-secondary hidden sm:block">
                    Dica: Clique duas vezes para copiar
                </div>
            </div>

            {/* Accounts Table */}
            <div className="bg-white border border-border rounded-2xl overflow-hidden flex-grow shadow-sm flex flex-col">
                <div className="overflow-x-auto overflow-y-auto flex-grow custom-scrollbar">
                    <table className="min-w-full divide-y divide-border text-sm text-left">
                        <thead className="bg-gray-50 text-text-secondary font-semibold uppercase text-xs tracking-wider sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3">Titular</th>
                                <th className="px-6 py-3">Banco</th>
                                <th className="px-6 py-3">Agência</th>
                                <th className="px-6 py-3">Conta</th>
                                <th className="px-6 py-3">PIX</th>
                                <th className="px-6 py-3">CNPJ / CPF</th>
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                            {filteredContas.length > 0 ? (
                                filteredContas.map((conta) => (
                                    <tr 
                                        key={conta.id} 
                                        className="hover:bg-gray-50 transition-colors group cursor-pointer"
                                        onDoubleClick={() => handleRowDoubleClick(conta)}
                                        title="Clique duas vezes para copiar"
                                    >
                                        <td className="px-6 py-3 font-medium text-text-primary whitespace-nowrap">{conta.titular}</td>
                                        <td className="px-6 py-3 text-text-secondary whitespace-nowrap">{conta.banco}</td>
                                        <td className="px-6 py-3 text-text-secondary whitespace-nowrap">{conta.agencia}</td>
                                        <td className="px-6 py-3 text-text-secondary whitespace-nowrap">{conta.contaCorrente}</td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-text-secondary truncate max-w-[150px]" title={conta.pix}>{conta.pix}</span>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleCopyPix(conta.id, conta.pix); }}
                                                    className="text-text-secondary hover:text-primary transition-colors"
                                                    title="Copiar PIX"
                                                >
                                                    {copiedId === conta.id ? <CheckIcon className="h-4 w-4 text-success" /> : <CopyIcon className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-text-secondary whitespace-nowrap">{conta.cnpj}</td>
                                        <td className="px-6 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); handleEditClick(conta); }} className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors" title="Editar">
                                                    <EditIcon className="h-4 w-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(conta.id); }} className="p-1.5 rounded-md text-danger hover:bg-danger/10 transition-colors" title="Excluir">
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-16">
                                        <div className="flex flex-col items-center justify-center text-text-secondary opacity-60">
                                            <SearchIcon className="h-10 w-10 mb-3" />
                                            <p className="text-lg font-medium">Nenhuma conta encontrada</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {isModalOpen && editingConta && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="shrink-0 p-6 pb-4 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-text-primary text-center">
                                {editingConta.id ? 'Editar Conta' : 'Nova Conta Bancária'}
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Titular da Conta</label>
                                <input name="titular" value={editingConta.titular || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.titular ? 'border-danger' : ''}`} placeholder="Nome da empresa ou titular" />
                                {errors.titular && <p className="text-danger text-xs mt-1 ml-1">{errors.titular}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">CNPJ / CPF</label>
                                <input name="cnpj" value={editingConta.cnpj || ''} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12" placeholder="00.000.000/0000-00" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Banco</label>
                                    <input name="banco" value={editingConta.banco || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.banco ? 'border-danger' : ''}`} placeholder="Ex: Banco do Brasil" />
                                    {errors.banco && <p className="text-danger text-xs mt-1 ml-1">{errors.banco}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Chave PIX</label>
                                    <input name="pix" value={editingConta.pix || ''} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12" placeholder="Chave PIX" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Agência</label>
                                    <input name="agencia" value={editingConta.agencia || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.agencia ? 'border-danger' : ''}`} placeholder="0000-0" />
                                    {errors.agencia && <p className="text-danger text-xs mt-1 ml-1">{errors.agencia}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Conta Corrente</label>
                                    <input name="contaCorrente" value={editingConta.contaCorrente || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.contaCorrente ? 'border-danger' : ''}`} placeholder="00000-0" />
                                    {errors.contaCorrente && <p className="text-danger text-xs mt-1 ml-1">{errors.contaCorrente}</p>}
                                </div>
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
                        <h3 className="text-xl font-bold mb-4 text-text-primary">Confirmar Ação</h3>
                        <p className="text-text-secondary mb-8">{confirmAction.message}</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setIsConfirmOpen(false)} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-text-primary font-semibold hover:bg-gray-50 transition-colors shadow-sm">Cancelar</button>
                            <button onClick={handleConfirm} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-primary font-bold shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div className="fixed bottom-8 right-8 py-3 px-6 rounded-xl shadow-lg animate-fade-in z-50 font-medium text-white bg-gray-900/90 backdrop-blur-sm border border-gray-700">
                    {notification}
                </div>
            )}
        </div>
    );
};

export default CadastroContasBancarias;
