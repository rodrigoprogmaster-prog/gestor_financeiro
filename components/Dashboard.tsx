import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { 
    CheckIcon, 
    CalendarClockIcon, 
    SparklesIcon, 
    ArrowUpCircleIcon,
    ArrowDownCircleIcon,
    ClipboardListIcon,
    TrendingUpIcon,
    CreditCardIcon
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

    const SummaryCard = ({ icon, label, count, colorClass, bgClass, onClick }: any) => (
        <div onClick={onClick} className={`flex items-center p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group`}>
            <div className={`p-3 rounded-xl ${bgClass} mr-4 transition-colors`}>
                {React.cloneElement(icon, { className: `h-6 w-6 ${colorClass}` })}
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{count}</p>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
            </div>
        </div>
    );

    const renderListItem = (item: Item, minimal: boolean = false) => {
        let title = '';
        let subtitle = '';
        let valueElement = null;
        let actionColor = '';
        let iconBg = '';
        
        const valor = 'valor' in item ? (item.valor || 0) : 0;
        const valorFormatted = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        switch(item.type) {
            case 'boletoReceber':
                title = item.cliente || item.credor || 'Cliente';
                subtitle = 'Boleto a Receber';
                valueElement = <span className="text-emerald-600 font-bold">{valorFormatted}</span>;
                actionColor = 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100';
                iconBg = 'bg-emerald-100 text-emerald-600';
                break;
            case 'cheque':
                title = item.emitente;
                subtitle = `Cheque Nº ${item.numero}`;
                valueElement = <span className="text-emerald-600 font-bold">{valorFormatted}</span>;
                actionColor = 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100';
                iconBg = 'bg-emerald-100 text-emerald-600';
                break;
            case 'boletoPagar':
                title = item.fornecedor || item.pagador || 'Fornecedor';
                subtitle = 'Boleto a Pagar';
                valueElement = <span className="text-red-600 font-bold">{valorFormatted}</span>;
                actionColor = 'text-red-600 bg-red-50 hover:bg-red-100';
                iconBg = 'bg-red-100 text-red-600';
                break;
            case 'tarefa':
                title = item.titulo;
                subtitle = item.prioridade;
                actionColor = 'text-orange-600 bg-orange-50 hover:bg-orange-100';
                iconBg = 'bg-orange-100 text-orange-600';
                break;
            case 'lembreteRecorrente':
                title = item.descricao;
                subtitle = item.empresa;
                actionColor = 'text-blue-600 bg-blue-50 hover:bg-blue-100';
                iconBg = 'bg-blue-100 text-blue-600';
                break;
        }

        return (
            <div key={item.id} className="group flex items-center justify-between p-3.5 bg-white border border-gray-100 rounded-xl hover:border-orange-200 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg} bg-opacity-20`}>
                        {item.type.includes('boleto') && <CreditCardIcon className="h-4 w-4" />}
                        {item.type === 'cheque' && <TrendingUpIcon className="h-4 w-4" />}
                        {item.type === 'tarefa' && <ClipboardListIcon className="h-4 w-4" />}
                        {item.type === 'lembreteRecorrente' && <CalendarClockIcon className="h-4 w-4" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-gray-900 truncate" title={title}>{title}</span>
                        <span className="text-xs text-gray-500 truncate">{subtitle}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 pl-2 flex-shrink-0">
                    {valueElement && !minimal && (
                        <div className="text-right hidden sm:block">
                            {valueElement}
                        </div>
                    )}
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleConcluir(item); }}
                            className={`p-1.5 rounded-lg ${actionColor} transition-colors`}
                            title="Concluir"
                        >
                            <CheckIcon className="h-4 w-4" />
                        </button>
                        {item.type !== 'lembreteRecorrente' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleAdiar(item); }}
                                className="p-1.5 rounded-lg text-gray-400 bg-gray-50 hover:bg-gray-200 hover:text-gray-600 transition-colors"
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
                    <p className="text-gray-500 font-medium text-sm capitalize">
                        {todayDate}
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard icon={<ClipboardListIcon/>} label="Tarefas" count={counts.tarefas} colorClass="text-orange-600" bgClass="bg-orange-50" />
                <SummaryCard icon={<ArrowUpCircleIcon/>} label="A Receber" count={counts.receber} colorClass="text-emerald-600" bgClass="bg-emerald-50" onClick={() => setActiveTab('entradas')} />
                <SummaryCard icon={<ArrowDownCircleIcon/>} label="A Pagar" count={counts.pagar} colorClass="text-red-600" bgClass="bg-red-50" onClick={() => setActiveTab('saidas')} />
                <SummaryCard icon={<SparklesIcon/>} label="Total Pendente" count={counts.total} colorClass="text-gray-600" bgClass="bg-gray-100" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow min-h-0">
                
                {/* Left Column: Financial Center (Unified Tabs) */}
                <div className="lg:col-span-2 flex flex-col h-full bg-gray-50/50 rounded-3xl border border-gray-100 overflow-hidden">
                    {/* Tabs Header */}
                    <div className="flex items-center border-b border-gray-200 bg-white px-6">
                        <button 
                            onClick={() => setActiveTab('entradas')}
                            className={`flex items-center gap-2 py-4 px-4 border-b-2 text-sm font-bold transition-all ${activeTab === 'entradas' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <ArrowUpCircleIcon className="h-4 w-4" />
                            Recebimentos ({inflows.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('saidas')}
                            className={`flex items-center gap-2 py-4 px-4 border-b-2 text-sm font-bold transition-all ${activeTab === 'saidas' ? 'border-red-500 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <ArrowDownCircleIcon className="h-4 w-4" />
                            Pagamentos ({outflows.length})
                        </button>
                    </div>

                    {/* Financial Content */}
                    <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                        {activeTab === 'entradas' ? (
                            inflows.length > 0 ? (
                                <div className="space-y-3">
                                    {inflows.map(item => renderListItem(item))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <SparklesIcon className="h-10 w-10 mb-3 opacity-20 text-emerald-500" />
                                    <p className="text-sm">Sem recebimentos pendentes.</p>
                                </div>
                            )
                        ) : (
                            outflows.length > 0 ? (
                                <div className="space-y-3">
                                    {outflows.map(item => renderListItem(item))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <CheckIcon className="h-10 w-10 mb-3 opacity-20 text-red-500" />
                                    <p className="text-sm">Tudo pago por hoje.</p>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Right Column: Focus & Priorities */}
                <div className="lg:col-span-1 flex flex-col h-full bg-orange-50/30 rounded-3xl border border-orange-100/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardListIcon className="h-5 w-5 text-orange-600" />
                            Minhas Prioridades
                        </h3>
                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">{priorities.length}</span>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 pr-1">
                        {priorities.length > 0 ? (
                            priorities.map(item => renderListItem(item, true))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-orange-100">
                                <p className="text-sm font-medium text-orange-400">Lista vazia.</p>
                                <p className="text-xs mt-1">Aproveite o dia livre!</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Quick Add Button Hint */}
                    <button 
                        onClick={() => setView(AppView.GERENCIADOR_TAREFAS)}
                        className="w-full mt-4 py-3 rounded-xl bg-white border border-orange-200 text-orange-700 font-bold text-sm hover:bg-orange-50 transition-colors shadow-sm"
                    >
                        Gerenciar Tarefas
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;