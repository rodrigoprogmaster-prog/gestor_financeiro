
import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, EditIcon, CheckIcon, CalendarClockIcon, ArrowLeftIcon, ListIcon, KanbanIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, RefreshIcon, XIcon, ClipboardListIcon } from './icons';
import DatePicker from './DatePicker';
import CustomSelect from './CustomSelect';
import { useHideSidebarOnModal } from '../UIContext';

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

enum RecorrenciaTarefa {
  NENHUMA = 'Nenhuma',
  DIARIA = 'Diária',
  SEMANAL = 'Semanal',
  MENSAL = 'Mensal',
  ANUAL = 'Anual',
}

// Data structure
interface Tarefa {
  id: string;
  seriesId?: string; // Linked ID for recurring series
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: PrioridadeTarefa;
  recorrencia: RecorrenciaTarefa;
  dataVencimento: string; // YYYY-MM-DD
  status: StatusTarefa;
  dataCriacao: string; // YYYY-MM-DD
}

type TarefaWithStatus = Tarefa & { dynamicStatus: StatusTarefa | 'Atrasada' };

type TarefaErrors = Partial<Record<keyof Omit<Tarefa, 'id' | 'dataCriacao'>, string>>;

// Helper functions
const formatDateToBR = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const [year, month, day] = isoDate.split('-');
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
};

const calculateNextDueDate = (currentDateStr: string, recurrence: RecorrenciaTarefa): string => {
    const date = new Date(currentDateStr + 'T00:00:00'); // Ensure UTC midnight to avoid timezone shifts
    
    switch (recurrence) {
        case RecorrenciaTarefa.DIARIA:
            date.setDate(date.getDate() + 1);
            break;
        case RecorrenciaTarefa.SEMANAL:
            date.setDate(date.getDate() + 7);
            break;
        case RecorrenciaTarefa.MENSAL:
            date.setMonth(date.getMonth() + 1);
            break;
        case RecorrenciaTarefa.ANUAL:
            date.setFullYear(date.getFullYear() + 1);
            break;
        default:
            return currentDateStr;
    }

    return date.toISOString().split('T')[0];
};

const getMonthName = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

const ITEMS_PER_PAGE = 20;

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
    const [editingTarefa, setEditingTarefa] = useState<Partial<Tarefa> | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [errors, setErrors] = useState<TarefaErrors>({});
    
    // Viewing Task Modal State
    const [viewingTask, setViewingTask] = useState<TarefaWithStatus | null>(null);
    
    // Recurring Delete State
    const [isRecurringDeleteModalOpen, setIsRecurringDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Tarefa | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusTarefa | 'Atrasada' | 'Todas'>(StatusTarefa.PENDENTE);
    
    // Current Month View State
    const [currentViewDate, setCurrentViewDate] = useState(new Date());

    const [activeTab, setActiveTab] = useState<'tarefas' | 'analise'>('tarefas');
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
    const [currentPage, setCurrentPage] = useState(1);

    useHideSidebarOnModal(isModalOpen || isConfirmOpen || isRecurringDeleteModalOpen || !!viewingTask);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tarefas));
    }, [tarefas]);

    // Reset page on filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, currentViewDate]);

    const handleOpenAddModal = () => {
        setErrors({});
        setEditingTarefa({ 
            dataVencimento: '', 
            status: StatusTarefa.PENDENTE,
            prioridade: PrioridadeTarefa.MEDIA,
            recorrencia: RecorrenciaTarefa.NENHUMA,
            categoria: '',
        });
        setIsModalOpen(true);
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === '+') {
                event.preventDefault();
                handleOpenAddModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handlePrevMonth = () => {
        setCurrentViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleCurrentMonth = () => {
        setCurrentViewDate(new Date());
    };

    const getDynamicStatus = (tarefa: Tarefa): StatusTarefa | 'Atrasada' => {
        if (tarefa.status === StatusTarefa.CONCLUIDA) return StatusTarefa.CONCLUIDA;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(tarefa.dataVencimento + 'T00:00:00');
        return vencimento < hoje ? 'Atrasada' : tarefa.status;
    };
    
    const allTarefasWithStatus = useMemo(() => tarefas.map(t => ({ ...t, dynamicStatus: getDynamicStatus(t) })) as TarefaWithStatus[], [tarefas]);

    const filteredTarefas = useMemo(() => {
        const startOfMonth = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), 1);
        const endOfMonth = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 0);
        
        const startOfMonthISO = startOfMonth.toISOString().split('T')[0];
        const endOfMonthISO = endOfMonth.toISOString().split('T')[0];

        // Also include overdue tasks regardless of the month if they are not completed
        const realToday = new Date();
        const isViewingCurrentRealMonth = 
            currentViewDate.getMonth() === realToday.getMonth() && 
            currentViewDate.getFullYear() === realToday.getFullYear();

        return allTarefasWithStatus.filter(tarefa => {
            // 1. Text Search
            const searchMatch = !searchTerm || tarefa.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || tarefa.descricao.toLowerCase().includes(searchTerm.toLowerCase());
            if (!searchMatch) return false;

            // 2. Status Filter
            const statusMatch = statusFilter === 'Todas' || tarefa.dynamicStatus === statusFilter;
            if (!statusMatch) return false;

            // 3. Date Logic
            const dueDate = tarefa.dataVencimento;
            const isDueInSelectedMonth = dueDate >= startOfMonthISO && dueDate <= endOfMonthISO;
            const isOverdueAndPending = isViewingCurrentRealMonth && tarefa.status !== StatusTarefa.CONCLUIDA && dueDate < startOfMonthISO;

            return isDueInSelectedMonth || isOverdueAndPending;
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
    }, [allTarefasWithStatus, statusFilter, searchTerm, currentViewDate]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredTarefas.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedTarefas = filteredTarefas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

    const handleEditClick = (tarefa: Tarefa) => {
        setErrors({});
        setEditingTarefa({ 
            ...tarefa, 
            recorrencia: tarefa.recorrencia || RecorrenciaTarefa.NENHUMA, 
        });
        setViewingTask(null); // Close details modal if open
        setIsModalOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent | null, tarefa: Tarefa) => {
        if (e) e.stopPropagation();
        
        // Close details modal if open
        setViewingTask(null);

        if (tarefa.seriesId) {
            setTaskToDelete(tarefa);
            setIsRecurringDeleteModalOpen(true);
        } else {
            const action = () => setTarefas(tarefas.filter(t => t.id !== tarefa.id));
            setConfirmAction({ action, message: 'Deseja realmente excluir esta tarefa?' });
            setIsConfirmOpen(true);
        }
    };

    const handleDeleteSeries = () => {
        if (taskToDelete && taskToDelete.seriesId) {
            setTarefas(prev => prev.filter(t => t.seriesId !== taskToDelete.seriesId));
        }
        setIsRecurringDeleteModalOpen(false);
        setTaskToDelete(null);
    };

    const handleDeleteOccurrence = () => {
        if (taskToDelete) {
            setTarefas(prev => prev.filter(t => t.id !== taskToDelete.id));
        }
        setIsRecurringDeleteModalOpen(false);
        setTaskToDelete(null);
    };

    const handleMarkAsDone = (tarefa: Tarefa) => {
        if (tarefa.status === StatusTarefa.CONCLUIDA) return;
        
        // Close details modal if open
        setViewingTask(null);

        const action = () => {
            setTarefas(currentTarefas => {
                let updatedTarefas = currentTarefas.map(t => t.id === tarefa.id ? { ...t, status: StatusTarefa.CONCLUIDA } : t);
                
                if (tarefa.recorrencia && tarefa.recorrencia !== RecorrenciaTarefa.NENHUMA) {
                    const nextDueDate = calculateNextDueDate(tarefa.dataVencimento, tarefa.recorrencia);
                    let shouldCreate = true;

                    if (tarefa.seriesId) {
                        const nextTaskExists = currentTarefas.some(t => 
                            t.seriesId === tarefa.seriesId && 
                            t.dataVencimento === nextDueDate &&
                            t.id !== tarefa.id
                        );
                        if (nextTaskExists) shouldCreate = false;
                    }

                    if (shouldCreate) {
                        const newTarefa: Tarefa = {
                            ...tarefa,
                            id: `tarefa-${Date.now()}`,
                            status: StatusTarefa.PENDENTE,
                            dataVencimento: nextDueDate,
                            dataCriacao: new Date().toISOString().split('T')[0],
                        };
                        updatedTarefas = [...updatedTarefas, newTarefa];
                    }
                }
                return updatedTarefas;
            });
        };

        const recurrenceMsg = (tarefa.recorrencia && tarefa.recorrencia !== RecorrenciaTarefa.NENHUMA) 
            ? ` Esta tarefa é ${tarefa.recorrencia.toLowerCase()}.` 
            : '';

        setConfirmAction({ action, message: `Marcar esta tarefa como concluída?${recurrenceMsg}` });
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTarefa(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!editingTarefa) return;
        const { name, value } = e.target;
        setEditingTarefa(prev => ({ ...prev, [name]: value }));
    };

    const validate = (): boolean => {
        if (!editingTarefa) return false;
        const newErrors: TarefaErrors = {};
        if (!editingTarefa.titulo?.trim()) newErrors.titulo = "O título é obrigatório.";
        if (!editingTarefa.categoria?.trim()) newErrors.categoria = "A categoria é obrigatória.";
        if (!editingTarefa.dataVencimento) newErrors.dataVencimento = "Data de vencimento inválida.";
        if (!editingTarefa.prioridade) newErrors.prioridade = "A prioridade é obrigatória.";
        if (!editingTarefa.status) newErrors.status = "O status é obrigatório.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveChanges = () => {
        if (!validate() || !editingTarefa) return;
        const tarefaToSave = { ...editingTarefa } as Tarefa;
        
        const action = () => {
            if (tarefaToSave.id) {
                setTarefas(prev => prev.map(t => t.id === tarefaToSave.id ? (tarefaToSave as Tarefa) : t));
            } else {
                const newTasks: Tarefa[] = [];
                const baseIdTimestamp = Date.now();
                const seriesId = tarefaToSave.recorrencia !== RecorrenciaTarefa.NENHUMA ? `series-${baseIdTimestamp}` : undefined;

                const firstTask: Tarefa = { 
                    ...tarefaToSave, 
                    id: `tarefa-${baseIdTimestamp}-0`, 
                    dataCriacao: new Date().toISOString().split('T')[0],
                    seriesId
                } as Tarefa;
                
                newTasks.push(firstTask);

                if (tarefaToSave.recorrencia && tarefaToSave.recorrencia !== RecorrenciaTarefa.NENHUMA) {
                    let limit = 0;
                    switch (tarefaToSave.recorrencia) {
                        case RecorrenciaTarefa.DIARIA: limit = 90; break;
                        case RecorrenciaTarefa.SEMANAL: limit = 52; break;
                        case RecorrenciaTarefa.MENSAL: limit = 12; break;
                        case RecorrenciaTarefa.ANUAL: limit = 5; break;
                    }

                    let currentDate = firstTask.dataVencimento;
                    for (let i = 1; i < limit; i++) {
                        currentDate = calculateNextDueDate(currentDate, tarefaToSave.recorrencia);
                        newTasks.push({
                            ...firstTask,
                            id: `tarefa-${baseIdTimestamp}-${i}`,
                            dataVencimento: currentDate,
                            status: StatusTarefa.PENDENTE,
                            seriesId
                        });
                    }
                }
                setTarefas(prev => [...prev, ...newTasks]);
            }
            handleCloseModal();
        };
        
        setConfirmAction({ action, message: `Deseja ${editingTarefa.id ? 'salvar as alterações' : 'adicionar esta tarefa'}?` });
        setIsConfirmOpen(true);
    };

    const handleConfirm = () => { confirmAction.action?.(); setIsConfirmOpen(false); };
    
    const getPriorityColor = (priority: PrioridadeTarefa) => {
        switch (priority) {
            case PrioridadeTarefa.ALTA: return 'text-red-600 bg-red-50 border-red-100';
            case PrioridadeTarefa.MEDIA: return 'text-yellow-600 bg-yellow-50 border-yellow-100';
            case PrioridadeTarefa.BAIXA: return 'text-blue-600 bg-blue-50 border-blue-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    };

    const renderStatusPill = (status: StatusTarefa | 'Atrasada') => {
        const styles = {
            'Atrasada': 'bg-red-100 text-red-800 border-red-200',
            [StatusTarefa.PENDENTE]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            [StatusTarefa.EM_ANDAMENTO]: 'bg-blue-100 text-blue-800 border-blue-200',
            [StatusTarefa.CONCLUIDA]: 'bg-green-100 text-green-800 border-green-200',
        };
        return <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wide border ${styles[status]} whitespace-nowrap`}>{status}</span>;
    };

    // Kanban Card - Kept for Board View
    const renderKanbanCard = (tarefa: TarefaWithStatus) => {
        const priorityColor = getPriorityColor(tarefa.prioridade);
        return (
            <div
                onClick={() => setViewingTask(tarefa)}
                className={`bg-white rounded-xl shadow-sm border border-border p-4 hover:shadow-md cursor-pointer transition-all mb-3 flex flex-col gap-2`}
            >
                <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityColor}`}>{tarefa.prioridade}</span>
                    {tarefa.recorrencia !== RecorrenciaTarefa.NENHUMA && <RefreshIcon className="h-3 w-3 text-blue-500" />}
                </div>
                <h4 className="font-bold text-sm text-text-primary line-clamp-2">{tarefa.titulo}</h4>
                <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-1">
                    <CalendarClockIcon className="h-3.5 w-3.5" />
                    <span>{formatDateToBR(tarefa.dataVencimento)}</span>
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
                        <div key={col.id} className="min-w-[300px] w-[300px] flex-shrink-0 flex flex-col h-full max-h-full bg-secondary/30 rounded-3xl border border-border">
                            <div className={`flex items-center justify-between px-5 py-4 border-b border-border rounded-t-3xl ${col.color}`}>
                                <span className="font-extrabold text-sm uppercase tracking-wide">{col.title}</span>
                                <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-full shadow-sm text-text-primary border border-border/50">{colTasks.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {colTasks.map(tarefa => (
                                    <div key={tarefa.id}>
                                        {renderKanbanCard(tarefa)}
                                    </div>
                                ))}
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

    const renderListView = () => (
        <div className="bg-white border border-border rounded-2xl overflow-hidden flex-grow shadow-sm flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-grow custom-scrollbar">
                <table className="min-w-full divide-y divide-border text-sm text-left">
                    <thead className="bg-gray-50 text-text-secondary font-semibold uppercase text-xs tracking-wider sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-3 w-32">Status</th>
                            <th className="px-6 py-3">Tarefa</th>
                            <th className="px-6 py-3">Categoria</th>
                            <th className="px-6 py-3">Prioridade</th>
                            <th className="px-6 py-3">Vencimento</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                        {paginatedTarefas.length > 0 ? paginatedTarefas.map(tarefa => (
                            <tr 
                                key={tarefa.id} 
                                onClick={() => setViewingTask(tarefa)}
                                className="hover:bg-gray-50 transition-colors cursor-pointer group"
                            >
                                <td className="px-6 py-3">
                                    {renderStatusPill(tarefa.dynamicStatus)}
                                </td>
                                <td className="px-6 py-3">
                                    <div className="font-bold text-text-primary">{tarefa.titulo}</div>
                                    {tarefa.recorrencia !== RecorrenciaTarefa.NENHUMA && (
                                        <div className="flex items-center gap-1 text-[10px] text-blue-600 mt-0.5">
                                            <RefreshIcon className="h-3 w-3" />
                                            <span>{tarefa.recorrencia}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-3">
                                    <span className="px-2 py-1 bg-secondary rounded-md text-xs font-medium text-text-secondary border border-border/50">
                                        {tarefa.categoria}
                                    </span>
                                </td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${getPriorityColor(tarefa.prioridade)}`}>
                                        {tarefa.prioridade}
                                    </span>
                                </td>
                                <td className={`px-6 py-3 font-medium tabular-nums ${tarefa.dynamicStatus === 'Atrasada' ? 'text-danger' : 'text-text-secondary'}`}>
                                    {formatDateToBR(tarefa.dataVencimento)}
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <button className="text-primary hover:bg-primary/10 p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                                        <EditIcon className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="text-center py-20">
                                    <div className="flex flex-col items-center justify-center text-text-secondary opacity-60">
                                        <SearchIcon className="w-10 h-10 mb-4 text-gray-300" />
                                        <h3 className="text-lg font-medium text-text-primary">Nenhuma Tarefa Encontrada</h3>
                                        <p className="mt-1">Para o mês selecionado ou filtros aplicados.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* Pagination */}
            {filteredTarefas.length > 0 && (
                <div className="flex justify-between items-center p-4 border-t border-border bg-gray-50 text-xs text-text-secondary">
                    <div>
                        Exibindo {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredTarefas.length)} de {filteredTarefas.length} registros
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </button>
                        <span className="font-medium">Página {currentPage} de {Math.max(1, totalPages)}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    const renderTarefas = () => (
        <>
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 bg-white p-4 rounded-3xl border border-border shadow-sm">
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
                                    className={`px-4 h-10 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${statusFilter === status ? 'bg-white text-primary border-primary shadow-sm' : 'bg-white text-text-secondary border-border hover:border-primary/50 hover:text-primary'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Month Navigator */}
                <div className="flex items-center gap-2 bg-secondary p-1 rounded-full border border-border">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-full transition-colors text-text-secondary hover:text-primary" title="Mês Anterior">
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <span className="text-sm font-bold px-2 text-text-primary w-32 text-center capitalize select-none">
                        {getMonthName(currentViewDate)}
                    </span>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-full transition-colors text-text-secondary hover:text-primary" title="Próximo Mês">
                        <ChevronRightIcon className="h-5 w-5" />
                    </button>
                    <button onClick={handleCurrentMonth} className="p-2 hover:bg-white rounded-full transition-colors text-text-secondary hover:text-primary border-l border-border/50 ml-1" title="Mês Atual">
                        <CalendarClockIcon className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
                    <div className="flex bg-secondary p-1 rounded-full border border-border">
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`} title="Lista"><ListIcon className="h-5 w-5" /></button>
                        <button onClick={() => setViewMode('board')} className={`p-2 rounded-full transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`} title="Kanban"><KanbanIcon className="h-5 w-5" /></button>
                    </div>
                    <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-white border border-gray-200 text-primary font-bold py-2.5 px-6 rounded-full hover:bg-orange-50 hover:border-orange-200 transition-all shadow-sm text-sm whitespace-nowrap h-11">
                        <PlusIcon className="h-5 w-5"/> <span>Nova Tarefa</span>
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? renderListView() : (
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
                <div className="w-full bg-secondary rounded-full h-2.5 mt-2">
                    <div className={`h-2.5 rounded-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
                </div>
            );
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto pb-4 custom-scrollbar">
                {/* Status Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-border">
                    <h4 className="font-bold text-lg text-text-primary mb-4">Por Status</h4>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-text-secondary">Concluídas</span>
                                <span className="font-bold text-text-primary">{statusCounts[StatusTarefa.CONCLUIDA]} ({total > 0 ? Math.round((statusCounts[StatusTarefa.CONCLUIDA] / total) * 100) : 0}%)</span>
                            </div>
                            {renderProgressBar(statusCounts[StatusTarefa.CONCLUIDA], total, 'bg-success')}
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-text-secondary">Em Andamento</span>
                                <span className="font-bold text-text-primary">{statusCounts[StatusTarefa.EM_ANDAMENTO]} ({total > 0 ? Math.round((statusCounts[StatusTarefa.EM_ANDAMENTO] / total) * 100) : 0}%)</span>
                            </div>
                            {renderProgressBar(statusCounts[StatusTarefa.EM_ANDAMENTO], total, 'bg-primary')}
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-text-secondary">Pendentes</span>
                                <span className="font-bold text-text-primary">{statusCounts[StatusTarefa.PENDENTE]} ({total > 0 ? Math.round((statusCounts[StatusTarefa.PENDENTE] / total) * 100) : 0}%)</span>
                            </div>
                            {renderProgressBar(statusCounts[StatusTarefa.PENDENTE], total, 'bg-warning')}
                        </div>
                         <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-text-secondary">Atrasadas</span>
                                <span className="font-bold text-text-primary">{statusCounts['Atrasada']} ({total > 0 ? Math.round((statusCounts['Atrasada'] / total) * 100) : 0}%)</span>
                            </div>
                            {renderProgressBar(statusCounts['Atrasada'], total, 'bg-danger')}
                        </div>
                    </div>
                </div>

                {/* Priority Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-border">
                    <h4 className="font-bold text-lg text-text-primary mb-4">Por Prioridade</h4>
                    <div className="space-y-4">
                         <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-text-secondary">Alta</span>
                                <span className="font-bold text-text-primary">{priorityCounts[PrioridadeTarefa.ALTA]}</span>
                            </div>
                            {renderProgressBar(priorityCounts[PrioridadeTarefa.ALTA], total, 'bg-danger')}
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-text-secondary">Média</span>
                                <span className="font-bold text-text-primary">{priorityCounts[PrioridadeTarefa.MEDIA]}</span>
                            </div>
                            {renderProgressBar(priorityCounts[PrioridadeTarefa.MEDIA], total, 'bg-warning')}
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-text-secondary">Baixa</span>
                                <span className="font-bold text-text-primary">{priorityCounts[PrioridadeTarefa.BAIXA]}</span>
                            </div>
                            {renderProgressBar(priorityCounts[PrioridadeTarefa.BAIXA], total, 'bg-blue-500')}
                        </div>
                    </div>
                </div>

                {/* Categories Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-border">
                    <h4 className="font-bold text-lg text-text-primary mb-4">Categorias</h4>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {Object.entries(categoryCounts).map(([cat, count]) => (
                            <div key={cat} className="flex justify-between items-center p-2 hover:bg-secondary/50 rounded-lg transition-colors">
                                <span className="text-sm font-medium text-text-secondary">{cat || 'Sem Categoria'}</span>
                                <span className="text-xs font-bold bg-secondary px-2 py-1 rounded-full text-text-primary">{count}</span>
                            </div>
                        ))}
                        {Object.keys(categoryCounts).length === 0 && (
                            <p className="text-sm text-text-secondary text-center py-4">Nenhuma categoria registrada.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-9">
                            <ArrowLeftIcon className="h-4 w-4" />
                            Voltar
                        </button>
                    )}
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Gerenciador de Tarefas</h2>
                </div>
                
                <div className="flex bg-secondary p-1 rounded-full border border-border">
                    <button onClick={() => setActiveTab('tarefas')} className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${activeTab === 'tarefas' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>Tarefas</button>
                    <button onClick={() => setActiveTab('analise')} className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${activeTab === 'analise' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>Análise</button>
                </div>
            </div>

            {activeTab === 'tarefas' ? renderTarefas() : renderAnalise()}

            {/* Task Details Modal */}
            {viewingTask && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-border flex justify-between items-start bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-text-primary mb-2 line-clamp-2">{viewingTask.titulo}</h3>
                                {renderStatusPill(viewingTask.dynamicStatus)}
                            </div>
                            <button onClick={() => setViewingTask(null)} className="text-text-secondary hover:text-text-primary p-2 rounded-full hover:bg-gray-200 transition-colors">
                                <XIcon className="h-6 w-6" />
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-secondary/30 p-3 rounded-xl border border-border/50">
                                    <p className="text-xs font-bold text-text-secondary uppercase mb-1">Categoria</p>
                                    <p className="font-semibold text-text-primary">{viewingTask.categoria}</p>
                                </div>
                                <div className="bg-secondary/30 p-3 rounded-xl border border-border/50">
                                    <p className="text-xs font-bold text-text-secondary uppercase mb-1">Prioridade</p>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold border inline-block ${getPriorityColor(viewingTask.prioridade)}`}>
                                        {viewingTask.prioridade}
                                    </span>
                                </div>
                                <div className="bg-secondary/30 p-3 rounded-xl border border-border/50">
                                    <p className="text-xs font-bold text-text-secondary uppercase mb-1">Vencimento</p>
                                    <p className={`font-semibold ${viewingTask.dynamicStatus === 'Atrasada' ? 'text-danger' : 'text-text-primary'}`}>
                                        {formatDateToBR(viewingTask.dataVencimento)}
                                    </p>
                                </div>
                                <div className="bg-secondary/30 p-3 rounded-xl border border-border/50">
                                    <p className="text-xs font-bold text-text-secondary uppercase mb-1">Recorrência</p>
                                    <p className="font-semibold text-text-primary flex items-center gap-1">
                                        {viewingTask.recorrencia}
                                        {viewingTask.recorrencia !== RecorrenciaTarefa.NENHUMA && <RefreshIcon className="h-3 w-3 text-blue-500" />}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-text-primary mb-2 flex items-center gap-2">
                                    <ClipboardListIcon className="h-5 w-5 text-gray-400" /> Descrição
                                </h4>
                                <div className="bg-white border border-border rounded-xl p-4 min-h-[100px] text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                                    {viewingTask.descricao || <span className="italic text-text-secondary">Sem descrição fornecida.</span>}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer (Actions) */}
                        <div className="p-6 border-t border-border bg-gray-50 flex flex-wrap justify-end gap-3">
                            <button onClick={() => handleDeleteClick(null, viewingTask)} className="px-4 py-2.5 rounded-xl bg-white border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors shadow-sm flex items-center gap-2">
                                <TrashIcon className="h-4 w-4" /> Excluir
                            </button>
                            <button onClick={() => handleEditClick(viewingTask)} className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-primary font-bold hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2">
                                <EditIcon className="h-4 w-4" /> Editar
                            </button>
                            {viewingTask.status !== StatusTarefa.CONCLUIDA && (
                                <button onClick={() => handleMarkAsDone(viewingTask)} className="px-6 py-2.5 rounded-xl bg-success text-white font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20 flex items-center gap-2">
                                    <CheckIcon className="h-4 w-4" /> Concluir Tarefa
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && editingTarefa && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
                        <h3 className="text-2xl font-bold text-text-primary mb-6 text-center">{editingTarefa.id ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Título</label>
                                <input name="titulo" value={editingTarefa.titulo || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.titulo ? 'border-danger' : ''}`} placeholder="O que precisa ser feito?" />
                                {errors.titulo && <p className="text-danger text-xs mt-1 ml-1">{errors.titulo}</p>}
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Descrição</label>
                                <textarea name="descricao" value={editingTarefa.descricao || ''} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none min-h-[100px] resize-none" placeholder="Detalhes da tarefa..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Categoria</label>
                                    <input name="categoria" value={editingTarefa.categoria || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.categoria ? 'border-danger' : ''}`} placeholder="Ex: Financeiro" />
                                    {errors.categoria && <p className="text-danger text-xs mt-1 ml-1">{errors.categoria}</p>}
                                </div>
                                <div>
                                    <DatePicker 
                                        label="Vencimento"
                                        value={editingTarefa.dataVencimento || ''} 
                                        onChange={(val) => setEditingTarefa(prev => ({...prev, dataVencimento: val}))} 
                                        placeholder="Selecione"
                                    />
                                    {errors.dataVencimento && <p className="text-danger text-xs mt-1 ml-1">{errors.dataVencimento}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <CustomSelect
                                        label="Prioridade"
                                        options={[
                                            { label: 'Alta', value: PrioridadeTarefa.ALTA },
                                            { label: 'Média', value: PrioridadeTarefa.MEDIA },
                                            { label: 'Baixa', value: PrioridadeTarefa.BAIXA },
                                        ]}
                                        value={editingTarefa.prioridade || PrioridadeTarefa.MEDIA}
                                        onChange={(val) => handleInputChange({ target: { name: 'prioridade', value: val } } as any)}
                                    />
                                    {errors.prioridade && <p className="text-danger text-xs mt-1 ml-1">{errors.prioridade}</p>}
                                </div>
                                <div>
                                    <CustomSelect
                                        label="Status"
                                        options={[
                                            { label: 'Pendente', value: StatusTarefa.PENDENTE },
                                            { label: 'Em Andamento', value: StatusTarefa.EM_ANDAMENTO },
                                            { label: 'Concluída', value: StatusTarefa.CONCLUIDA },
                                        ]}
                                        value={editingTarefa.status || StatusTarefa.PENDENTE}
                                        onChange={(val) => handleInputChange({ target: { name: 'status', value: val } } as any)}
                                    />
                                    {errors.status && <p className="text-danger text-xs mt-1 ml-1">{errors.status}</p>}
                                </div>
                            </div>
                            
                            <div>
                                <CustomSelect
                                    label="Recorrência"
                                    options={[
                                        { label: 'Nenhuma (Apenas uma vez)', value: RecorrenciaTarefa.NENHUMA },
                                        { label: 'Diária (Todos os dias)', value: RecorrenciaTarefa.DIARIA },
                                        { label: 'Semanal (Toda semana)', value: RecorrenciaTarefa.SEMANAL },
                                        { label: 'Mensal (Todo mês)', value: RecorrenciaTarefa.MENSAL },
                                        { label: 'Anual (Todo ano)', value: RecorrenciaTarefa.ANUAL },
                                    ]}
                                    value={editingTarefa.recorrencia || RecorrenciaTarefa.NENHUMA}
                                    onChange={(val) => handleInputChange({ target: { name: 'recorrencia', value: val } } as any)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-center gap-3 mt-8">
                            <button onClick={handleCloseModal} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-text-primary font-semibold hover:bg-gray-50 transition-colors shadow-sm">Cancelar</button>
                            <button onClick={handleSaveChanges} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-primary font-bold shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {isConfirmOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
                        <h3 className="text-xl font-bold mb-4 text-text-primary">Confirmar</h3>
                        <p className="text-text-secondary mb-8">{confirmAction.message}</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setIsConfirmOpen(false)} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-text-primary font-semibold hover:bg-gray-50 transition-colors shadow-sm">Cancelar</button>
                            <button onClick={handleConfirm} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-primary font-bold shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recurring Task Delete Modal */}
            {isRecurringDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                            <TrashIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-text-primary">Excluir Tarefa Recorrente</h3>
                        <p className="text-text-secondary mb-6">Esta tarefa faz parte de uma série. O que você deseja fazer?</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleDeleteSeries} className="w-full py-2.5 rounded-xl bg-danger text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20">
                                Excluir Todas da Série
                            </button>
                            <button onClick={handleDeleteOccurrence} className="w-full py-2.5 rounded-xl bg-white border-2 border-danger text-danger font-bold hover:bg-red-50 transition-colors">
                                Excluir Apenas Esta
                            </button>
                            <button onClick={() => setIsRecurringDeleteModalOpen(false)} className="w-full py-2 text-text-secondary font-medium hover:text-text-primary transition-colors">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GerenciadorTarefas;
