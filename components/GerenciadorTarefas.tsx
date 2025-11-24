import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, EditIcon, CheckIcon, CalendarClockIcon, ArrowLeftIcon, ListIcon, KanbanIcon } from './icons';

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
    const [statusFilter, setStatusFilter] = useState<StatusTarefa | 'Atrasada' | 'Todas'>('Todas');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const [lembretes, setLembretes] = useState<Tarefa[]>([]);
    const [isLembreteOpen, setIsLembreteOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'tarefas' | 'analise'>('tarefas');
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list'); // New state for view mode

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
    }, [tarefas]); // Run only when tasks change, but ideally once per day/session

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
            // 1. Completed tasks always at the bottom
            const aCompleted = a.status === StatusTarefa.CONCLUIDA;
            const bCompleted = b.status === StatusTarefa.CONCLUIDA;
            if (aCompleted && !bCompleted) return 1;
            if (!aCompleted && bCompleted) return -1;

            // 2. Priority (High > Medium > Low)
            const priorityValue = { [PrioridadeTarefa.ALTA]: 3, [PrioridadeTarefa.MEDIA]: 2, [PrioridadeTarefa.BAIXA]: 1 };
            const pA = priorityValue[a.prioridade] || 0;
            const pB = priorityValue[b.prioridade] || 0;
            
            if (pA !== pB) {
                return pB - pA; // Descending order (3 > 2 > 1)
            }

            // 3. Due Date (Ascending - soonest first)
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
            'Atrasada': 'bg-red-50 text-red-700 border border-red-200',
            [StatusTarefa.PENDENTE]: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
            [StatusTarefa.EM_ANDAMENTO]: 'bg-blue-50 text-blue-700 border border-blue-200',
            [StatusTarefa.CONCLUIDA]: 'bg-green-50 text-green-700 border border-green-200',
        };
        return <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${styles[status]}`}>{status}</span>;
    };
    
    const getPriorityColor = (priority: PrioridadeTarefa) => {
        switch (priority) {
            case PrioridadeTarefa.ALTA: return 'text-red-600';
            case PrioridadeTarefa.MEDIA: return 'text-yellow-600';
            case PrioridadeTarefa.BAIXA: return 'text-blue-600';
            default: return 'text-gray-500';
        }
    };

    // New render function for a single task card (used by both list and kanban)
    const renderTaskCard = (tarefa: any) => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(tarefa.dataVencimento + 'T00:00:00');
        const isOverdue = vencimento < hoje && tarefa.status !== StatusTarefa.CONCLUIDA;

        return (
            <div
                key={tarefa.id}
                className="bg-card rounded-2xl border border-border p-4 flex flex-col justify-between hover:shadow-md transition-shadow duration-200 min-h-[180px] relative group"
            >
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-secondary text-text-secondary px-2 py-0.5 rounded-full border border-border">{tarefa.categoria}</span>
                        <span className={`text-xs font-bold ${getPriorityColor(tarefa.prioridade)}`}>{tarefa.prioridade}</span>
                    </div>
                    <h4 className="font-semibold text-base text-text-primary mb-2 line-clamp-2">{tarefa.titulo}</h4>
                </div>

                <p className="text-sm text-text-secondary my-3 line-clamp-3 flex-grow">{tarefa.descricao || 'Sem descrição.'}</p>

                <div className="mt-auto pt-3 border-t border-border space-y-3">
                    <div className="flex justify-between items-center">
                        {renderStatusPill(tarefa.dynamicStatus)}
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-danger' : 'text-text-secondary'}`}>
                            <CalendarClockIcon className="h-3 w-3" />
                            <span>{formatDateToBR(tarefa.dataVencimento)}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        {tarefa.status !== StatusTarefa.CONCLUIDA && (
                            <button onClick={(e) => { e.stopPropagation(); handleMarkAsDone(tarefa); }} className="p-1.5 rounded-full text-success hover:bg-green-50 border border-transparent hover:border-green-100 transition-colors">
                                <CheckIcon className="h-4 w-4" />
                            </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(tarefa); }} className="p-1.5 rounded-full text-primary hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors">
                            <EditIcon className="h-4 w-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(tarefa.id); }} className="p-1.5 rounded-full text-danger hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // New render function for Kanban board
    const renderKanban = () => {
        const columns = [
            { id: 'Atrasada', title: 'Atrasadas', color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' },
            { id: StatusTarefa.PENDENTE, title: 'Pendentes', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' },
            { id: StatusTarefa.EM_ANDAMENTO, title: 'Em Andamento', color: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
            { id: StatusTarefa.CONCLUIDA, title: 'Concluídas', color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' },
        ];

        return (
            <div className="flex gap-4 overflow-x-auto pb-4 h-full items-start">
                {columns.map(col => {
                    const colTasks = filteredTarefas.filter(t => t.dynamicStatus === col.id);
                    return (
                        <div key={col.id} className="min-w-[320px] w-[320px] flex-shrink-0 bg-secondary/30 rounded-2xl p-3 border border-border flex flex-col max-h-full">
                            <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl font-bold text-sm border shadow-sm ${col.color}`}>
                                <div className={`w-2 h-2 rounded-full ${col.dot}`}></div>
                                {col.title}
                                <span className="ml-auto text-xs bg-white/50 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1 custom-scrollbar">
                                {colTasks.map(tarefa => renderTaskCard(tarefa))}
                                {colTasks.length === 0 && (
                                    <div className="text-center py-8 text-text-secondary text-xs italic opacity-60 border-2 border-dashed border-border rounded-xl">
                                        Nenhuma tarefa
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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-secondary p-1 rounded-full border border-border">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                        title="Visualização em Lista"
                    >
                        <ListIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('board')}
                        className={`p-2 rounded-full transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                        title="Visualização em Kanban"
                    >
                        <KanbanIcon className="h-5 w-5" />
                    </button>
                </div>
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-medium py-2 px-4 rounded-full hover:bg-primary-hover text-sm h-9 shadow-sm"><PlusIcon className="h-4 w-4"/>Incluir Tarefa</button>
            </div>
            
            <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {(['Atrasada', StatusTarefa.PENDENTE, StatusTarefa.EM_ANDAMENTO, StatusTarefa.CONCLUIDA] as const).map(status => {
                    const count = totals[status] || 0;
                    const isActive = statusFilter === status;
                    return (
                        <div key={status} onClick={() => setStatusFilter(status)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-gray-300'}`}>
                            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">{status}</p>
                            <p className="text-xl font-bold text-text-primary">{count}</p>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 bg-white p-3 rounded-2xl border border-border">
                 <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                    <input type="text" placeholder="Buscar por título ou descrição..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full sm:w-80 pl-10 pr-3 py-2 bg-background border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors h-9"/>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-4 w-4 text-text-secondary"/></div>
                </div>
                 <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-secondary">Vencimento:</span>
                        <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-background border border-border rounded-xl px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"/>
                        <span className="text-xs text-text-secondary">até</span>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-background border border-border rounded-xl px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"/>
                    </div>
                    <button onClick={handleClearFilters} className="px-3 py-1.5 rounded-full bg-secondary hover:bg-gray-200 text-text-primary font-medium text-sm h-9 transition-colors">Limpar</button>
                </div>
            </div>

            {/* Conditional Rendering based on viewMode */}
            {viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-grow content-start overflow-y-auto">
                    {filteredTarefas.length > 0 ? filteredTarefas.map(tarefa => renderTaskCard(tarefa)) : <div className="col-span-full flex flex-col items-center justify-center text-text-secondary py-16"><SearchIcon className="w-10 h-10 mb-3 text-gray-300"/><h3 className="text-lg font-medium text-text-primary">Nenhuma Tarefa Encontrada</h3><p className="text-sm">Tente ajustar os filtros ou inclua uma nova tarefa.</p></div>}
                </div>
            ) : (
                <div className="flex-grow overflow-hidden">
                    {renderKanban()}
                </div>
            )}
        </>
    );

    const renderAnalise = () => {
        const { statusCounts, priorityCounts, categoryCounts, total } = analysisData;
        
        const renderBar = (count: number, total: number) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
                <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                </div>
            );
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                    <h4 className="font-bold text-base text-text-primary mb-4 border-b border-border pb-2">Por Status</h4>
                    <ul className="space-y-4">
                        {Object.entries(statusCounts).map(([status, count]) => (
                            <li key={status} className="text-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-text-secondary">{status}</span>
                                    <span className="font-semibold text-text-primary">{count as number}</span>
                                </div>
                                {renderBar(count as number, total)}
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                    <h4 className="font-bold text-base text-text-primary mb-4 border-b border-border pb-2">Por Prioridade</h4>
                    <ul className="space-y-4">
                        {Object.entries(priorityCounts).map(([priority, count]) => (
                             <li key={priority} className="text-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-text-secondary">{priority}</span>
                                    <span className="font-semibold text-text-primary">{count as number}</span>
                                </div>
                                {renderBar(count as number, total)}
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                    <h4 className="font-bold text-base text-text-primary mb-4 border-b border-border pb-2">Por Categoria</h4>
                     <ul className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {Object.entries(categoryCounts).sort(([,a],[,b]) => (b as number) - (a as number)).map(([category, count]) => (
                             <li key={category} className="text-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-text-secondary">{category}</span>
                                    <span className="font-semibold text-text-primary">{count as number}</span>
                                </div>
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
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-white border border-border hover:bg-secondary text-text-primary font-medium transition-colors h-10 text-sm">
                        <ArrowLeftIcon className="h-4 w-4" />
                        Voltar
                    </button>
                )}
                <h2 className="text-2xl font-bold text-text-primary tracking-tight">Gerenciador de Tarefas</h2>
            </div>

            <div className="border-b border-border mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('tarefas')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'tarefas' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'}`}>Tarefas</button>
                    <button onClick={() => setActiveTab('analise')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'analise' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'}`}>Análise</button>
                </nav>
            </div>

            <div className="flex-grow flex flex-col overflow-hidden">
                {activeTab === 'tarefas' ? renderTarefas() : renderAnalise()}
            </div>

            {isModalOpen && editingTarefa && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-secondary/30">
                            <h3 className="text-lg font-bold text-text-primary">{editingTarefa.id ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Título</label>
                                <input id="titulo" name="titulo" value={editingTarefa.titulo || ''} onChange={handleInputChange} className={`w-full bg-white border rounded-xl px-3 py-2 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9 ${errors.titulo ? 'border-danger' : 'border-border'}`} />
                                {errors.titulo && <p className="text-danger text-xs mt-1">{errors.titulo}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Descrição</label>
                                <textarea id="descricao" name="descricao" value={editingTarefa.descricao || ''} onChange={handleInputChange} rows={3} className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Categoria</label>
                                    <input id="categoria" name="categoria" value={editingTarefa.categoria || ''} onChange={handleInputChange} className={`w-full bg-white border rounded-xl px-3 py-2 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9 ${errors.categoria ? 'border-danger' : 'border-border'}`} />
                                    {errors.categoria && <p className="text-danger text-xs mt-1">{errors.categoria}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Vencimento</label>
                                    <input id="dataVencimento_br" name="dataVencimento_br" value={editingTarefa.dataVencimento_br || ''} onChange={handleInputChange} placeholder="DD/MM/AAAA" className={`w-full bg-white border rounded-xl px-3 py-2 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9 ${errors.dataVencimento ? 'border-danger' : 'border-border'}`} />
                                    {errors.dataVencimento && <p className="text-danger text-xs mt-1">{errors.dataVencimento}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Prioridade</label>
                                    <select id="prioridade" name="prioridade" value={editingTarefa.prioridade || PrioridadeTarefa.MEDIA} onChange={handleInputChange} className={`w-full bg-white border rounded-xl px-3 py-2 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9 ${errors.prioridade ? 'border-danger' : 'border-border'}`}>
                                        <option value={PrioridadeTarefa.ALTA}>Alta</option>
                                        <option value={PrioridadeTarefa.MEDIA}>Média</option>
                                        <option value={PrioridadeTarefa.BAIXA}>Baixa</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Status</label>
                                    <select id="status" name="status" value={editingTarefa.status || StatusTarefa.PENDENTE} onChange={handleInputChange} className={`w-full bg-white border rounded-xl px-3 py-2 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9 ${errors.status ? 'border-danger' : 'border-border'}`}>
                                        <option value={StatusTarefa.PENDENTE}>Pendente</option>
                                        <option value={StatusTarefa.EM_ANDAMENTO}>Em Andamento</option>
                                        <option value={StatusTarefa.CONCLUIDA}>Concluída</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border bg-secondary/30 flex justify-end gap-3">
                            <button onClick={handleCloseModal} className="px-4 py-2 rounded-full bg-white border border-border text-text-primary text-sm font-medium hover:bg-secondary transition-colors">Cancelar</button>
                            <button onClick={handleSaveChanges} className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {isConfirmOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"><div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-sm p-6"><h3 className="text-lg font-bold mb-2 text-text-primary">Confirmar</h3><p className="text-sm text-text-secondary mb-6">{confirmAction.message}</p><div className="flex justify-end gap-3"><button onClick={() => setIsConfirmOpen(false)} className="px-4 py-2 rounded-full bg-white border border-border text-text-primary text-sm font-medium hover:bg-secondary transition-colors">Cancelar</button><button onClick={handleConfirm} className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-colors">Confirmar</button></div></div></div>}

            {isLembreteOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"><div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-lg overflow-hidden"><div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-2"><CalendarClockIcon className="h-5 w-5 text-primary" /><h3 className="text-lg font-bold text-text-primary">Lembretes</h3></div><div className="p-6"><p className="text-sm text-text-secondary mb-4">Tarefas vencendo hoje ou atrasadas:</p><div className="max-h-60 overflow-y-auto bg-background rounded-xl border border-border p-2"><ul className="space-y-2">{lembretes.map(tarefa => (<li key={tarefa.id} className="flex justify-between items-center text-sm p-2 hover:bg-white rounded-lg"><span className="font-medium text-text-primary">{tarefa.titulo}</span><span className={`text-xs font-bold ${getDynamicStatus(tarefa) === 'Atrasada' ? 'text-danger' : 'text-warning'}`}>{formatDateToBR(tarefa.dataVencimento)}</span></li>))}</ul></div></div><div className="px-6 py-4 border-t border-border bg-secondary/30 flex justify-end"><button onClick={() => setIsLembreteOpen(false)} className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-colors">Fechar</button></div></div></div>}
        </div>
    );
};

export default GerenciadorTarefas;