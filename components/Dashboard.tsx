
import React, { useState, useEffect, useMemo } from 'react';
import { AppView } from '../types';
import { 
    CheckIcon, 
    CalendarClockIcon, 
    SparklesIcon, 
    ArrowUpCircleIcon,
    ArrowDownCircleIcon,
    ClipboardListIcon,
    TrendingUpIcon,
    CreditCardIcon,
    WalletIcon
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

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'entradas' | 'saidas'>('entradas');

    useEffect(() => {
        const today = getTodayISO();
        const tomorrowDate = new Date();
        tomorrowDate.setDate(new Date().getDate() + 1);
        const tomorrowDay = tomorrowDate.getDate();

        const loadedItems: Item[] = [];

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

    // Derived State
    const priorities = useMemo(() => items.filter(i => i.type === 'tarefa' || i.type === 'lembreteRecorrente'), [items]);
    const inflows = useMemo(() => items.filter(i => i.type === 'boletoReceber' || i.type === 'cheque'), [items]);
    const outflows = useMemo(() => items.filter(i => i.type === 'boletoPagar'), [items]);

    const kpi = useMemo(() => {
        const totalIn = inflows.reduce((acc, item) => acc + ('valor' in item ? (item.valor || 0) : 0), 0);
        const totalOut = outflows.reduce((acc, item) => acc + ('valor' in item ? (item.valor || 0) : 0), 0);
        return {
            in: totalIn,
            out: totalOut,
            balance: totalIn - totalOut,
            tasks: priorities.length
        };
    }, [inflows, outflows, priorities]);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const todayDate = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    // Components
    const KpiCard = ({ title, value, icon, type, onClick }: any) => {
        const colors = {
            success: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            danger: 'text-rose-600 bg-rose-50 border-rose-100',
            info: 'text-blue-600 bg-blue-50 border-blue-100',
            neutral: 'text-orange-600 bg-orange-50 border-orange-100'
        };
        const style = colors[type as keyof typeof colors];

        return (
            <div 
                onClick={onClick}
                className={`group relative overflow-hidden rounded-3xl border p-5 transition-all duration-300 hover:shadow-md cursor-pointer bg-white ${type === 'neutral' ? 'border-orange-200' : 'border-gray-100'}`}
            >
                <div className="flex justify-between items-start mb-2">
                    <div className={`p-2.5 rounded-2xl ${style}`}>
                        {React.cloneElement(icon, { className: "h-5 w-5" })}
                    </div>
                    {type === 'neutral' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-1 rounded-full">Saldo Previsto</span>
                    )}
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">{title}</p>
                </div>
            </div>
        );
    };

    const renderListItem = (item: Item) => {
        let title = '';
        let subtitle = '';
        let valueElement = null;
        let icon = null;
        
        const valor = 'valor' in item ? (item.valor || 0) : 0;
        
        switch(item.type) {
            case 'boletoReceber':
                title = item.cliente || item.credor || 'Cliente';
                subtitle = 'Boleto a Receber';
                valueElement = <span className="text-emerald-600 font-bold tabular-nums">{formatCurrency(valor)}</span>;
                icon = <ArrowUpCircleIcon className="h-4 w-4 text-emerald-500" />;
                break;
            case 'cheque':
                title = item.emitente;
                subtitle = `Cheque Nº ${item.numero}`;
                valueElement = <span className="text-emerald-600 font-bold tabular-nums">{formatCurrency(valor)}</span>;
                icon = <TrendingUpIcon className="h-4 w-4 text-emerald-500" />;
                break;
            case 'boletoPagar':
                title = item.fornecedor || item.pagador || 'Fornecedor';
                subtitle = 'Boleto a Pagar';
                valueElement = <span className="text-rose-600 font-bold tabular-nums">{formatCurrency(valor)}</span>;
                icon = <ArrowDownCircleIcon className="h-4 w-4 text-rose-500" />;
                break;
            case 'tarefa':
                title = item.titulo;
                subtitle = item.prioridade;
                icon = <ClipboardListIcon className="h-4 w-4 text-orange-500" />;
                break;
            case 'lembreteRecorrente':
                title = item.descricao;
                subtitle = item.empresa;
                icon = <CalendarClockIcon className="h-4 w-4 text-blue-500" />;
                break;
        }

        return (
            <div key={item.id} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all duration-200">
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className="h-10 w-10 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        {icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-gray-900 truncate">{title}</span>
                        <span className="text-xs text-gray-500 truncate">{subtitle}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 pl-2 flex-shrink-0">
                    {valueElement}
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 transform translate-x-2 group-hover:translate-x-0">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleConcluir(item); }}
                            className="p-1.5 rounded-full bg-white border border-gray-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors shadow-sm"
                            title="Concluir"
                        >
                            <CheckIcon className="h-4 w-4" />
                        </button>
                        {item.type !== 'lembreteRecorrente' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleAdiar(item); }}
                                className="p-1.5 rounded-full bg-white border border-gray-200 text-orange-600 hover:bg-orange-50 hover:border-orange-200 transition-colors shadow-sm"
                                title="Adiar"
                            >
                                <CalendarClockIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-background">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-orange-100 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 w-full h-full overflow-y-auto animate-fade-in flex flex-col max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                    {greeting}, <span className="text-orange-600">Bem-vindo</span>.
                </h1>
                <p className="text-gray-500 font-medium text-sm capitalize mt-1">
                    {todayDate}
                </p>
            </div>

            {/* KPI Grid - Clean & Minimalist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KpiCard 
                    title="Recebimentos Hoje" 
                    value={formatCurrency(kpi.in)} 
                    icon={<ArrowUpCircleIcon />} 
                    type="success"
                    onClick={() => setActiveTab('entradas')}
                />
                <KpiCard 
                    title="Pagamentos Hoje" 
                    value={formatCurrency(kpi.out)} 
                    icon={<ArrowDownCircleIcon />} 
                    type="danger"
                    onClick={() => setActiveTab('saidas')}
                />
                <KpiCard 
                    title="Saldo do Dia" 
                    value={formatCurrency(kpi.balance)} 
                    icon={<WalletIcon />} 
                    type="neutral"
                />
                <KpiCard 
                    title="Tarefas Pendentes" 
                    value={kpi.tasks.toString()} 
                    icon={<ClipboardListIcon />} 
                    type="info"
                />
            </div>

            {/* Main Content Area - Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow min-h-0">
                
                {/* Financial Feed (2/3) */}
                <div className="lg:col-span-2 flex flex-col h-full bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <CreditCardIcon className="h-5 w-5 text-gray-400" />
                            Movimentação do Dia
                        </h3>
                        <div className="flex bg-gray-50 p-1 rounded-xl">
                            <button 
                                onClick={() => setActiveTab('entradas')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'entradas' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Entradas ({inflows.length})
                            </button>
                            <button 
                                onClick={() => setActiveTab('saidas')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'saidas' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Saídas ({outflows.length})
                            </button>
                        </div>
                    </div>

                    <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                        {activeTab === 'entradas' ? (
                            inflows.length > 0 ? (
                                <div className="space-y-1">{inflows.map(renderListItem)}</div>
                            ) : (
                                <EmptyState message="Sem recebimentos pendentes." subMessage="Tudo limpo por aqui." icon={<SparklesIcon className="h-8 w-8 text-emerald-300" />} />
                            )
                        ) : (
                            outflows.length > 0 ? (
                                <div className="space-y-1">{outflows.map(renderListItem)}</div>
                            ) : (
                                <EmptyState message="Todos os pagamentos realizados." subMessage="Dia livre de débitos." icon={<CheckIcon className="h-8 w-8 text-rose-300" />} />
                            )
                        )}
                    </div>
                </div>

                {/* Focus / Tasks (1/3) */}
                <div className="lg:col-span-1 flex flex-col h-full bg-orange-50/30 rounded-3xl border border-orange-100/50 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardListIcon className="h-5 w-5 text-orange-600" />
                            Minhas Prioridades
                        </h3>
                        <button 
                            onClick={() => setView('GERENCIADOR_TAREFAS' as any)}
                            className="text-xs font-bold text-orange-600 hover:bg-orange-100 px-2 py-1 rounded-lg transition-colors"
                        >
                            Ver todas
                        </button>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {priorities.length > 0 ? (
                            priorities.map(renderListItem)
                        ) : (
                            <EmptyState message="Lista de tarefas vazia." subMessage="Aproveite para planejar amanhã." icon={<ClipboardListIcon className="h-8 w-8 text-orange-300" />} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ message, subMessage, icon }: { message: string, subMessage: string, icon: React.ReactNode }) => (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
        <div className="mb-3 bg-gray-50 p-4 rounded-full">
            {icon}
        </div>
        <p className="text-sm font-medium text-gray-900">{message}</p>
        <p className="text-xs text-gray-500 mt-1">{subMessage}</p>
    </div>
);

export default Dashboard;
