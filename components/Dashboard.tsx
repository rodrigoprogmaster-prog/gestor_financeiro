
import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { 
    CheckIcon, 
    CalendarClockIcon, 
    SparklesIcon, 
    SearchIcon, 
    RefreshIcon,
    ArrowUpCircleIcon,
    ArrowDownCircleIcon,
    ClipboardListIcon,
    TrendingUpIcon
} from './icons';

interface DashboardProps {
  setView: (view: AppView) => void;
}

// Interfaces for data from localStorage
interface Boleto { id: string; vencimento: string; recebido?: boolean; pago?: boolean; valor: number; cliente?: string; credor?: string; fornecedor?: string; pagador?: string; }
interface Cheque { id: string; dataVencimento: string; status: string; valor: number; emitente: string; numero: string; }
interface Tarefa { id: string; dataVencimento: string; status: string; titulo: string; prioridade: string; }
interface DespesaRecorrente { id: string; empresa: string; descricao: string; diaVencimento: number; status: string; }

type Item = 
    | (Boleto & { type: 'boletoReceber' })
    | (Cheque & { type: 'cheque' })
    | (Tarefa & { type: 'tarefa' })
    | (Boleto & { type: 'boletoPagar' })
    | (DespesaRecorrente & { type: 'lembreteRecorrente' });

const getTodayISO = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getTomorrowISO = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const today = getTodayISO();
        const todayDate = new Date();
        const tomorrowDate = new Date();
        tomorrowDate.setDate(todayDate.getDate() + 1);
        const tomorrowDay = tomorrowDate.getDate();

        const loadedItems: Item[] = [];

        // Boletos a Receber
        const boletosReceberData = localStorage.getItem('boletos_a_receber_data');
        if (boletosReceberData) {
            try {
                const boletos: Boleto[] = JSON.parse(boletosReceberData);
                boletos.filter(b => b.vencimento === today && !b.recebido).forEach(b => loadedItems.push({ ...b, type: 'boletoReceber' }));
            } catch (e) { console.error("Error parsing boletos_a_receber_data", e); }
        }

        // Gerenciador de Cheques
        const chequesData = localStorage.getItem('gerenciador_cheques_data');
        if (chequesData) {
            try {
                const cheques: Cheque[] = JSON.parse(chequesData);
                cheques.filter(c => c.dataVencimento === today && c.status === 'A Depositar').forEach(c => loadedItems.push({ ...c, type: 'cheque' }));
            } catch (e) { console.error("Error parsing gerenciador_cheques_data", e); }
        }

        // Gerenciador de Tarefas
        const tarefasData = localStorage.getItem('gerenciador_tarefas_data');
        if (tarefasData) {
            try {
                const tarefas: Tarefa[] = JSON.parse(tarefasData);
                tarefas.filter(t => t.dataVencimento === today && t.status !== 'Concluída').forEach(t => loadedItems.push({ ...t, type: 'tarefa' }));
            } catch (e) { console.error("Error parsing gerenciador_tarefas_data", e); }
        }

        // Boletos a Pagar
        const boletosPagarData = localStorage.getItem('boletos_a_pagar_data');
        if (boletosPagarData) {
            try {
                const boletos: Boleto[] = JSON.parse(boletosPagarData);
                boletos.filter(b => b.vencimento === today && !b.pago).forEach(b => loadedItems.push({ ...b, type: 'boletoPagar' }));
            } catch (e) { console.error("Error parsing boletos_a_pagar_data", e); }
        }

        // Despesas Recorrentes Reminders
        const recorrentesData = localStorage.getItem('despesas_recorrentes_data');
        if (recorrentesData) {
            try {
                const recorrentes: DespesaRecorrente[] = JSON.parse(recorrentesData);
                // Show reminder if due date is tomorrow AND status is pending
                recorrentes.filter(r => r.diaVencimento === tomorrowDay && r.status !== 'Lançado').forEach(r => loadedItems.push({ ...r, type: 'lembreteRecorrente' }));
            } catch (e) { console.error("Error parsing despesas_recorrentes_data", e); }
        }

        setItems(loadedItems);
        setIsLoading(false);
    }, []);

    const updateLocalStorage = (storageKey: string, id: string, updates: Partial<any>) => {
        const data = localStorage.getItem(storageKey);
        if (data) {
            let itemsArray: any[] = JSON.parse(data);
            itemsArray = itemsArray.map(item => item.id === id ? { ...item, ...updates } : item);
            localStorage.setItem(storageKey, JSON.stringify(itemsArray));
        }
    };

    const handleConcluir = (item: Item) => {
        switch (item.type) {
            case 'boletoReceber':
                updateLocalStorage('boletos_a_receber_data', item.id, { recebido: true });
                break;
            case 'cheque':
                updateLocalStorage('gerenciador_cheques_data', item.id, { status: 'Compensado' });
                break;
            case 'tarefa':
                updateLocalStorage('gerenciador_tarefas_data', item.id, { status: 'Concluída' });
                break;
            case 'boletoPagar':
                updateLocalStorage('boletos_a_pagar_data', item.id, { pago: true });
                break;
            case 'lembreteRecorrente':
                updateLocalStorage('despesas_recorrentes_data', item.id, { status: 'Lançado' });
                break;
        }
        setItems(prev => prev.filter(i => i.id !== item.id));
    };
    
    const handleAdiar = (item: Item) => {
        const tomorrow = getTomorrowISO();
        switch (item.type) {
            case 'boletoReceber':
            case 'boletoPagar':
                updateLocalStorage(item.type === 'boletoReceber' ? 'boletos_a_receber_data' : 'boletos_a_pagar_data', item.id, { vencimento: tomorrow });
                break;
            case 'cheque':
            case 'tarefa':
                 updateLocalStorage(item.type === 'cheque' ? 'gerenciador_cheques_data' : 'gerenciador_tarefas_data', item.id, { dataVencimento: tomorrow });
                break;
            case 'lembreteRecorrente':
                break;
        }
        setItems(prev => prev.filter(i => i.id !== item.id));
    };

    const renderItem = (item: Item) => {
        let title = '';
        let details = '';
        let icon = null;
        let typeColorClass = '';
        let amountClass = '';
        const valor = 'valor' in item ? (item.valor || 0) : 0;
        const valorFormatted = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        switch(item.type) {
            case 'boletoReceber':
                title = item.cliente || item.credor || 'Cliente';
                details = `Boleto a Receber`;
                typeColorClass = 'border-l-4 border-l-success';
                amountClass = 'text-success font-bold';
                break;
            case 'cheque':
                title = item.emitente;
                details = `Cheque Nº ${item.numero}`;
                typeColorClass = 'border-l-4 border-l-success';
                amountClass = 'text-success font-bold';
                break;
            case 'tarefa':
                title = item.titulo;
                details = `Prioridade: ${item.prioridade}`;
                typeColorClass = 'border-l-4 border-l-warning';
                break;
            case 'boletoPagar':
                title = item.fornecedor || item.pagador || 'Fornecedor';
                details = `Boleto a Pagar`;
                typeColorClass = 'border-l-4 border-l-danger';
                amountClass = 'text-danger font-bold';
                break;
            case 'lembreteRecorrente':
                title = item.descricao;
                details = `${item.empresa} (Amanhã)`;
                icon = <RefreshIcon className="h-4 w-4 text-text-secondary" />;
                typeColorClass = 'border-l-4 border-l-primary';
                break;
        }
        
        return (
             <div key={item.id} className={`bg-card p-4 rounded-xl shadow-sm border border-border hover:shadow-md transition-all duration-200 group flex justify-between items-start gap-3 ${typeColorClass}`}>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {icon}
                        <h5 className="font-semibold text-text-primary truncate" title={title}>{title}</h5>
                    </div>
                    <p className="text-xs text-text-secondary truncate">{details}</p>
                    {'valor' in item && (
                        <p className={`text-sm mt-1 ${amountClass}`}>{valorFormatted}</p>
                    )}
                </div>
                
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => handleConcluir(item)} 
                        title="Concluir" 
                        className="p-1.5 rounded-full bg-success/10 text-success hover:bg-success hover:text-white transition-colors"
                    >
                        <CheckIcon className="h-4 w-4"/>
                    </button>
                    {item.type !== 'lembreteRecorrente' && (
                        <button 
                            onClick={() => handleAdiar(item)} 
                            title="Adiar para amanhã" 
                            className="p-1.5 rounded-full bg-warning/10 text-warning hover:bg-warning hover:text-white transition-colors"
                        >
                            <CalendarClockIcon className="h-4 w-4"/>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // Categorize items
    const priorities = items.filter(i => i.type === 'tarefa' || i.type === 'lembreteRecorrente');
    const inflows = items.filter(i => i.type === 'boletoReceber' || i.type === 'cheque');
    const outflows = items.filter(i => i.type === 'boletoPagar');

    const counts = {
        receber: inflows.length,
        pagar: outflows.length,
        tarefas: priorities.length,
        total: items.length
    };

    // Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const todayDate = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    const SummaryCard = ({ icon, label, count, colorClass, bgClass }: any) => (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border border-border bg-card shadow-sm`}>
            <div className={`p-3 rounded-full ${bgClass}`}>
                {React.cloneElement(icon, { className: `h-6 w-6 ${colorClass}` })}
            </div>
            <div>
                <p className="text-2xl font-bold text-text-primary">{count}</p>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">{label}</p>
            </div>
        </div>
    );

    const SectionColumn = ({ title, icon, items, emptyMessage }: any) => (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
                {icon}
                <h3 className="text-lg font-bold text-text-primary">{title}</h3>
                <span className="ml-auto text-xs font-bold bg-secondary px-2 py-1 rounded-full text-text-secondary">{items.length}</span>
            </div>
            <div className="flex-grow space-y-3">
                {items.length > 0 ? (
                    items.map(renderItem)
                ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-text-secondary bg-secondary/30 rounded-xl border border-dashed border-border/60">
                        <CheckIcon className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm font-medium opacity-60">{emptyMessage}</p>
                    </div>
                )}
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <div className="flex flex-col items-center gap-3 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-secondary"></div>
                    <p className="text-text-secondary font-medium">Carregando seu dia...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-fade-in flex flex-col gap-8 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight mb-1">
                        {greeting}!
                    </h1>
                    <p className="text-text-secondary capitalize text-sm md:text-base font-medium">
                        {todayDate}
                    </p>
                </div>
                
                {/* Optional Global Actions could go here */}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard icon={<ArrowDownCircleIcon/>} label="A Pagar" count={counts.pagar} colorClass="text-danger" bgClass="bg-danger/10" />
                <SummaryCard icon={<ArrowUpCircleIcon/>} label="A Receber" count={counts.receber} colorClass="text-success" bgClass="bg-success/10" />
                <SummaryCard icon={<ClipboardListIcon/>} label="Tarefas" count={counts.tarefas} colorClass="text-warning" bgClass="bg-warning/10" />
                <SummaryCard icon={<SparklesIcon/>} label="Total" count={counts.total} colorClass="text-primary" bgClass="bg-primary/10" />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
                {/* Column 1: Priorities */}
                <SectionColumn 
                    title="Prioridades" 
                    icon={<ClipboardListIcon className="h-5 w-5 text-warning" />}
                    items={priorities}
                    emptyMessage="Nenhuma tarefa pendente."
                />

                {/* Column 2: Inflows */}
                <SectionColumn 
                    title="Entradas" 
                    icon={<TrendingUpIcon className="h-5 w-5 text-success" />}
                    items={inflows}
                    emptyMessage="Sem recebimentos hoje."
                />

                {/* Column 3: Outflows */}
                <SectionColumn 
                    title="Saídas" 
                    icon={<ArrowDownCircleIcon className="h-5 w-5 text-danger" />}
                    items={outflows}
                    emptyMessage="Nada a pagar hoje."
                />
            </div>
            
            {counts.total === 0 && (
                <div className="text-center py-12 opacity-50">
                    <SparklesIcon className="h-16 w-16 mx-auto text-primary mb-4 opacity-20" />
                    <h3 className="text-xl font-bold text-text-primary">Tudo Limpo!</h3>
                    <p className="text-text-secondary">Você não tem pendências registradas para hoje.</p>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
