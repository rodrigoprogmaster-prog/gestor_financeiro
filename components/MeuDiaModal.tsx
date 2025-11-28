
import React, { useState, useEffect } from 'react';
import { CheckIcon, CalendarClockIcon, SparklesIcon } from './icons';

// A lightweight 'X' icon for the close button
const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// Interfaces for data from localStorage (simplified, only with necessary fields)
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


const MeuDiaModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
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
             <div key={item.id} className="bg-background p-3 rounded-lg flex items-center justify-between gap-4 border border-border">
                <div>
                    <p className="font-semibold text-text-primary">{title}</p>
                    <p className="text-sm text-text-secondary">{details}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleConcluir(item)} title="Concluir" className="p-2 rounded-full text-success hover:bg-success/10 transition-colors"><CheckIcon className="h-5 w-5"/></button>
                    <button onClick={() => handleAdiar(item)} title="Adiar para amanhã" className="p-2 rounded-full text-yellow-500 hover:bg-yellow-500/10 transition-colors"><CalendarClockIcon className="h-5 w-5"/></button>
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
                <div key={section.type}>
                    <h4 className="font-bold text-text-primary mb-3">{section.title}</h4>
                    <div className="space-y-3">
                        {sectionItems.map(renderItem)}
                    </div>
                </div>
            );
        })
        .filter(Boolean);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h3 className="text-xl font-bold text-text-primary flex items-center gap-2"><SparklesIcon className="h-6 w-6 text-yellow-400"/> Meu Dia - Resumo de Hoje</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary"><XIcon className="h-5 w-5 text-text-secondary"/></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    {isLoading ? (
                        <p className="text-center text-text-secondary">Carregando...</p>
                    ) : renderedSections.length > 0 ? (
                        renderedSections
                    ) : (
                        <div className="text-center py-10">
                            <CheckIcon className="h-12 w-12 text-success mx-auto mb-4" />
                            <p className="font-semibold text-text-primary">Tudo em ordem por hoje!</p>
                            <p className="text-text-secondary">Você não tem pendências para o dia corrente.</p>
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-border mt-auto">
                    <button onClick={onClose} className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Encerrar o Dia</button>
                </div>
            </div>
        </div>
    );
};

export default MeuDiaModal;
