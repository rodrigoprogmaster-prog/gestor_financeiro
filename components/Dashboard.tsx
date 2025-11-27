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

// Interfaces for data
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
        const tomorrowDate = new Date();
        tomorrowDate.setDate(new Date().getDate() + 1);
        const tomorrowDay = tomorrowDate.getDate();

        const loadedItems: Item[] = [];

        // Load data from local storage (omitted detailed parsing logic for brevity, assuming same logic as before)
        const loadData = (key: string, type: any, filterFn: any) => {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    parsed.filter(filterFn).forEach((item: any) => loadedItems.push({ ...item, type }));
                } catch (e) { console.error(`Error parsing ${key}`, e); }
            }
        };

        loadData('boletos_a_receber_data', 'boletoReceber', (b: Boleto) => b.vencimento === today && !b.recebido);
        loadData('gerenciador_cheques_data', 'cheque', (c: Cheque) => c.dataVencimento === today && c.status === 'A Depositar');
        loadData('gerenciador_tarefas_data', 'tarefa', (t: Tarefa) => t.dataVencimento === today && t.status !== 'Concluída');
        loadData('boletos_a_pagar_data', 'boletoPagar', (b: Boleto) => b.vencimento === today && !b.pago);
        loadData('despesas_recorrentes_data', 'lembreteRecorrente', (r: DespesaRecorrente) => r.diaVencimento === tomorrowDay && r.status !== 'Lançado');

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
        let key = '';
        let update = {};
        
        switch (item.type) {
            case 'boletoReceber': key = 'boletos_a_receber_data'; update = { recebido: true }; break;
            case 'cheque': key = 'gerenciador_cheques_data'; update = { status: 'Compensado' }; break;
            case 'tarefa': key = 'gerenciador_tarefas_data'; update = { status: 'Concluída' }; break;
            case 'boletoPagar': key = 'boletos_a_pagar_data'; update = { pago: true }; break;
            case 'lembreteRecorrente': key = 'despesas_recorrentes_data'; update = { status: 'Lançado' }; break;
        }
        
        if(key) updateLocalStorage(key, item.id, update);
        setItems(prev => prev.filter(i => i.id !== item.id));
    };
    
    const handleAdiar = (item: Item) => {
        const tomorrow = getTomorrowISO();
        let key = '';
        let update = {};

        switch (item.type) {
            case 'boletoReceber': key = 'boletos_a_receber_data'; update = { vencimento: tomorrow }; break;
            case 'boletoPagar': key = 'boletos_a_pagar_data'; update = { vencimento: tomorrow }; break;
            case 'cheque': key = 'gerenciador_cheques_data'; update = { dataVencimento: tomorrow }; break;
            case 'tarefa': key = 'gerenciador_tarefas_data'; update = { dataVencimento: tomorrow }; break;
        }

        if(key) updateLocalStorage(key, item.id, update);
        setItems(prev => prev.filter(i => i.id !== item.id));
    };

    const renderItem = (item: Item) => {
        let title = '';
        let details = '';
        let icon = null;
        let borderColor = 'border-gray-200';
        let amountClass = 'text-gray-600';
        let tag = null;

        const valor = 'valor' in item ? (item.valor || 0) : 0;
        const valorFormatted = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        switch(item.type) {
            case 'boletoReceber':
                title = item.cliente || item.credor || 'Cliente';
                details = `Recebimento`;
                borderColor = 'border-l-emerald-500';
                amountClass = 'text-emerald-600 font-semibold';
                tag = <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Receber</span>;
                break;
            case 'cheque':
                title = item.emitente;
                details = `Cheque Nº ${item.numero}`;
                borderColor = 'border-l-emerald-500';
                amountClass = 'text-emerald-600 font-semibold';
                tag = <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Cheque</span>;
                break;
            case 'tarefa':
                title = item.titulo;
                details = `Prioridade: ${item.prioridade}`;
                borderColor = 'border-l-orange-500';
                tag = <span className="text-[10px] font-bold uppercase text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">Tarefa</span>;
                break;
            case 'boletoPagar':
                title = item.fornecedor || item.pagador || 'Fornecedor';
                details = `Pagamento`;
                borderColor = 'border-l-red-500';
                amountClass = 'text-red-600 font-semibold';
                tag = <span className="text-[10px] font-bold uppercase text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Pagar</span>;
                break;
            case 'lembreteRecorrente':
                title = item.descricao;
                details = `${item.empresa}`;
                icon = <RefreshIcon className="h-4 w-4 text-blue-500" />;
                borderColor = 'border-l-blue-500';
                tag = <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Lembrete</span>;
                break;
        }
        
        return (
             <div key={item.id} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-[3px] ${borderColor} hover:shadow-md transition-all duration-200 group flex justify-between items-center gap-4`}>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            {icon}
                            <h5 className="font-semibold text-gray-900 truncate text-sm" title={title}>{title}</h5>
                        </div>
                        {tag}
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500 truncate">{details}</p>
                        {'valor' in item && (
                            <p className={`text-sm ${amountClass}`}>{valorFormatted}</p>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => handleConcluir(item)} 
                        title="Concluir" 
                        className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-colors"
                    >
                        <CheckIcon className="h-4 w-4"/>
                    </button>
                    {item.type !== 'lembreteRecorrente' && (
                        <button 
                            onClick={() => handleAdiar(item)} 
                            title="Adiar" 
                            className="p-1.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-600 hover:text-white transition-colors"
                        >
                            <CalendarClockIcon className="h-4 w-4"/>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const priorities = items.filter(i => i.type === 'tarefa' || i.type === 'lembreteRecorrente');
    const inflows = items.filter(i => i.type === 'boletoReceber' || i.type === 'cheque');
    const outflows = items.filter(i => i.type === 'boletoPagar');

    const counts = {
        receber: inflows.length,
        pagar: outflows.length,
        tarefas: priorities.length,
        total: items.length
    };

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const todayDate = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    const SummaryCard = ({ icon, label, count, colorClass, bgClass, borderColor }: any) => (
        <div className={`flex flex-col items-center justify-center p-5 rounded-xl border ${borderColor} bg-white shadow-sm hover:shadow-md transition-shadow`}>
            <div className={`p-3 rounded-full ${bgClass} mb-3`}>
                {React.cloneElement(icon, { className: `h-6 w-6 ${colorClass}` })}
            </div>
            <p className="text-2xl font-bold text-gray-900">{count}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        </div>
    );

    const SectionColumn = ({ title, icon, items, emptyMessage }: any) => (
        <div className="flex flex-col h-full bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100 text-gray-500">
                    {icon}
                </div>
                <h3 className="text-base font-bold text-gray-800">{title}</h3>
                <span className="ml-auto text-xs font-bold bg-white px-2 py-1 rounded-full text-gray-500 border border-gray-200 shadow-sm">{items.length}</span>
            </div>
            <div className="flex-grow space-y-3 overflow-y-auto custom-scrollbar pr-1 max-h-[500px]">
                {items.length > 0 ? (
                    items.map(renderItem)
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                        <CheckIcon className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm font-medium opacity-60">{emptyMessage}</p>
                    </div>
                )}
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium text-sm animate-pulse">Carregando painel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 w-full h-full overflow-y-auto animate-fade-in flex flex-col gap-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                        {greeting}, <span className="text-orange-600">Bem-vindo</span>.
                    </h1>
                    <p className="text-gray-500 capitalize font-medium text-sm">
                        {todayDate}
                    </p>
                </div>
                <button className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-orange-600 transition-colors bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm hover:border-orange-200">
                    <CalendarClockIcon className="h-4 w-4" />
                    <span>Ver agenda completa</span>
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard icon={<ClipboardListIcon/>} label="Tarefas" count={counts.tarefas} colorClass="text-orange-600" bgClass="bg-orange-50" borderColor="border-orange-100" />
                <SummaryCard icon={<ArrowUpCircleIcon/>} label="A Receber" count={counts.receber} colorClass="text-emerald-600" bgClass="bg-emerald-50" borderColor="border-emerald-100" />
                <SummaryCard icon={<ArrowDownCircleIcon/>} label="A Pagar" count={counts.pagar} colorClass="text-red-600" bgClass="bg-red-50" borderColor="border-red-100" />
                <SummaryCard icon={<SparklesIcon/>} label="Total Pendente" count={counts.total} colorClass="text-gray-600" bgClass="bg-gray-100" borderColor="border-gray-200" />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
                {/* Column 1: Priorities */}
                <SectionColumn 
                    title="Prioridades" 
                    icon={<ClipboardListIcon className="h-4 w-4" />}
                    items={priorities}
                    emptyMessage="Nenhuma tarefa pendente."
                />

                {/* Column 2: Inflows */}
                <SectionColumn 
                    title="Entradas" 
                    icon={<TrendingUpIcon className="h-4 w-4" />}
                    items={inflows}
                    emptyMessage="Sem recebimentos hoje."
                />

                {/* Column 3: Outflows */}
                <SectionColumn 
                    title="Saídas" 
                    icon={<ArrowDownCircleIcon className="h-4 w-4" />}
                    items={outflows}
                    emptyMessage="Nada a pagar hoje."
                />
            </div>
            
            {counts.total === 0 && (
                <div className="text-center py-12">
                    <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SparklesIcon className="h-10 w-10 text-orange-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Tudo Limpo!</h3>
                    <p className="text-gray-500 max-w-xs mx-auto mt-2">Você não tem pendências registradas para hoje. Aproveite o seu dia.</p>
                </div>
            )}
        </div>
    );
};

export default Dashboard;