import React from 'react';
import { AppView } from '../types';
import { 
    ArrowUpCircleIcon, CheckIcon, ArrowDownCircleIcon, CalendarClockIcon, 
    TrendingUpIcon, DatabaseIcon, ReportIcon, CreditCardIcon, 
    ClipboardCheckIcon, SettingsIcon 
} from './icons';

interface DashboardProps {
  setView: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
    const cards = [
        { title: "Boletos a Receber", view: AppView.CONTROLE_CHEQUES, icon: <ArrowUpCircleIcon className="h-8 w-8 text-primary" />, description: "Gerencie e acompanhe os boletos emitidos para seus clientes." },
        { title: "Gerenciador de Cheques", view: AppView.GESTAO_BOLETOS, icon: <CheckIcon className="h-8 w-8 text-primary" />, description: "Controle os cheques recebidos, seus status e datas de compensação." },
        { title: "Boletos a Pagar", view: AppView.CONTROLE_BOLETOS, icon: <ArrowDownCircleIcon className="h-8 w-8 text-primary" />, description: "Organize e monitore suas contas e boletos a serem pagos." },
        { title: "Títulos Prorrogados", view: AppView.TITULOS_PRORROGADOS, icon: <CalendarClockIcon className="h-8 w-8 text-primary" />, description: "Acompanhe títulos com vencimentos adiados e negociações." },
        { title: "Contas Bancárias", view: AppView.CADASTRO_CONTAS_BANCARIAS, icon: <DatabaseIcon className="h-8 w-8 text-primary" />, description: "Cadastre e gerencie todas as contas bancárias da empresa." },
        { title: "Cartões de Crédito", view: AppView.GERENCIADOR_CARTOES, icon: <CreditCardIcon className="h-8 w-8 text-primary" />, description: "Importe faturas e gerencie os gastos dos cartões corporativos." },
        { title: "Fechamento de Período", view: AppView.FECHAMENTO_PERIODO, icon: <ClipboardCheckIcon className="h-8 w-8 text-primary" />, description: "Realize a conciliação e o fechamento financeiro do mês." },
        { title: "Previsão Financeira", view: AppView.PREVISAO_FINANCEIRA, icon: <TrendingUpIcon className="h-8 w-8 text-primary" />, description: "Crie e analise previsões de fluxo de caixa para Fábrica e Cristiano." },
        { title: "Pagamentos Diários", view: AppView.PAGAMENTOS_DIARIOS, icon: <ReportIcon className="h-8 w-8 text-primary" />, description: "Registre e controle os pagamentos diários da Fábrica e Cristiano." },
        { title: "Configurações", view: AppView.CONFIGURACAO_SEGURANCA, icon: <SettingsIcon className="h-8 w-8 text-primary" />, description: "Ajuste temas, fontes e gerencie backups do sistema." },
    ];

    return (
        <div className="animate-fade-in flex flex-col flex-grow">
            <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary mb-2 font-heading">Bem-vindo ao Gerenciador Financeiro PJ</h2>
                <p className="text-lg text-text-secondary">Selecione um módulo abaixo para começar a gerenciar suas finanças.</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {cards.map((card) => (
                    <div
                      key={card.title}
                      onClick={() => setView(card.view)}
                      className="bg-card rounded-xl shadow-lg p-6 flex flex-col items-center text-center cursor-pointer transform hover:scale-105 transition-transform duration-300 border border-border hover:border-primary"
                    >
                        <div className="mb-4">{card.icon}</div>
                        <div className="flex flex-col flex-grow justify-center">
                            <h4 className="text-md font-semibold text-text-primary">{card.title}</h4>
                            <p className="text-sm text-text-secondary mt-2">{card.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <footer className="text-center text-sm text-text-secondary mt-auto py-4 border-t border-border">
                @DESENVOLVIDO POR RODRIGO MORAES, 2025, VERSÃO 1
            </footer>
        </div>
    );
};

export default Dashboard;