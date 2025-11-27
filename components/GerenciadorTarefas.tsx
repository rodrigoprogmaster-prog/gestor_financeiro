
import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, EditIcon, CheckIcon, ArrowLeftIcon, ClipboardListIcon, SearchIcon } from './icons';
import AutocompleteInput from './AutocompleteInput';

enum StatusTarefa {
    PENDENTE = 'Pendente',
    CONCLUIDA = 'Concluída'
}

interface Tarefa {
    id: string;
    titulo: string;
    descricao: string;
    categoria: string;
    dataVencimento: string;
    prioridade: 'Alta' | 'Média' | 'Baixa';
    status: StatusTarefa;
}

const STORAGE_KEY = 'gerenciador_tarefas_data';

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

const GerenciadorTarefas: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const [tarefas, setTarefas] = useState<Tarefa[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTarefa, setEditingTarefa] = useState<Partial<Tarefa> & { dataVencimento_br?: string } | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof Tarefa | 'dataVencimento', string>>>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tarefas));
    }, [tarefas]);

    const uniqueCategorias = useMemo(() => [...new Set(tarefas.map(t => t.categoria).filter(Boolean))].sort(), [tarefas]);
    const uniqueTitulos = useMemo(() => [...new Set(tarefas.map(t => t.titulo).filter(Boolean))].sort(), [tarefas]);

    const handleAdd = () => {
        setErrors({});
        setEditingTarefa({
            titulo: '', descricao: '', categoria: '',
            dataVencimento: new Date().toISOString().split('T')[0],
            dataVencimento_br: formatDateToBR(new Date().toISOString().split('T')[0]),
            prioridade: 'Média',
            status: StatusTarefa.PENDENTE
        });
        setIsModalOpen(true);
    };

    const handleEdit = (tarefa: Tarefa) => {
        setErrors({});
        setEditingTarefa({ ...tarefa, dataVencimento_br: formatDateToBR(tarefa.dataVencimento) });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Excluir tarefa?')) {
            setTarefas(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleToggleStatus = (id: string) => {
        setTarefas(prev => prev.map(t => t.id === id ? { ...t, status: t.status === StatusTarefa.PENDENTE ? StatusTarefa.CONCLUIDA : StatusTarefa.PENDENTE } : t));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!editingTarefa) return;
        const { name, value } = e.target;
        if (name === 'dataVencimento_br') {
            setEditingTarefa(prev => ({ ...prev, dataVencimento_br: applyDateMask(value) }));
        } else {
            setEditingTarefa(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = () => {
        if (!editingTarefa) return;
        const newErrors: typeof errors = {};
        if (!editingTarefa.titulo) newErrors.titulo = 'Obrigatório';
        if (!editingTarefa.dataVencimento_br) newErrors.dataVencimento = 'Obrigatório';
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const tarefa = { ...editingTarefa, dataVencimento: formatDateToISO(editingTarefa.dataVencimento_br!) } as Tarefa;
        delete (tarefa as any).dataVencimento_br;

        if (tarefa.id) setTarefas(prev => prev.map(t => t.id === tarefa.id ? tarefa : t));
        else setTarefas(prev => [...prev, { ...tarefa, id: `task-${Date.now()}` }]);
        setIsModalOpen(false);
    };

    const filteredTarefas = useMemo(() => tarefas.filter(t => !searchTerm || t.titulo.toLowerCase().includes(searchTerm.toLowerCase())), [tarefas, searchTerm]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    {onBack && <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-9"><ArrowLeftIcon className="h-4 w-4" /> Voltar</button>}
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Gerenciador de Tarefas</h2>
                </div>
                <button onClick={handleAdd} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors h-9"><PlusIcon className="h-4 w-4" /> Nova Tarefa</button>
            </div>

            <div className="relative w-full sm:w-64 mb-6">
                <input type="text" placeholder="Buscar tarefas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"/>
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary"/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTarefas.map(tarefa => (
                    <div key={tarefa.id} className={`bg-card p-4 rounded-xl shadow-sm border border-border hover:shadow-md transition-all relative group ${tarefa.status === StatusTarefa.CONCLUIDA ? 'opacity-60' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className={`font-bold text-lg ${tarefa.status === StatusTarefa.CONCLUIDA ? 'line-through text-text-secondary' : 'text-text-primary'}`}>{tarefa.titulo}</h3>
                            <button onClick={() => handleToggleStatus(tarefa.id)} className={`p-1.5 rounded-full ${tarefa.status === StatusTarefa.CONCLUIDA ? 'bg-success text-white' : 'bg-secondary text-text-secondary hover:text-success'}`}>
                                <CheckIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-sm text-text-secondary mb-3">{tarefa.descricao}</p>
                        <div className="flex items-center justify-between text-xs font-medium">
                            <span className="bg-secondary px-2 py-1 rounded-md">{tarefa.categoria || 'Geral'}</span>
                            <span className={`${tarefa.prioridade === 'Alta' ? 'text-danger' : tarefa.prioridade === 'Média' ? 'text-warning' : 'text-success'}`}>{tarefa.prioridade}</span>
                            <span className="text-text-secondary">{formatDateToBR(tarefa.dataVencimento)}</span>
                        </div>
                        <div className="absolute top-2 right-12 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(tarefa)} className="p-1.5 rounded-full bg-secondary hover:bg-border text-primary"><EditIcon className="h-3 w-3"/></button>
                            <button onClick={() => handleDelete(tarefa.id)} className="p-1.5 rounded-full bg-secondary hover:bg-border text-danger"><TrashIcon className="h-3 w-3"/></button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && editingTarefa && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
                        <h3 className="text-2xl font-bold text-text-primary mb-6 text-center">{editingTarefa.id ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Título</label>
                                <AutocompleteInput 
                                    name="titulo" 
                                    value={editingTarefa.titulo || ''} 
                                    onChange={handleInputChange} 
                                    suggestions={uniqueTitulos}
                                    className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.titulo ? 'border-danger' : ''}`} 
                                    placeholder="O que precisa ser feito?" 
                                />
                                {errors.titulo && <p className="text-danger text-xs mt-1 ml-1">{errors.titulo}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Descrição</label>
                                <textarea name="descricao" value={editingTarefa.descricao || ''} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none min-h-[100px] resize-none" placeholder="Detalhes da tarefa..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Categoria</label>
                                    <AutocompleteInput 
                                        name="categoria" 
                                        value={editingTarefa.categoria || ''} 
                                        onChange={handleInputChange} 
                                        suggestions={uniqueCategorias}
                                        className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"
                                        placeholder="Ex: Financeiro" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Vencimento</label>
                                    <input name="dataVencimento_br" value={editingTarefa.dataVencimento_br || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.dataVencimento ? 'border-danger' : ''}`} placeholder="DD/MM/AAAA" />
                                    {errors.dataVencimento && <p className="text-danger text-xs mt-1 ml-1">{errors.dataVencimento}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Prioridade</label>
                                <select name="prioridade" value={editingTarefa.prioridade} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12">
                                    <option value="Baixa">Baixa</option>
                                    <option value="Média">Média</option>
                                    <option value="Alta">Alta</option>
                                </select>
                            </div>
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

export default GerenciadorTarefas;
