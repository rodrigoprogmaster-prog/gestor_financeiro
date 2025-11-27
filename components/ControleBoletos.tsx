
import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, EditIcon, CheckIcon, ArrowLeftIcon, ChevronDownIcon, RefreshIcon, ClipboardCheckIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import AutocompleteInput from './AutocompleteInput';

enum StatusBoleto {
    A_PAGAR = 'A Pagar',
    PAGO = 'Pago'
}

interface BoletoPagar {
    id: string;
    fornecedor: string;
    pagador: string;
    vencimento: string;
    valor: number;
    pago: boolean;
}

interface DespesaRecorrente {
    id: string;
    empresa: string;
    descricao: string;
    diaVencimento: number;
    status: 'Lançado' | 'Pendente';
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

const STORAGE_KEY = 'boletos_a_pagar_data';
const STORAGE_KEY_RECORRENTES = 'despesas_recorrentes_data';
const ITEMS_PER_PAGE = 20;

const ControleBoletos: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const [activeView, setActiveView] = useState<'boletos' | 'recorrentes'>('boletos');
    const [boletos, setBoletos] = useState<BoletoPagar[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    const [despesasRecorrentes, setDespesasRecorrentes] = useState<DespesaRecorrente[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEY_RECORRENTES) || '[]'));
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBoleto, setEditingBoleto] = useState<Partial<BoletoPagar> & { vencimento_br?: string } | null>(null);
    const [editingDespesa, setEditingDespesa] = useState<Partial<DespesaRecorrente> | null>(null);
    const [boletoErrors, setBoletoErrors] = useState<any>({});
    const [despesaErrors, setDespesaErrors] = useState<any>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'Todos' | 'A Pagar' | 'Pago'>('A Pagar');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(boletos)); }, [boletos]);
    useEffect(() => { localStorage.setItem(STORAGE_KEY_RECORRENTES, JSON.stringify(despesasRecorrentes)); }, [despesasRecorrentes]);
    useEffect(() => { setCurrentPage(1); }, [activeView, searchTerm, statusFilter]);

    const uniqueFornecedores = useMemo(() => [...new Set(boletos.map(b => b.fornecedor))].sort(), [boletos]);
    const uniquePagadores = useMemo(() => [...new Set(boletos.map(b => b.pagador))].sort(), [boletos]);
    const uniqueEmpresas = useMemo(() => [...new Set(despesasRecorrentes.map(d => d.empresa))].sort(), [despesasRecorrentes]);
    const uniqueDescricoes = useMemo(() => [...new Set(despesasRecorrentes.map(d => d.descricao))].sort(), [despesasRecorrentes]);

    const filteredItems = useMemo(() => {
        if (activeView === 'boletos') {
            return boletos.filter(b => {
                const matchSearch = !searchTerm || b.fornecedor.toLowerCase().includes(searchTerm.toLowerCase());
                const matchStatus = statusFilter === 'Todos' ? true : statusFilter === 'Pago' ? b.pago : !b.pago;
                return matchSearch && matchStatus;
            }).sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
        } else {
            return despesasRecorrentes.filter(d => 
                !searchTerm || d.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || d.empresa.toLowerCase().includes(searchTerm.toLowerCase())
            ).sort((a, b) => a.diaVencimento - b.diaVencimento);
        }
    }, [activeView, boletos, despesasRecorrentes, searchTerm, statusFilter]);

    const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

    const handleAdd = () => {
        setBoletoErrors({});
        setDespesaErrors({});
        if (activeView === 'boletos') {
            setEditingBoleto({ fornecedor: '', pagador: '', vencimento: new Date().toISOString().split('T')[0], vencimento_br: formatDateToBR(new Date().toISOString().split('T')[0]), valor: 0, pago: false });
            setEditingDespesa(null);
        } else {
            setEditingDespesa({ empresa: '', descricao: '', diaVencimento: 10, status: 'Pendente' });
            setEditingBoleto(null);
        }
        setIsModalOpen(true);
    };

    const handleEdit = (item: any) => {
        setBoletoErrors({});
        setDespesaErrors({});
        if (activeView === 'boletos') {
            setEditingBoleto({ ...item, vencimento_br: formatDateToBR(item.vencimento) });
            setEditingDespesa(null);
        } else {
            setEditingDespesa({ ...item });
            setEditingBoleto(null);
        }
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza?')) {
            if (activeView === 'boletos') setBoletos(prev => prev.filter(b => b.id !== id));
            else setDespesasRecorrentes(prev => prev.filter(d => d.id !== id));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (activeView === 'boletos' && editingBoleto) {
            if (name === 'valor') {
                const numeric = Number(value.replace(/\D/g, '')) / 100;
                setEditingBoleto(prev => ({ ...prev!, valor: numeric }));
            } else if (name === 'vencimento_br') {
                setEditingBoleto(prev => ({ ...prev!, vencimento_br: applyDateMask(value) }));
            } else {
                setEditingBoleto(prev => ({ ...prev!, [name]: value }));
            }
        } else if (activeView === 'recorrentes' && editingDespesa) {
            if (name === 'diaVencimento') {
                setEditingDespesa(prev => ({ ...prev!, diaVencimento: Number(value) }));
            } else {
                setEditingDespesa(prev => ({ ...prev!, [name]: value }));
            }
        }
    };

    const handleSave = () => {
        if (activeView === 'boletos' && editingBoleto) {
            const errors: any = {};
            if (!editingBoleto.fornecedor) errors.fornecedor = 'Obrigatório';
            if (!editingBoleto.pagador) errors.pagador = 'Obrigatório';
            if (!editingBoleto.vencimento_br) errors.vencimento = 'Obrigatório';
            setBoletoErrors(errors);
            if (Object.keys(errors).length > 0) return;

            const boleto = { ...editingBoleto, vencimento: formatDateToISO(editingBoleto.vencimento_br!) } as BoletoPagar;
            delete (boleto as any).vencimento_br;
            if (boleto.id) setBoletos(prev => prev.map(b => b.id === boleto.id ? boleto : b));
            else setBoletos(prev => [...prev, { ...boleto, id: `bol-${Date.now()}` }]);
        } else if (activeView === 'recorrentes' && editingDespesa) {
            const errors: any = {};
            if (!editingDespesa.empresa) errors.empresa = 'Obrigatório';
            if (!editingDespesa.descricao) errors.descricao = 'Obrigatório';
            setDespesaErrors(errors);
            if (Object.keys(errors).length > 0) return;

            const despesa = editingDespesa as DespesaRecorrente;
            if (despesa.id) setDespesasRecorrentes(prev => prev.map(d => d.id === despesa.id ? despesa : d));
            else setDespesasRecorrentes(prev => [...prev, { ...despesa, id: `rec-${Date.now()}` }]);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    {onBack && <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-9"><ArrowLeftIcon className="h-4 w-4" /> Voltar</button>}
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Boletos a Pagar</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setActiveView('boletos')} className={`px-4 py-2 rounded-full font-bold transition-colors ${activeView === 'boletos' ? 'bg-primary text-white' : 'bg-secondary text-text-primary'}`}>Boletos</button>
                    <button onClick={() => setActiveView('recorrentes')} className={`px-4 py-2 rounded-full font-bold transition-colors ${activeView === 'recorrentes' ? 'bg-primary text-white' : 'bg-secondary text-text-primary'}`}>Recorrentes</button>
                </div>
                <button onClick={handleAdd} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors h-9"><PlusIcon className="h-4 w-4" /> Novo</button>
            </div>

            <div className="flex justify-between mb-4 gap-4 bg-white p-3 rounded-2xl border border-border">
                <div className="relative flex-grow"><input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"/><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary"/></div>
                {activeView === 'boletos' && (
                    <div className="flex gap-2">
                        <button onClick={() => setStatusFilter('A Pagar')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusFilter === 'A Pagar' ? 'bg-primary text-white' : 'bg-secondary'}`}>A Pagar</button>
                        <button onClick={() => setStatusFilter('Pago')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusFilter === 'Pago' ? 'bg-success text-white' : 'bg-secondary'}`}>Pagos</button>
                        <button onClick={() => setStatusFilter('Todos')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusFilter === 'Todos' ? 'bg-gray-600 text-white' : 'bg-secondary'}`}>Todos</button>
                    </div>
                )}
            </div>

            <div className="bg-card shadow-sm rounded-2xl overflow-hidden flex flex-col flex-grow border border-border">
                <div className="overflow-x-auto flex-grow">
                    <table className="min-w-full divide-y divide-border text-sm text-left">
                        <thead className="bg-secondary text-xs uppercase font-medium text-text-secondary sticky top-0 z-10">
                            <tr>
                                {activeView === 'boletos' ? (
                                    <>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Vencimento</th>
                                        <th className="px-6 py-3">Fornecedor</th>
                                        <th className="px-6 py-3">Pagador</th>
                                        <th className="px-6 py-3 text-right">Valor</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-3">Dia Venc.</th>
                                        <th className="px-6 py-3">Empresa</th>
                                        <th className="px-6 py-3">Descrição</th>
                                        <th className="px-6 py-3">Status Próx.</th>
                                    </>
                                )}
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                            {paginatedItems.map((item: any) => (
                                <tr key={item.id} className="hover:bg-secondary transition-colors">
                                    {activeView === 'boletos' ? (
                                        <>
                                            <td className="px-6 py-4"><button onClick={() => setBoletos(prev => prev.map(b => b.id === item.id ? { ...b, pago: !b.pago } : b))} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${item.pago ? 'bg-success/20 text-success border-success/30' : 'bg-danger/20 text-danger border-danger/30'}`}>{item.pago ? 'Pago' : 'A Pagar'}</button></td>
                                            <td className="px-6 py-4">{formatDateToBR(item.vencimento)}</td>
                                            <td className="px-6 py-4 font-medium">{item.fornecedor}</td>
                                            <td className="px-6 py-4">{item.pagador}</td>
                                            <td className="px-6 py-4 text-right font-semibold">{formatCurrency(item.valor)}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 font-medium">Dia {item.diaVencimento}</td>
                                            <td className="px-6 py-4">{item.empresa}</td>
                                            <td className="px-6 py-4">{item.descricao}</td>
                                            <td className="px-6 py-4">{item.status}</td>
                                        </>
                                    )}
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleEdit(item)} className="text-primary p-1 rounded-full hover:bg-primary/10"><EditIcon className="h-4 w-4"/></button>
                                            <button onClick={() => handleDelete(item.id)} className="text-danger p-1 rounded-full hover:bg-danger/10"><TrashIcon className="h-4 w-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 overflow-visible">
                        <h3 className="text-2xl font-bold text-text-primary mb-6 text-center">
                            {activeView === 'boletos' 
                                ? (editingBoleto?.id ? 'Editar Boleto' : 'Novo Boleto')
                                : (editingDespesa?.id ? 'Editar Despesa' : 'Nova Despesa Recorrente')}
                        </h3>
                        
                        <div className="space-y-4">
                            {activeView === 'boletos' && editingBoleto ? (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Fornecedor</label>
                                        <AutocompleteInput 
                                            name="fornecedor" 
                                            value={editingBoleto.fornecedor || ''} 
                                            onChange={handleInputChange} 
                                            suggestions={uniqueFornecedores}
                                            className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${boletoErrors.fornecedor ? 'border-danger' : ''}`} 
                                        />
                                        {boletoErrors.fornecedor && <p className="text-danger text-xs mt-1 ml-1">{boletoErrors.fornecedor}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Pagador</label>
                                        <AutocompleteInput 
                                            name="pagador" 
                                            value={editingBoleto.pagador || ''} 
                                            onChange={handleInputChange} 
                                            suggestions={uniquePagadores}
                                            className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${boletoErrors.pagador ? 'border-danger' : ''}`} 
                                        />
                                        {boletoErrors.pagador && <p className="text-danger text-xs mt-1 ml-1">{boletoErrors.pagador}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Vencimento</label>
                                            <input name="vencimento_br" value={editingBoleto.vencimento_br || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${boletoErrors.vencimento ? 'border-danger' : ''}`} placeholder="DD/MM/AAAA" />
                                            {boletoErrors.vencimento && <p className="text-danger text-xs mt-1 ml-1">{boletoErrors.vencimento}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Valor</label>
                                            <input name="valor" value={formatCurrency(editingBoleto.valor || 0)} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12" />
                                        </div>
                                    </div>
                                </>
                            ) : editingDespesa ? (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Empresa</label>
                                        <AutocompleteInput 
                                            name="empresa" 
                                            value={editingDespesa.empresa || ''} 
                                            onChange={handleInputChange} 
                                            suggestions={uniqueEmpresas}
                                            className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${despesaErrors.empresa ? 'border-danger' : ''}`} 
                                        />
                                        {despesaErrors.empresa && <p className="text-danger text-xs mt-1 ml-1">{despesaErrors.empresa}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Despesa (Descrição)</label>
                                        <AutocompleteInput 
                                            name="descricao" 
                                            value={editingDespesa.descricao || ''} 
                                            onChange={handleInputChange} 
                                            suggestions={uniqueDescricoes}
                                            className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${despesaErrors.descricao ? 'border-danger' : ''}`} 
                                        />
                                        {despesaErrors.descricao && <p className="text-danger text-xs mt-1 ml-1">{despesaErrors.descricao}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Dia Venc.</label>
                                            <input type="number" name="diaVencimento" value={editingDespesa.diaVencimento || ''} onChange={handleInputChange} min="1" max="31" className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12" />
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>
                        <div className="flex justify-center gap-3 mt-8">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ControleBoletos;
