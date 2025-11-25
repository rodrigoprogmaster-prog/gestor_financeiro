
import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, EditIcon, CheckIcon, CalendarClockIcon, ArrowLeftIcon, ListIcon, KanbanIcon, ChevronDownIcon } from './icons';

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
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTarefa, setEditingTarefa] = useState<Partial<Tarefa> & { dataVencimento_br?: string } | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [errors, setErrors] = useState<TarefaErrors>({});
    
    const [searchTerm, setSearchTerm] = useState('');
    // Ensure default status is PENDENTE
    const [statusFilter, setStatusFilter] = useState<StatusTarefa | 'Atrasada' | 'Todas'>(StatusTarefa.PENDENTE);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const [lembretes, setLembretes] = useState<Tarefa[]>([]);
    const [isLembreteOpen, setIsLembreteOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'tarefas' | 'analise'>('tarefas');
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

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
    }, []); // Run only once on mount

    const getDynamicStatus = (tarefa: Tarefa): StatusTarefa | 'Atrasada' => {
        if (tarefa.status === StatusTarefa.CONCLUIDA) return StatusTarefa.CONCLUIDA;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(tarefa.dataVencimento + 'T00:00:00');
        return vencimento < hoje ? 'Atrasada' : tarefa.status;
    };
    
    const allTarefasWithStatus = useMemo(() => tarefas.map(t => ({ ...t, dynamicStatus: getDynamicStatus(t) })), [tarefas]);

    const filteredTarefas = useMemo(() => {
        return allTarefasWithStatus.filter(tarefa => {
            const statusMatch = statusFilter === 'Todas' || tarefa.dynamicStatus === statusFilter;
            const searchMatch = !searchTerm || tarefa.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || tarefa.descricao.toLowerCase().includes(searchTerm.toLowerCase());
            const startDateMatch = !dateRange.start || tarefa.dataVencimento >= dateRange.start;
            const endDateMatch = !dateRange.end || tarefa.dataVencimento <= dateRange.end;
            return statusMatch && searchMatch && startDateMatch && endDateMatch;
        }).sort((a, b) => {
            const aCompleted = a.status === StatusTarefa.CONCLUIDA;
            const bCompleted = b.status === StatusTarefa.CONCLUIDA;
            if (aCompleted && !bCompleted) return 1;
            if (!aCompleted && bCompleted) return -1;

            const priorityValue = { [PrioridadeTarefa.ALTA]: 3, [PrioridadeTarefa.MEDIA]: 2, [PrioridadeTarefa.BAIXA]: 1 };
            const pA = priorityValue[a.prioridade] || 0;
            const pB = priorityValue[b.prioridade] || 0;
            
            if (pA !== pB) {
                return pB - pA;
            }

            return new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime();
        });
    }, [allTarefasWithStatus, statusFilter, searchTerm, dateRange]);

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
    
    const getPriorityStyles = (priority: PrioridadeTarefa) => {
        switch (priority) {
            case PrioridadeTarefa.ALTA: return { border: 'border-l-red-500', text: 'text-red-600', bg: 'bg-red-50' };
            case PrioridadeTarefa.MEDIA: return { border: 'border-l-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-50' };
            case PrioridadeTarefa.BAIXA: return { border: 'border-l-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' };
            default: return { border: 'border-l-gray-300', text: 'text-gray-600', bg: 'bg-gray-50' };
        }
    };

    const renderStatusPill = (status: StatusTarefa | 'Atrasada') => {
        const styles = {
            'Atrasada': 'bg-red-100 text-red-800 border-red-200',
            [StatusTarefa.PENDENTE]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            [StatusTarefa.EM_ANDAMENTO]: 'bg-blue-100 text-blue-800 border-blue-200',
            [StatusTarefa.CONCLUIDA]: 'bg-green-100 text-green-800 border-green-200',
        };
        return <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full tracking-wide border ${styles[status]}`}>{status}</span>;
    };

    const renderTaskCard = (tarefa: any) => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(tarefa.dataVencimento + 'T00:00:00');
        const isOverdue = vencimento < hoje && tarefa.status !== StatusTarefa.CONCLUIDA;
        const priorityStyle = getPriorityStyles(tarefa.prioridade);

        return (
            <div
                key={tarefa.id}
                className={`bg-white rounded-2xl shadow-sm border border-border flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-200 min-h-[180px] relative group border-l-[4px] ${priorityStyle.border}`}
            >
                <div className="p-5 pb-3 flex-grow">
                    <div className="flex justify-between items-start mb-3 gap-2">
                        <div className="flex flex-col gap-1.5">
                            <span className="px-2 py-0.5 bg-secondary rounded-md text-[10px] font-bold uppercase tracking-wider text-text-secondary w-fit border border-border/50">{tarefa.categoria}</span>
                            <h4 className={`font-bold text-base text-text-primary line-clamp-2 leading-tight ${tarefa.status === StatusTarefa.CONCLUIDA ? 'line-through text-text-secondary decoration-2' : ''}`}>
                                {tarefa.titulo}
                            </h4>
                        </div>
                        <div className="flex-shrink-0">
                             {renderStatusPill(tarefa.dynamicStatus)}
                        </div>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-3 mb-2">{tarefa.descricao || <span className="italic opacity-50">Sem descrição.</span>}</p>
                </div>

                <div className="px-5 py-3 bg-secondary/20 border-t border-border rounded-b-2xl flex items-center justify-between">
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${isOverdue ? 'text-danger' : 'text-text-secondary'}`}>
                        <CalendarClockIcon className="h-4 w-4" />
                        <span>{formatDateToBR(tarefa.dataVencimento)}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {tarefa.status !== StatusTarefa.CONCLUIDA && (
                            <button onClick={(e) => { e.stopPropagation(); handleMarkAsDone(tarefa); }} className="p-2 rounded-full bg-white text-success shadow-sm border border-border hover:bg-success hover:text-white transition-colors" title="Concluir">
                                <CheckIcon className="h-4 w-4" />
                            </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(tarefa); }} className="p-2 rounded-full bg-white text-primary shadow-sm border border-border hover:bg-primary hover:text-white transition-colors" title="Editar">
                            <EditIcon className="h-4 w-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(tarefa.id); }} className="p-2 rounded-full bg-white text-danger shadow-sm border border-border hover:bg-danger hover:text-white transition-colors" title="Excluir">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderKanban = () => {
        const columns = [
            { id: 'Atrasada', title: 'Atrasadas', color: 'bg-red-50 border-red-100 text-red-800' },
            { id: StatusTarefa.PENDENTE, title: 'Pendentes', color: 'bg-yellow-50 border-yellow-100 text-yellow-800' },
            { id: StatusTarefa.EM_ANDAMENTO, title: 'Em Andamento', color: 'bg-blue-50 border-blue-100 text-blue-800' },
            { id: StatusTarefa.CONCLUIDA, title: 'Concluídas', color: 'bg-green-50 border-green-100 text-green-800' },
        ];

        return (
            <div className="flex gap-6 overflow-x-auto pb-4 h-full items-start px-1">
                {columns.map(col => {
                    const colTasks = filteredTarefas.filter(t => t.dynamicStatus === col.id);
                    return (
                        <div key={col.id} className="min-w-[340px] w-[340px] flex-shrink-0 flex flex-col h-full max-h-full bg-secondary/30 rounded-3xl border border-border">
                            <div className={`flex items-center justify-between px-5 py-4 border-b border-border rounded-t-3xl ${col.color}`}>
                                <span className="font-extrabold text-sm uppercase tracking-wide">{col.title}</span>
                                <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-full shadow-sm text-text-primary border border-border/50">{colTasks.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {colTasks.map(tarefa => renderTaskCard(tarefa))}
                                {colTasks.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-32 text-text-secondary opacity-40 border-2 border-dashed border-border rounded-2xl m-2">
                                        <span className="text-sm font-medium">Sem tarefas</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderTarefas = () => (
        <>
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4 bg-white p-4 rounded-3xl border border-border shadow-sm">
                 <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto flex-grow items-center">
                    <div className="relative w-full sm:w-72">
                        <input type="text" placeholder="Buscar tarefa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 h-11 bg-secondary border-transparent rounded-full text-sm text-text-primary focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder-text-secondary/60"/>
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-text-secondary"/></div>
                    </div>
                    
                    {activeTab === 'tarefas' && (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-2 sm:pb-0">
                            {(['Todas', 'Atrasada', StatusTarefa.PENDENTE, StatusTarefa.EM_ANDAMENTO, StatusTarefa.CONCLUIDA] as const).map(status => (
                                <button 
                                    key={status} 
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 h-10 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${statusFilter === status ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-text-secondary border-border hover:border-primary/50 hover:text-primary'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
                    <div className="flex bg-secondary p-1 rounded-full border border-border">
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`} title="Lista"><ListIcon className="h-5 w-5" /></button>
                        <button onClick={() => setViewMode('board')} className={`p-2 rounded-full transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`} title="Kanban"><KanbanIcon className="h-5 w-5" /></button>
                    </div>
                    <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-bold py-2.5 px-6 rounded-full hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 text-sm whitespace-nowrap h-11">
                        <PlusIcon className="h-5 w-5"/> <span>Nova Tarefa</span>
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 flex-grow content-start overflow-y-auto pb-4 pr-1 custom-scrollbar">
                    {filteredTarefas.length > 0 ? filteredTarefas.map(tarefa => renderTaskCard(tarefa)) : (
                        <div className="col-span-full flex flex-col items-center justify-center text-text-secondary py-20 bg-white/50 rounded-3xl border-2 border-dashed border-border">
                            <SearchIcon className="w-12 h-12 mb-4 text-gray-300"/>
                            <h3 className="text-lg font-bold text-text-primary">Nenhuma Tarefa Encontrada</h3>
                            <p className="text-sm mt-2">Tente ajustar os filtros ou crie uma nova tarefa para começar.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-grow overflow-hidden pb-2">
                    {renderKanban()}
                </div>
            )}
        </>
    );

    const renderAnalise = () => {
        const { statusCounts, priorityCounts, categoryCounts, total } = analysisData;
        
        const renderProgressBar = (count: number, total: number, colorClass: string) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
                <div className="w-full bg-secondary/50 rounded-full h-3 mt-3 overflow-hidden">
                    <div className={`h-3 rounded-full ${colorClass} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                </div>
            );
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto pb-6">
                <div className="bg-white p-8 rounded-3xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><KanbanIcon className="h-6 w-6" /></div>
                        <h4 className="font-bold text-xl text-text-primary">Por Status</h4>
                    </div>
                    <ul className="space-y-8">
                        {Object.entries(statusCounts).map(([status, count]) => (
                            <li key={status}>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-bold text-text-secondary uppercase tracking-wide">{status}</span>
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-text-primary">{count as number}</span>
                                        <span className="text-xs text-text-secondary ml-1 font-medium">({total > 0 ? Math.round(((count as number)/total)*100) : 0}%)</span>
                                    </div>
                                </div>
                                {renderProgressBar(count as number, total, status === 'Atrasada' ? 'bg-red-500' : status === StatusTarefa.CONCLUIDA ? 'bg-green-500' : 'bg-primary')}
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="bg-white p-8 rounded-3xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
                        <div className="p-3 bg-yellow-50 rounded-2xl text-yellow-600"><ArrowLeftIcon className="h-6 w-6 rotate-90" /></div>
                        <h4 className="font-bold text-xl text-text-primary">Por Prioridade</h4>
                    </div>
                    <ul className="space-y-8">
                        {Object.entries(priorityCounts).map(([priority, count]) => (
                             <li key={priority}>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-bold text-text-secondary uppercase tracking-wide">{priority}</span>
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-text-primary">{count as number}</span>
                                    </div>
                                </div>
                                {renderProgressBar(count as number, total, priority === PrioridadeTarefa.ALTA ? 'bg-red-500' : priority === PrioridadeTarefa.MEDIA ? 'bg-yellow-500' : 'bg-blue-500')}
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="bg-white p-8 rounded-3xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
                        <div className="p-3 bg-purple-50 rounded-2xl text-purple-600"><ListIcon className="h-6 w-6" /></div>
                        <h4 className="font-bold text-xl text-text-primary">Por Categoria</h4>
                    </div>
                     <ul className="space-y-8 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {Object.entries(categoryCounts).sort(([,a],[,b]) => (b as number) - (a as number)).map(([category, count]) => (
                             <li key={category}>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-bold text-text-secondary uppercase tracking-wide">{category}</span>
                                    <span className="text-xl font-bold text-text-primary">{count as number}</span>
                                </div>
                                {renderProgressBar(count as number, total, 'bg-indigo-500')}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full bg-background">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="flex items-center gap-2 py-2 px-5 rounded-full bg-white border border-border hover:bg-secondary text-text-primary font-bold transition-colors h-11 text-sm shadow-sm">
                            <ArrowLeftIcon className="h-4 w-4" />
                            Voltar
                        </button>
                    )}
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Gerenciador de Tarefas</h2>
                </div>
                
                <div className="bg-secondary p-1 rounded-full border border-border hidden sm:flex">
                    <button onClick={() => setActiveTab('tarefas')} className={`px-6 h-10 rounded-full text-sm font-bold transition-all ${activeTab === 'tarefas' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>Tarefas</button>
                    <button onClick={() => setActiveTab('analise')} className={`px-6 h-10 rounded-full text-sm font-bold transition-all ${activeTab === 'analise' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>Análise</button>
                </div>
            </div>

            {/* Mobile Tabs */}
            <div className="sm:hidden mb-6 border-b border-border flex">
                 <button onClick={() => setActiveTab('tarefas')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'tarefas' ? 'border-primary text-primary' : 'border-transparent text-text-secondary'}`}>Tarefas</button>
                 <button onClick={() => setActiveTab('analise')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'analise' ? 'border-primary text-primary' : 'border-transparent text-text-secondary'}`}>Análise</button>
            </div>

            <div className="flex-grow flex flex-col overflow-hidden">
                {activeTab === 'tarefas' ? renderTarefas() : renderAnalise()}
            </div>

            {isModalOpen && editingTarefa && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
                        <h3 className="text-2xl font-bold text-text-primary mb-6 text-center">{editingTarefa.id ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 ml-1">Título <span className="text-danger">*</span></label>
                                <input id="titulo" name="titulo" value={editingTarefa.titulo || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium h-12 ${errors.titulo ? 'border-danger' : ''}`} placeholder="O que precisa ser feito?" />
                                {errors.titulo && <p className="text-danger text-xs mt-1 ml-1">{errors.titulo}</p>}
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 ml-1">Descrição</label>
                                <textarea id="descricao" name="descricao" value={editingTarefa.descricao || ''} onChange={handleInputChange} rows={3} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none" placeholder="Detalhes adicionais..." />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 ml-1">Categoria <span className="text-danger">*</span></label>
                                <input id="categoria" name="categoria" value={editingTarefa.categoria || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.categoria ? 'border-danger' : ''}`} placeholder="Ex: Financeiro" />
                                {errors.categoria && <p className="text-danger text-xs mt-1 ml-1">{errors.categoria}</p>}
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 ml-1">Vencimento <span className="text-danger">*</span></label>
                                <input id="dataVencimento_br" name="dataVencimento_br" value={editingTarefa.dataVencimento_br || ''} onChange={handleInputChange} placeholder="DD/MM/AAAA" className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.dataVencimento ? 'border-danger' : ''}`} />
                                {errors.dataVencimento && <p className="text-danger text-xs mt-1 ml-1">{errors.dataVencimento}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 ml-1">Prioridade</label>
                                <div className="relative">
                                    <select id="prioridade" name="prioridade" value={editingTarefa.prioridade || PrioridadeTarefa.MEDIA} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none h-12">
                                        <option value={PrioridadeTarefa.ALTA}>Alta</option>
                                        <option value={PrioridadeTarefa.MEDIA}>Média</option>
                                        <option value={PrioridadeTarefa.BAIXA}>Baixa</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-text-secondary"><ChevronDownIcon className="h-4 w-4" /></div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 ml-1">Status</label>
                                <div className="relative">
                                    <select id="status" name="status" value={editingTarefa.status || StatusTarefa.PENDENTE} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none h-12">
                                        <option value={StatusTarefa.PENDENTE}>Pendente</option>
                                        <option value={StatusTarefa.EM_ANDAMENTO}>Em Andamento</option>
                                        <option value={StatusTarefa.CONCLUIDA}>Concluída</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-text-secondary"><ChevronDownIcon className="h-4 w-4" /></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-center gap-3 mt-8">
                            <button onClick={handleCloseModal} className="px-6 py-3 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleSaveChanges} className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Salvar Tarefa</button>
                        </div>
                    </div>
                </div>
            )}

            {isConfirmOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center"><h3 className="text-xl font-bold mb-4 text-text-primary">Confirmar</h3><p className="text-text-secondary mb-8">{confirmAction.message}</p><div className="flex justify-center gap-4"><button onClick={() => setIsConfirmOpen(false)} className="px-6 py-2.5 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button><button onClick={handleConfirm} className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Confirmar</button></div></div></div>}

            {isLembreteOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden p-8"><div className="flex items-center justify-center gap-2 mb-6"><CalendarClockIcon className="h-6 w-6 text-primary" /><h3 className="text-xl font-bold text-text-primary">Lembretes</h3></div><div className=""><p className="text-text-secondary mb-6 text-center">Tarefas vencendo hoje ou atrasadas:</p><div className="max-h-60 overflow-y-auto bg-secondary rounded-xl border border-transparent p-4 custom-scrollbar"><ul className="space-y-3">{lembretes.map(tarefa => (<li key={tarefa.id} className="flex justify-between items-center text-sm p-3 bg-white rounded-lg shadow-sm"><span className="font-medium text-text-primary">{tarefa.titulo}</span><span className={`text-xs font-bold ${getDynamicStatus(tarefa) === 'Atrasada' ? 'text-danger' : 'text-warning'}`}>{formatDateToBR(tarefa.dataVencimento)}</span></li>))}</ul></div></div><div className="flex justify-center mt-8"><button onClick={() => setIsLembreteOpen(false)} className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Fechar</button></div></div></div>}
        </div>
    );
};

export default GerenciadorTarefas;
