import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, EditIcon, CheckIcon, CalendarClockIcon, TrendingUpIcon, ArrowLeftIcon } from './icons';

// Enums
enum StatusTarefa {
  PENDENTE = 'Pendente',
  EM_ANDAMENTO = 'Em Andamento',
  CONCLUIDA = 'Concluída',
}

enum PrioridadeTarefa {
  ALTA = 'Alta',
  MEDIA = 'Média',
  BAIXA = 'Baixa',
}

// Data structure
interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: PrioridadeTarefa;
  dataVencimento: string; // YYYY-MM-DD
  status: StatusTarefa;
  dataCriacao: string; // YYYY-MM-DD
}

type TarefaErrors = Partial<Record<keyof Omit<Tarefa, 'id' | 'dataCriacao'>, string>>;

// Helper functions
const formatDateToBR = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const [year, month, day] = isoDate.split('-');
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateToISO = (brDate: string): string => {
    if (!brDate || !/^\d{2}\/\d{2}\/\d{4}$/.test(brDate)) return '';
    const [day, month, year] = brDate.split('/');
    return `${year}-${month}-${day}`;
};

const applyDateMask = (value: string): string => value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3').replace(/(\/\d{4})\d+?$/, '$1');

const isValidBRDate = (dateString: string): boolean => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false;
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const GerenciadorTarefas: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const STORAGE_KEY = 'gerenciador_tarefas_data';
    const [tarefas, setTarefas] = useState<Tarefa[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTarefa, setEditingTarefa] = useState<Partial<Tarefa> & { dataVencimento_br?: string } | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [errors, setErrors] = useState<TarefaErrors>({});
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusTarefa | 'Atrasada' | 'Todas'>('Todas');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const [lembretes, setLembretes] = useState<Tarefa[]>([]);
    const [isLembreteOpen, setIsLembreteOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'tarefas' | 'analise'>('tarefas');


    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tarefas));
    }, [tarefas]);

    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString().split('T')[0];

        const lembretesDoDia = tarefas.filter(t => {
            if (t.status === StatusTarefa.CONCLUIDA) return false;
            const vencimento = new Date(t.dataVencimento + 'T00:00:00');
            return t.dataVencimento === todayISO || vencimento < today;
        });

        if (lembretesDoDia.length > 0) {
            setLembretes(lembretesDoDia);
            setIsLembreteOpen(true);
        }
    }, [tarefas]);

    const getDynamicStatus = (tarefa: Tarefa): StatusTarefa | 'Atrasada' => {
        if (tarefa.status === StatusTarefa.CONCLUIDA) return StatusTarefa.CONCLUIDA;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(tarefa.dataVencimento + 'T00:00:00');
        return vencimento < hoje ? 'Atrasada' : tarefa.status;
    };
    
    const allTarefasWithStatus = useMemo(() => tarefas.map(t => ({ ...t, dynamicStatus: getDynamicStatus(t) })), [tarefas]);

    const filteredTarefas = useMemo(() => {
        const priorityOrder: Record<PrioridadeTarefa, number> = {
            [PrioridadeTarefa.ALTA]: 1,
            [PrioridadeTarefa.MEDIA]: 2,
            [PrioridadeTarefa.BAIXA]: 3,
        };

        return allTarefasWithStatus.filter(tarefa => {
            const statusMatch = statusFilter === 'Todas' || tarefa.dynamicStatus === statusFilter;
            const searchMatch = !searchTerm || tarefa.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || tarefa.descricao.toLowerCase().includes(searchTerm.toLowerCase());
            const startDateMatch = !dateRange.start || tarefa.dataVencimento >= dateRange.start;
            const endDateMatch = !dateRange.end || tarefa.dataVencimento <= dateRange.end;
            return statusMatch && searchMatch && startDateMatch && endDateMatch;
        }).sort((a, b) => {
            const aCompleted = a.status === StatusTarefa.CONCLUIDA;
            const bCompleted = b.status === StatusTarefa.CONCLUIDA;
            if (aCompleted !== bCompleted) {
                return aCompleted ? 1 : -1;
            }

            const priorityComparison = priorityOrder[a.prioridade] - priorityOrder[b.prioridade];
            if (priorityComparison !== 0) {
                return priorityComparison;
            }

            return new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime();
        });
    }, [allTarefasWithStatus, statusFilter, searchTerm, dateRange]);

    const totals = useMemo(() => {
        return allTarefasWithStatus.reduce((acc, tarefa) => {
            const status = tarefa.dynamicStatus;
            if (!acc[status]) acc[status] = 0;
            acc[status]++;
            return acc;
        }, {} as Record<StatusTarefa | 'Atrasada', number>);
    }, [allTarefasWithStatus]);
    
    const analysisData = useMemo(() => {
        const statusCounts: Record<string, number> = { 'Atrasada': 0, [StatusTarefa.PENDENTE]: 0, [StatusTarefa.EM_ANDAMENTO]: 0, [StatusTarefa.CONCLUIDA]: 0 };
        const priorityCounts: Record<string, number> = { [PrioridadeTarefa.ALTA]: 0, [PrioridadeTarefa.MEDIA]: 0, [PrioridadeTarefa.BAIXA]: 0 };
        const categoryCounts: Record<string, number> = {};

        for (const tarefa of allTarefasWithStatus) {
            statusCounts[tarefa.dynamicStatus] = (statusCounts[tarefa.dynamicStatus] || 0) + 1;
            priorityCounts[tarefa.prioridade] = (priorityCounts[tarefa.prioridade] || 0) + 1;
            categoryCounts[tarefa.categoria] = (categoryCounts[tarefa.categoria] || 0) + 1;
        }

        return { statusCounts, priorityCounts, categoryCounts, total: tarefas.length };
    }, [allTarefasWithStatus, tarefas.length]);

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('Todas');
        setDateRange({ start: '', end: '' });
    };

    const handleOpenAddModal = () => {
        setErrors({});
        setEditingTarefa({ 
            dataVencimento_br: '', 
            status: StatusTarefa.PENDENTE,
            prioridade: PrioridadeTarefa.MEDIA,
            categoria: '',
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (tarefa: Tarefa) => {
        setErrors({});
        setEditingTarefa({ ...tarefa, dataVencimento_br: formatDateToBR(tarefa.dataVencimento) });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        const action = () => setTarefas(tarefas.filter(t => t.id !== id));
        setConfirmAction({ action, message: 'Deseja realmente excluir esta tarefa?' });
        setIsConfirmOpen(true);
    };

    const handleMarkAsDone = (tarefa: Tarefa) => {
        if (tarefa.status === StatusTarefa.CONCLUIDA) return;
        const action = () => setTarefas(tarefas.map(t => t.id === tarefa.id ? { ...t, status: StatusTarefa.CONCLUIDA } : t));
        setConfirmAction({ action, message: 'Marcar esta tarefa como concluída?' });
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTarefa(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!editingTarefa) return;
        const { name, value } = e.target;
        const finalValue = name === 'dataVencimento_br' ? applyDateMask(value) : value;
        setEditingTarefa(prev => ({ ...prev, [name]: finalValue }));
    };

    const validate = (): boolean => {
        if (!editingTarefa) return false;
        const newErrors: TarefaErrors = {};
        if (!editingTarefa.titulo?.trim()) newErrors.titulo = "O título é obrigatório.";
        if (!editingTarefa.categoria?.trim()) newErrors.categoria = "A categoria é obrigatória.";
        if (!editingTarefa.dataVencimento_br || !isValidBRDate(editingTarefa.dataVencimento_br)) newErrors.dataVencimento = "Data de vencimento inválida.";
        if (!editingTarefa.prioridade) newErrors.prioridade = "A prioridade é obrigatória.";
        if (!editingTarefa.status) newErrors.status = "O status é obrigatório.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveChanges = () => {
        if (!validate() || !editingTarefa) return;
        const tarefaToSave = { ...editingTarefa, dataVencimento: formatDateToISO(editingTarefa.dataVencimento_br!) };
        const action = () => {
            if (tarefaToSave.id) {
                setTarefas(tarefas.map(t => t.id === tarefaToSave.id ? (tarefaToSave as Tarefa) : t));
            } else {
                setTarefas([...tarefas, { ...tarefaToSave, id: `tarefa-${Date.now()}`, dataCriacao: new Date().toISOString().split('T')[0] } as Tarefa]);
            }
            handleCloseModal();
        };
        setConfirmAction({ action, message: `Deseja ${editingTarefa.id ? 'salvar as alterações' : 'adicionar esta tarefa'}?` });
        setIsConfirmOpen(true);
    };

    const handleConfirm = () => { confirmAction.action?.(); setIsConfirmOpen(false); };
    
    const renderStatusPill = (status: StatusTarefa | 'Atrasada') => {
        const styles = {
            'Atrasada': 'bg-danger/20 text-danger',
            [StatusTarefa.PENDENTE]: 'bg-yellow-500/20 text-yellow-600',
            [StatusTarefa.EM_ANDAMENTO]: 'bg-primary/20 text-primary',
            [StatusTarefa.CONCLUIDA]: 'bg-success/20 text-success',
        };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
    };
    
    const getPriorityStyles = (priority: PrioridadeTarefa) => {
        switch (priority) {
            case PrioridadeTarefa.ALTA: return { border: 'border-danger', text: 'text-danger' };
            case PrioridadeTarefa.MEDIA: return { border: 'border-yellow-500', text: 'text-yellow-600' };
            case PrioridadeTarefa.BAIXA: return { border: 'border-primary', text: 'text-primary' };
            default: return { border: 'border-border', text: 'text-text-secondary' };
        }
    };


    const renderTarefas = () => (
        <>
            <div className="flex flex-col sm:flex-row justify-end sm:items-center mb-6 gap-4">
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-hover h-10"><PlusIcon className="h-5 w-5"/>Incluir Tarefa</button>
            </div>
            <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {(['Atrasada', StatusTarefa.PENDENTE, StatusTarefa.EM_ANDAMENTO, StatusTarefa.CONCLUIDA] as const).map(status => {
                    const count = totals[status] || 0;
                    const colors = { 'Atrasada': 'danger', [StatusTarefa.PENDENTE]: 'yellow-500', [StatusTarefa.EM_ANDAMENTO]: 'primary', [StatusTarefa.CONCLUIDA]: 'success' };
                    const color = colors[status];
                    return (
                        <div key={status} onClick={() => setStatusFilter(status)} className={`p-4 rounded-lg shadow-md text-center cursor-pointer transition-all ${statusFilter === status ? `ring-2 ring-${color}` : 'border border-border'}`}>
                            <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{status}</p>
                            <p className={`text-2xl font-bold text-${color}`}>{count}</p>
                            <p className="text-sm text-text-secondary">{count === 1 ? 'tarefa' : 'tarefas'}</p>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                    <input type="text" placeholder="Buscar por título ou descrição..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 pl-10 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10 w-full sm:w-80"/>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-text-secondary"/></div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-sm font-medium">Vencimento:</label>
                    <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-background border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10"/>
                    <span className="text-text-secondary">até</span>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-background border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10"/>
                    <button onClick={handleClearFilters} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">Limpar</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 flex-grow">
                {filteredTarefas.length > 0 ? filteredTarefas.map(tarefa => {
                    const priorityStyles = getPriorityStyles(tarefa.prioridade);
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const vencimento = new Date(tarefa.dataVencimento + 'T00:00:00');
                    const isOverdue = vencimento < hoje && tarefa.status !== StatusTarefa.CONCLUIDA;
            
                    return (
                        <div
                            key={tarefa.id}
                            className={`bg-card rounded-lg shadow-md border ${priorityStyles.border} border-l-4 p-5 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300 min-h-[250px]`}
                        >
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-xs font-semibold bg-secondary text-text-secondary px-2 py-0.5 rounded-full">{tarefa.categoria}</p>
                                    <span className={`text-xs font-bold ${priorityStyles.text}`}>{tarefa.prioridade}</span>
                                </div>
                                <h4 className="font-bold text-lg text-text-primary mb-2 break-words">{tarefa.titulo}</h4>
                            </div>

                            <p className="text-sm text-text-secondary my-4 flex-grow break-words">{tarefa.descricao || 'Sem descrição.'}</p>

                            <div className="mt-auto pt-3 border-t border-border space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    {renderStatusPill(tarefa.dynamicStatus)}
                                    <div className={`flex items-center gap-1.5 font-medium ${isOverdue ? 'text-danger' : 'text-text-secondary'}`}>
                                        <CalendarClockIcon className="h-4 w-4" />
                                        <span>{formatDateToBR(tarefa.dataVencimento)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-1">
                                    {tarefa.status !== StatusTarefa.CONCLUIDA && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleMarkAsDone(tarefa); }}
                                            title="Marcar como Concluída"
                                            className="p-2 rounded-full text-success hover:bg-success/10 transition-colors"
                                        >
                                            <CheckIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEditClick(tarefa); }}
                                        title="Editar Tarefa"
                                        className="p-2 rounded-full text-primary hover:bg-primary/10 transition-colors"
                                    >
                                        <EditIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(tarefa.id); }}
                                        title="Excluir Tarefa"
                                        className="p-2 rounded-full text-danger hover:bg-danger/10 transition-colors"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }) : <div className="col-span-full flex flex-col items-center justify-center text-text-secondary py-16"><SearchIcon className="w-12 h-12 mb-4 text-gray-300"/><h3 className="text-xl font-semibold text-text-primary">Nenhuma Tarefa Encontrada</h3><p>Tente ajustar os filtros ou inclua uma nova tarefa.</p></div>}
            </div>
        </>
    );

    const renderAnalise = () => {
        const { statusCounts, priorityCounts, categoryCounts, total } = analysisData;
        
        const renderBar = (count: number, total: number) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
                <div className="w-full bg-secondary rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                </div>
            );
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                    <h4 className="font-bold text-lg text-text-primary mb-4">Tarefas por Status</h4>
                    <ul className="space-y-4">
                        {Object.entries(statusCounts).map(([status, count]) => (
                            <li key={status} className="text-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span>{status}</span>
                                    {/* FIX: Cast count to number for arithmetic operation */}
                                    <span className="font-semibold">{count} ({total > 0 ? (((count as number)/total)*100).toFixed(0) : 0}%)</span>
                                </div>
                                {/* FIX: Cast count to number for function argument */}
                                {renderBar(count as number, total)}
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                    <h4 className="font-bold text-lg text-text-primary mb-4">Tarefas por Prioridade</h4>
                    <ul className="space-y-4">
                        {Object.entries(priorityCounts).map(([priority, count]) => (
                             <li key={priority} className="text-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span>{priority}</span>
                                    {/* FIX: Cast count to number for arithmetic operation */}
                                    <span className="font-semibold">{count} ({total > 0 ? (((count as number)/total)*100).toFixed(0) : 0}%)</span>
                                </div>
                                {/* FIX: Cast count to number for function argument */}
                                {renderBar(count as number, total)}
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                    <h4 className="font-bold text-lg text-text-primary mb-4">Distribuição por Categoria</h4>
                     <ul className="space-y-4 max-h-60 overflow-y-auto">
                        {/* FIX: Cast a and b to number for sort comparison */}
                        {Object.entries(categoryCounts).sort(([,a],[,b]) => (b as number) - (a as number)).map(([category, count]) => (
                             <li key={category} className="text-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span>{category}</span>
                                    {/* FIX: Cast count to number for arithmetic operation */}
                                    <span className="font-semibold">{count} ({total > 0 ? (((count as number)/total)*100).toFixed(0) : 0}%)</span>
                                </div>
                                {/* FIX: Cast count to number for function argument */}
                                {renderBar(count as number, total)}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
            <div className="flex items-center gap-4 mb-6">
                {onBack && (
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Voltar
                    </button>
                )}
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Gerenciador de Tarefas</h2>
            </div>

            <div className="border-b border-border mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('tarefas')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tarefas' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>Tarefas</button>
                    <button onClick={() => setActiveTab('analise')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'analise' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>Análise</button>
                </nav>
            </div>

            <div className="flex-grow flex flex-col">
                {activeTab === 'tarefas' ? renderTarefas() : renderAnalise()}
            </div>

            {isModalOpen && editingTarefa && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-6 text-text-primary">{editingTarefa.id ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="titulo" className="block text-sm font-medium text-text-secondary mb-1">Título</label>
                                <input id="titulo" name="titulo" value={editingTarefa.titulo || ''} onChange={handleInputChange} className={`w-full bg-background border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.titulo ? 'border-danger' : 'border-border'}`} />
                                {errors.titulo && <p className="text-danger text-xs mt-1">{errors.titulo}</p>}
                            </div>
                            <div>
                                <label htmlFor="descricao" className="block text-sm font-medium text-text-secondary mb-1">Descrição</label>
                                <textarea id="descricao" name="descricao" value={editingTarefa.descricao || ''} onChange={handleInputChange} rows={3} className="w-full bg-background border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 border-border" />
                            </div>
                            <div>
                                <label htmlFor="categoria" className="block text-sm font-medium text-text-secondary mb-1">Categoria</label>
                                <input id="categoria" name="categoria" value={editingTarefa.categoria || ''} onChange={handleInputChange} className={`w-full bg-background border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.categoria ? 'border-danger' : 'border-border'}`} />
                                {errors.categoria && <p className="text-danger text-xs mt-1">{errors.categoria}</p>}
                            </div>
                            <div>
                                <label htmlFor="dataVencimento_br" className="block text-sm font-medium text-text-secondary mb-1">Vencimento</label>
                                <input id="dataVencimento_br" name="dataVencimento_br" value={editingTarefa.dataVencimento_br || ''} onChange={handleInputChange} placeholder="DD/MM/AAAA" className={`w-full bg-background border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.dataVencimento ? 'border-danger' : 'border-border'}`} />
                                {errors.dataVencimento && <p className="text-danger text-xs mt-1">{errors.dataVencimento}</p>}
                            </div>
                            <div>
                                <label htmlFor="prioridade" className="block text-sm font-medium text-text-secondary mb-1">Prioridade</label>
                                <select id="prioridade" name="prioridade" value={editingTarefa.prioridade || PrioridadeTarefa.MEDIA} onChange={handleInputChange} className={`w-full bg-background border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.prioridade ? 'border-danger' : 'border-border'}`}>
                                    <option value={PrioridadeTarefa.ALTA}>Alta</option>
                                    <option value={PrioridadeTarefa.MEDIA}>Média</option>
                                    <option value={PrioridadeTarefa.BAIXA}>Baixa</option>
                                </select>
                                {errors.prioridade && <p className="text-danger text-xs mt-1">{errors.prioridade}</p>}
                            </div>
                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                                <select id="status" name="status" value={editingTarefa.status || StatusTarefa.PENDENTE} onChange={handleInputChange} className={`w-full bg-background border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.status ? 'border-danger' : 'border-border'}`}>
                                    <option value={StatusTarefa.PENDENTE}>Pendente</option>
                                    <option value={StatusTarefa.EM_ANDAMENTO}>Em Andamento</option>
                                    <option value={StatusTarefa.CONCLUIDA}>Concluída</option>
                                </select>
                                {errors.status && <p className="text-danger text-xs mt-1">{errors.status}</p>}
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-4">
                            <button onClick={handleCloseModal} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold">Cancelar</button>
                            <button onClick={handleSaveChanges} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {isConfirmOpen && <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"><div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-sm"><h3 className="text-lg font-bold mb-4 text-text-primary">Confirmar</h3><p className="text-text-secondary mb-6">{confirmAction.message}</p><div className="flex justify-end gap-4"><button onClick={() => setIsConfirmOpen(false)} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold">Cancelar</button><button onClick={handleConfirm} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold">Confirmar</button></div></div></div>}

            {isLembreteOpen && <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"><div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-lg"><h3 className="text-xl font-bold mb-4 text-text-primary flex items-center gap-2"><CalendarClockIcon className="h-6 w-6 text-primary" />Lembretes de Tarefas</h3><p className="text-text-secondary mb-6">As seguintes tarefas vencem hoje ou estão atrasadas:</p><div className="max-h-60 overflow-y-auto bg-background rounded p-4 border border-border"><ul className="space-y-3">{lembretes.map(tarefa => (<li key={tarefa.id} className="flex justify-between items-center text-sm"><span className="font-semibold text-text-primary">{tarefa.titulo}</span><span className={`font-bold ${getDynamicStatus(tarefa) === 'Atrasada' ? 'text-danger' : 'text-yellow-600'}`}>{formatDateToBR(tarefa.dataVencimento)}</span></li>))}</ul></div><div className="mt-8 flex justify-end"><button onClick={() => setIsLembreteOpen(false)} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold">Fechar</button></div></div></div>}
        </div>
    );
};

export default GerenciadorTarefas;