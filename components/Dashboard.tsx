import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { CheckIcon, CalendarClockIcon, SparklesIcon, SearchIcon } from './icons';

interface DashboardProps {
  setView: (view: AppView) => void;
}

// Interfaces for data from localStorage
interface Boleto { id: string; vencimento: string; recebido?: boolean; pago?: boolean; valor: number; cliente?: string; credor?: string; fornecedor?: string; pagador?: string; }
interface Cheque { id: string; dataVencimento: string; status: string; valor: number; emitente: string; numero: string; }
interface Tarefa { id: string; dataVencimento: string; status: string; titulo: string; prioridade: string; }

type Item = 
    | (Boleto & { type: 'boletoReceber' })
    | (Cheque & { type: 'cheque' })
    | (Tarefa & { type: 'tarefa' })
    | (Boleto & { type: 'boletoPagar' });

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
        }
        setItems(prev => prev.filter(i => i.id !== item.id));
    };

    const renderItem = (item: Item) => {
        let title = '';
        let details = '';
        const valor = 'valor' in item ? (item.valor || 0) : 0;
        const valorFormatted = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        switch(item.type) {
            case 'boletoReceber':
                title = `Boleto a Receber: ${item.cliente || item.credor}`;
                details = `Valor: ${valorFormatted}`;
                break;
            case 'cheque':
                title = `Cheque: ${item.emitente}`;
                details = `Nº ${item.numero}, Valor: ${valorFormatted}`;
                break;
            case 'tarefa':
                title = `Tarefa: ${item.titulo}`;
                details = `Prioridade: ${item.prioridade}`;
                break;
            case 'boletoPagar':
                title = `Boleto a Pagar: ${item.fornecedor || item.pagador}`;
                details = `Valor: ${valorFormatted}`;
                break;
        }
        
        return (
             <div key={item.id} className="bg-card p-4 rounded-2xl flex items-center justify-between gap-4 border border-border hover:shadow-sm transition-shadow">
                <div>
                    <p className="font-semibold text-text-primary">{title}</p>
                    <p className="text-sm text-text-secondary">{details}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleConcluir(item)} title="Concluir" className="p-2 rounded-full text-success hover:bg-success/10 transition-colors border border-success/20"><CheckIcon className="h-5 w-5"/></button>
                    <button onClick={() => handleAdiar(item)} title="Adiar para amanhã" className="p-2 rounded-full text-warning hover:bg-warning/10 transition-colors border border-warning/20"><CalendarClockIcon className="h-5 w-5"/></button>
                </div>
            </div>
        );
    };

    const sections: { title: string, type: Item['type'] }[] = [
        { title: 'Boletos a Receber', type: 'boletoReceber' },
        { title: 'Cheques a Compensar', type: 'cheque' },
        { title: 'Tarefas do Dia', type: 'tarefa' },
        { title: 'Boletos a Pagar', type: 'boletoPagar' },
    ];

    const renderedSections = sections
        .map(section => {
            const sectionItems = items.filter(item => item.type === section.type);
            if (sectionItems.length === 0) return null;
            return (
                <div key={section.type} className="mb-6">
                    <h4 className="font-bold text-text-primary mb-3 text-lg border-b border-border pb-2">{section.title}</h4>
                    <div className="space-y-3">
                        {sectionItems.map(renderItem)}
                    </div>
                </div>
            );
        })
        .filter(Boolean);

    return (
        <div className="animate-fade-in flex flex-col flex-grow w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-8 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                    <div className="p-2 bg-warning/10 rounded-full">
                        <SparklesIcon className="h-6 w-6 text-warning"/>
                    </div>
                    <h2 className="text-3xl font-bold text-text-primary font-heading tracking-tight">Meu Dia</h2>
                </div>
                <p className="text-text-secondary max-w-2xl">
                    Resumo de todas as pendências financeiras e tarefas agendadas para hoje.
                </p>
            </div>
            
            <div className="flex-grow">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-text-secondary">Carregando...</p>
                    </div>
                ) : renderedSections.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {renderedSections}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-card rounded-2xl border border-border">
                        <CheckIcon className="h-16 w-16 text-success mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-text-primary mb-2">Tudo em ordem!</h3>
                        <p className="text-text-secondary">Você não tem pendências para o dia de hoje.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;