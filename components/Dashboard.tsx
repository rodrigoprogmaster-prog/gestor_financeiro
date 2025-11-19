import React from 'react';
import { AppView } from '../types';
import { 
    ArrowUpCircleIcon, CheckIcon, ArrowDownCircleIcon, CalendarClockIcon, 
    TrendingUpIcon, DatabaseIcon, ReportIcon, CreditCardIcon, 
    ClipboardCheckIcon, SettingsIcon, ClipboardListIcon
} from './icons';

interface DashboardProps {
  setView: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
    const cards = [
        { title: "Boletos a Receber", view: AppView.CONTROLE_CHEQUES, icon: <ArrowUpCircleIcon className="h-6 w-6 text-primary" />, description: "Controle de boletos emitidos para clientes." },
        { title: "Gerenciador de Cheques", view: AppView.GESTAO_BOLETOS, icon: <CheckIcon className="h-6 w-6 text-primary" />, description: "Gestão de status e compensação de cheques." },
        { title: "Boletos a Pagar", view: AppView.CONTROLE_BOLETOS, icon: <ArrowDownCircleIcon className="h-6 w-6 text-primary" />, description: "Organização de contas e pagamentos futuros." },
        { title: "Tarefas", view: AppView.GERENCIADOR_TAREFAS, icon: <ClipboardListIcon className="h-6 w-6 text-primary" />, description: "Lista de tarefas e prioridades diárias." },
        { title: "Títulos Prorrogados", view: AppView.TITULOS_PRORROGADOS, icon: <CalendarClockIcon className="h-6 w-6 text-primary" />, description: "Monitoramento de títulos com vencimento adiado." },
        { title: "Contas Bancárias", view: AppView.CADASTRO_CONTAS_BANCARIAS, icon: <DatabaseIcon className="h-6 w-6 text-primary" />, description: "Cadastro centralizado de contas bancárias." },
        { title: "Cartões de Crédito", view: AppView.GERENCIADOR_CARTOES, icon: <CreditCardIcon className="h-6 w-6 text-primary" />, description: "Controle de faturas e lançamentos de cartões." },
        { title: "Fechamento", view: AppView.FECHAMENTO_PERIODO, icon: <ClipboardCheckIcon className="h-6 w-6 text-primary" />, description: "Conciliação e fechamento mensal de contas." },
        { title: "Previsão Financeira", view: AppView.PREVISAO_FINANCEIRA, icon: <TrendingUpIcon className="h-6 w-6 text-primary" />, description: "Fluxo de caixa e previsões futuras." },
        { title: "Pagamentos Diários", view: AppView.PAGAMENTOS_DIARIOS, icon: <ReportIcon className="h-6 w-6 text-primary" />, description: "Registro diário de pagamentos da Fábrica/Cristiano." },
        { title: "Configurações", view: AppView.CONFIGURACAO_SEGURANCA, icon: <SettingsIcon className="h-6 w-6 text-primary" />, description: "Segurança, backup e personalização do sistema." },
    ];

    return (
        <div className="animate-fade-in flex flex-col flex-grow w-full max-w-7xl mx-auto">
            <div className="mb-6 border-b border-border pb-4">
                <h2 className="text-2xl font-bold text-text-primary font-heading tracking-tight">Visão Geral</h2>
                <p className="text-sm text-text-secondary mt-1">Acesse os módulos de gestão financeira.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {cards.map((card) => (
                    <div
                      key={card.title}
                      onClick={() => setView(card.view)}
                      className="group bg-card rounded-lg border border-border p-5 cursor-pointer hover:border-primary hover:shadow-sm transition-all duration-200 flex flex-col"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="p-2 rounded-md bg-secondary border border-border group-hover:border-primary/20 transition-colors">
                                {card.icon}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors">{card.title}</h4>
                            <p className="text-xs text-text-secondary mt-1 leading-relaxed">{card.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <footer className="text-center text-xs text-text-secondary mt-auto py-6 border-t border-border/50">
                &copy; 2025 Gerenciador Financeiro PJ. Todos os direitos reservados.
            </footer>
        </div>
    );
};

export default Dashboard;