import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, DatabaseIcon, ArrowLeftIcon, TrendingUpIcon, ReportIcon, BoletoIcon, SpinnerIcon, TransferIcon } from './icons';

// Data structure
interface Previsao {
  id: number;
  data: string; // YYYY-MM-DD
  semana: string;
  empresa: string;
  tipo: string;
  receitas: number;
  despesas: number;
}

interface PrevisaoGerada {
    dias: { data: string; receitas: number; despesas: number; resultado: number; saldo: number }[];
    // Adjusted interface to match usage
    totais: { totalReceitas: number; totalDespesas: number; totalResultado: number };
    semana: string;
    dataGeracao: string;
}

// Interface for a launch of payment (matching PagamentosFabrica/Cristiano)
interface Pagamento {
    id: string; // `data-empresa-index` for uniqueness
    data: string;
    empresa: string;
    tipo: string;
    receitas: number;
    despesas: number;
    envia: number; // Default to 0 when transferring from Previsao
    recebe: number; // Default to 0 when transferring from Previsao
  }

interface NavCardProps {
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
}

const NavCard: React.FC<NavCardProps> = ({ title, icon, onClick }) => (
    <div
        onClick={onClick}
        className="bg-card rounded-lg border border-border p-6 flex flex-col items-center text-center cursor-pointer hover:border-primary hover:shadow-sm transition-all duration-200 group"
    >
        <div className="bg-secondary p-4 rounded-full mb-4 border border-border group-hover:border-primary/30 transition-colors">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-1 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-xs text-text-secondary">Clique para visualizar</p>
    </div>
);


const CRISTIANO_PREDEFINED_ENTRIES = [
    { empresa: 'FIBER ADM DE FRANQUIAS ITAU', tipo: 'ITAU' },
    { empresa: 'WORLD WIDE ITAU', tipo: 'ITAU' },
    { empresa: 'CACHOEIRINHA PISCINAS', tipo: 'INTER' },
    { empresa: 'CAMARGOS PISCINAS E SPAS LTDA', tipo: 'INTER' },
    { empresa: 'IPR INDUSTRIA E COMERCIO DE PLASTIC', tipo: 'INTER' },
    { empresa: 'ZMR PISCINAS LTDA.', tipo: 'INTER' },
    { empresa: 'WORLD WIDE SWIMMINGPOOLS NEGOCIOS D', tipo: 'INTER' },
    { empresa: 'Saldo Inicial', tipo: 'INTER' },
    { empresa: 'Cheques A Compensar', tipo: 'INTER' },
    { empresa: 'Recebimento de boletos', tipo: 'INTER' },
];

const FIXED_BANKS = ['INTER', 'XP', 'ITAU', 'BB', 'SANTANDER'];

// Helper Functions
const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const formatDateToBR = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const [year, month, day] = isoDate.split('-');
    // Create a UTC date to avoid timezone issues
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.toLocaleDateString('pt-BR', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};


type View = 'menu' | 'previsao' | 'dashboard' | 'banco' | 'empresa';

// Constants for infinite scroll
const ITEMS_PER_LOAD = 20;
const SCROLL_THRESHOLD = 100; // pixels from the bottom to trigger loading


// Fix: Changed to named export
export const PrevisaoCristiano: React.FC = () => {
    const [previsoes, setPrevisoes] = useState<Previsao[]>(() => {
        const savedPrevisoes = localStorage.getItem('previsoes_cristiano');
        return savedPrevisoes ? JSON.parse(savedPrevisoes) : [];
    });
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPrevisao, setEditingPrevisao] = useState<Partial<Previsao> | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // New Entry State
    const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
    const [newEntry, setNewEntry] = useState<Partial<Previsao>>({
        data: new Date().toISOString().split('T')[0],
        semana: '',
        empresa: '',
        tipo: '',
        receitas: 0,
        despesas: 0
    });
    
    // Default to current date
    const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
    const [closedDates, setClosedDates] = useState<Set<string>>(() => {
        const savedClosedDates = localStorage.getItem('closedDates_cristiano');
        return savedClosedDates ? new Set(JSON.parse(savedClosedDates)) : new Set();
    });
    
    const [view, setView] = useState<View>('previsao');
    
    // New filters for Reports
    const [reportDateFilter, setReportDateFilter] = useState<string>('');
    const [reportWeekFilter, setReportWeekFilter] = useState<string>('');
    
    const [isGerarPrevisaoModalOpen, setIsGerarPrevisaoModalOpen] = useState(false);
    const [isGerarPrevisaoConfirmOpen, setIsGerarPrevisaoConfirmOpen] = useState(false);
    const [semanaParaGerar, setSemanaParaGerar] = useState('');
    const [previsaoGeradaAtiva, setPrevisaoGeradaAtiva] = useState<PrevisaoGerada | null>(null);
    const [historicoPrevisoesGeradas, setHistoricoPrevisoesGeradas] = useState<PrevisaoGerada[]>([]);
    const [dashboardSemanaFilter, setDashboardSemanaFilter] = useState('');
    
    const [isTransferConfirmOpen, setIsTransferConfirmOpen] = useState(false);
    const [transferDate, setTransferDate] = useState('');

    // Infinite scroll states for the 'previsao' table
    const scrollRef = useRef<HTMLDivElement>(null);
    // const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD); // Removed for stability

    useEffect(() => {
        localStorage.setItem('previsoes_cristiano', JSON.stringify(previsoes));
    }, [previsoes]);

    useEffect(() => {
        localStorage.setItem('closedDates_cristiano', JSON.stringify(Array.from(closedDates)));
    }, [closedDates]);

    useEffect(() => {
      const savedGeneratedHistory = localStorage.getItem('historicoPrevisoesGeradas_cristiano');
      if (savedGeneratedHistory) setHistoricoPrevisoesGeradas(JSON.parse(savedGeneratedHistory));
    }, []);

    useEffect(() => {
        if (historicoPrevisoesGeradas.length > 0 || localStorage.getItem('historicoPrevisoesGeradas_cristiano')) {
            localStorage.setItem('historicoPrevisoesGeradas_cristiano', JSON.stringify(historicoPrevisoesGeradas));
        }
    }, [historicoPrevisoesGeradas]);
    
    const filteredHistoricoGerado = useMemo(() => {
        return historicoPrevisoesGeradas.filter(item =>
            item.semana.toLowerCase().includes(dashboardSemanaFilter.toLowerCase())
        );
    }, [historicoPrevisoesGeradas, dashboardSemanaFilter]);

    const uniqueEmpresas = useMemo(() => [...new Set(CRISTIANO_PREDEFINED_ENTRIES.map(e => e.empresa))].sort(), []);
    
    const filteredPrevisoes = useMemo(() => {
        let filtered = previsoes;
        if (dateFilter) {
          filtered = previsoes.filter(p => p.data === dateFilter);
        }
        return [...filtered].sort((a, b) => a.tipo.localeCompare(b.tipo));
    }, [previsoes, dateFilter]);

    const totais = useMemo(() => {
        const source = filteredPrevisoes;
        return source.reduce((acc, item) => {
            acc.totalReceitas += item.receitas;
            acc.totalDespesas += item.despesas;
            acc.saldo += item.receitas - item.despesas;
            return acc;
        }, { totalReceitas: 0, totalDespesas: 0, saldo: 0 });
    }, [filteredPrevisoes]);

    const filteredReportData = useMemo(() => {
        return previsoes.filter(item => {
            const dateMatch = !reportDateFilter || item.data === reportDateFilter;
            const weekMatch = !reportWeekFilter || item.semana.toLowerCase().includes(reportWeekFilter.toLowerCase());
            return dateMatch && weekMatch;
        });
    }, [previsoes, reportDateFilter, reportWeekFilter]);

    const totaisPorBanco = useMemo(() => {
        const porEmpresaBanco = filteredReportData.reduce((acc, item) => {
            const key = `${item.empresa}-${item.tipo}`;
            if (!acc[key]) {
                acc[key] = { empresa: item.empresa, banco: item.tipo, receitas: 0 };
            }
            acc[key].receitas += item.receitas;
            return acc;
        }, {} as Record<string, { empresa: string; banco: string; receitas: number; }>);
    
        return (Object.values(porEmpresaBanco) as { empresa: string; banco: string; receitas: number; }[])
            .filter(item => item.receitas > 0)
            .sort((a, b) => {
                if (a.empresa !== b.empresa) return a.empresa.localeCompare(b.empresa);
                return a.banco.localeCompare(b.banco);
            });
    }, [filteredReportData]);

    const despesasPorEmpresa = useMemo(() => {
        const porEmpresa = filteredReportData.reduce((acc, item) => {
            if (!acc[item.empresa]) {
                acc[item.empresa] = { totalDespesas: 0 };
            }
            acc[item.empresa].totalDespesas += item.despesas;
            return acc;
        }, {} as Record<string, { totalDespesas: number; }>);
        return Object.entries(porEmpresa).map(([empresa, value]) => ({ empresa, totalDespesas: (value as { totalDespesas: number }).totalDespesas })).filter(item => item.totalDespesas > 0).sort((a, b) => b.totalDespesas - a.totalDespesas);
    }, [filteredReportData]);

    const totalDespesasGeral = useMemo(() => {
        return despesasPorEmpresa.reduce((acc, item) => acc + item.totalDespesas, 0);
    }, [despesasPorEmpresa]);

    const handleRowClick = (previsao: Previsao) => {
        if (closedDates.has(previsao.data)) return;
        setEditingPrevisao({ ...previsao });
        setIsEditModalOpen(true);
    };

    const handleOpenAddEntryModal = () => {
        setNewEntry({
            data: dateFilter || new Date().toISOString().split('T')[0],
            semana: '',
            empresa: '',
            tipo: '',
            receitas: 0,
            despesas: 0
        });
        setIsAddEntryModalOpen(true);
    };

    const handleAddNewEntry = () => {
        if (!newEntry.data || !newEntry.empresa || !newEntry.tipo) {
            alert("Preencha Data, Empresa e Banco.");
            return;
        }

        const action = () => {
            const entryToAdd: Previsao = {
                id: Date.now(),
                data: newEntry.data!,
                semana: newEntry.semana || '',
                empresa: newEntry.empresa!,
                tipo: newEntry.tipo!,
                receitas: Number(newEntry.receitas) || 0,
                despesas: Number(newEntry.despesas) || 0,
            };
            setPrevisoes(prev => [...prev, entryToAdd].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()));
            setDateFilter(newEntry.data!);
        };
        
        setConfirmAction({ action, message: `Deseja adicionar este lançamento?` });
        setIsConfirmOpen(true);
        setIsAddEntryModalOpen(false);
    };

    const handleNewEntryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'receitas' || name === 'despesas') {
             let numericValue = value.replace(/\D/g, '');
             if (numericValue === '') numericValue = '0';
             const numberValue = Number(numericValue) / 100;
             setNewEntry(prev => ({ ...prev, [name]: numberValue }));
        } else {
             setNewEntry(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleProceedToConfirmGerar = () => {
        if (!semanaParaGerar.trim()) {
            alert("Por favor, informe a semana.");
            return;
        }
        setIsGerarPrevisaoModalOpen(false); // Close the input modal
        setIsGerarPrevisaoConfirmOpen(true); // Open confirmation
    };
    
    const handleGerarPrevisao = () => {
        const dadosDaSemana = previsoes.filter(item => item.semana.toLowerCase() === semanaParaGerar.trim().toLowerCase());
        if (dadosDaSemana.length === 0) {
            alert(`Nenhum dado de previsão encontrado para a semana "${semanaParaGerar}".`);
            setIsGerarPrevisaoConfirmOpen(false);
            return;
        }
        
        const groupedByDate = dadosDaSemana.reduce((acc, item) => {
            if (!acc[item.data]) {
                acc[item.data] = { data: item.data, receitas: 0, despesas: 0 };
            }
            acc[item.data].receitas += item.receitas;
            acc[item.data].despesas += item.despesas;
            return acc;
        }, {} as Record<string, { data: string; receitas: number; despesas: number; }>);

        const diasOrdenados = (Object.values(groupedByDate) as { data: string; receitas: number; despesas: number; }[])
            .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

        let saldoAcumulado = 0;
        const diasProcessados = diasOrdenados.map(dia => {
            const resultadoDoDia = dia.receitas - dia.despesas;
            saldoAcumulado += resultadoDoDia;
            return { ...dia, resultado: resultadoDoDia, saldo: saldoAcumulado };
        });

        // Consistent key naming for totals
        const totais = diasProcessados.reduce((acc, dia) => {
            acc.totalReceitas += dia.receitas;
            acc.totalDespesas += dia.despesas;
            acc.totalResultado += dia.resultado;
            return acc;
        }, { totalReceitas: 0, totalDespesas: 0, totalResultado: 0 });

        const novaPrevisao: PrevisaoGerada = { dias: diasProcessados, totais, semana: semanaParaGerar.trim(), dataGeracao: new Date().toISOString() };
        
        setHistoricoPrevisoesGeradas(prev => [novaPrevisao, ...prev]);
        setPrevisaoGeradaAtiva(novaPrevisao);
        setView('dashboard');
        
        setIsGerarPrevisaoConfirmOpen(false);
        setIsGerarPrevisaoModalOpen(false);
        setSemanaParaGerar('');
    };

    const handleDeleteClick = (e: React.MouseEvent, previsao: Previsao) => {
        e.stopPropagation();
        if (closedDates.has(previsao.data)) return;
        const action = () => setPrevisoes(previsoes.filter(p => p.id !== previsao.id));
        setConfirmAction({ action, message: 'Deseja excluir esta previsão?' });
        setIsConfirmOpen(true);
    };
    
    const handleDeleteGeneratedForecastClick = (dataGeracaoToDelete: string) => {
        const action = () => setHistoricoPrevisoesGeradas(prev => prev.filter(p => p.dataGeracao !== dataGeracaoToDelete));
        setConfirmAction({ action, message: 'Deseja excluir esta previsão gerada?' });
        setIsConfirmOpen(true);
    };
    
    const handleFecharDia = () => {
        if (!dateFilter || filteredPrevisoes.length === 0) {
            alert("Selecione um dia com lançamentos para fechar.");
            return;
        }
        const action = () => {
            setClosedDates(prev => new Set(prev).add(dateFilter));
        };
        setConfirmAction({ action, message: `Deseja fechar o dia ${formatDateToBR(dateFilter)}?` });
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
      setIsEditModalOpen(false);
      setEditingPrevisao(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (editingPrevisao) {
            const { name, value } = e.target;
            if (name === 'receitas' || name === 'despesas') {
                let numericValue = value.replace(/\D/g, '');
                if (numericValue === '') numericValue = '0';
                const numberValue = Number(numericValue) / 100;
                setEditingPrevisao({ ...editingPrevisao, [name]: numberValue });
            } else {
                setEditingPrevisao({ ...editingPrevisao, [name]: value });
            }
        }
    };

    const handleSaveChanges = () => {
        if (!editingPrevisao || !editingPrevisao.id) return;
        const action = () => {
            setPrevisoes(prev => prev.map(p => p.id === editingPrevisao!.id ? (editingPrevisao as Previsao) : p));
            handleCloseModal();
        };
        setConfirmAction({ action, message: 'Deseja salvar as alterações?' });
        setIsConfirmOpen(true);
    };

    const handleConfirm = () => {
        if (confirmAction.action) confirmAction.action();
        setIsConfirmOpen(false);
    };

    const handleCancelConfirm = () => setIsConfirmOpen(false);

    const isCurrentDayClosed = dateFilter ? closedDates.has(dateFilter) : false;

    const handleTransferToPagamentos = () => {
        if (!dateFilter || filteredPrevisoes.length === 0) {
            alert("Selecione um dia com lançamentos para transferir.");
            return;
        }
        setTransferDate(dateFilter);
        setIsTransferConfirmOpen(true);
    };

    const confirmTransfer = () => {
        const LOCAL_STORAGE_KEY_PAGAMENTOS_CRISTIANO = 'pagamentos_diarios_cristiano';
        const pagamentosData: Pagamento[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PAGAMENTOS_CRISTIANO) || '[]');
        
        const entriesToTransfer = filteredPrevisoes.filter(p => p.receitas > 0 || p.despesas > 0);

        const newPagamentos: Pagamento[] = entriesToTransfer.map(prev => ({
            id: `${prev.data}-${prev.empresa}-${prev.tipo}-${Date.now()}`,
            data: prev.data,
            empresa: prev.empresa,
            tipo: prev.tipo,
            receitas: prev.receitas,
            despesas: prev.despesas,
            envia: 0,
            recebe: 0,
        }));

        const updatedPagamentos = [...pagamentosData, ...newPagamentos];
        localStorage.setItem(LOCAL_STORAGE_KEY_PAGAMENTOS_CRISTIANO, JSON.stringify(updatedPagamentos));
        alert(`${newPagamentos.length} lançamentos do dia ${formatDateToBR(transferDate)} transferidos com sucesso para Pagamentos Diários Cristiano!`);
        setIsTransferConfirmOpen(false);
    };

    const handleScroll = () => {
        // Placeholder for infinite scroll if reintroduced
    };

    if (view === 'menu') {
        return (
            <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in">
                <h2 className="text-2xl font-bold text-text-primary mb-2 text-center">Previsão Cristiano</h2>
                <p className="text-sm text-text-secondary text-center mb-10">Selecione uma área para visualizar.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                    <NavCard title="Previsão" icon={<TrendingUpIcon className="h-6 w-6 text-primary" />} onClick={() => setView('previsao')} />
                    <NavCard title="Dashboard" icon={<ReportIcon className="h-6 w-6 text-primary" />} onClick={() => setView('dashboard')} />
                    <NavCard title="Totais por Banco" icon={<DatabaseIcon className="h-6 w-6 text-primary" />} onClick={() => setView('banco')} />
                    <NavCard title="Despesas por Empresa" icon={<BoletoIcon className="h-6 w-6 text-primary" />} onClick={() => setView('empresa')} />
                </div>
            </div>
        );
    }
    
    const viewTitles: Record<View, string> = { menu: '', previsao: 'Previsão', dashboard: 'Dashboard', banco: 'Totais por Banco e Empresa', empresa: 'Despesas por Empresa' };

    const FilterBar = () => (
        <div className="flex flex-wrap items-center gap-4 mb-4 bg-white p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-secondary">Data:</span>
                <input 
                    type="date" 
                    value={reportDateFilter} 
                    onChange={e => setReportDateFilter(e.target.value)} 
                    className="bg-white border border-border rounded-md px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"
                />
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-secondary">Semana:</span>
                <input 
                    type="text" 
                    placeholder="Ex: Semana 42" 
                    value={reportWeekFilter} 
                    onChange={e => setReportWeekFilter(e.target.value)} 
                    className="bg-white border border-border rounded-md px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9 w-32"
                />
            </div>
            <button 
                onClick={() => {setReportDateFilter(''); setReportWeekFilter('')}} 
                className="px-3 py-1.5 rounded-md bg-secondary hover:bg-border text-text-primary font-medium text-sm h-9 transition-colors"
            >
                Limpar
            </button>
        </div>
    );

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
       <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('menu')} className="flex items-center gap-2 py-2 px-4 rounded-md bg-white border border-border hover:bg-secondary font-medium transition-colors h-9 text-sm">
              <ArrowLeftIcon className="h-4 w-4" /> Voltar
          </button>
          <h2 className="text-xl font-bold text-text-primary">{viewTitles[view]}</h2>
      </div>
      
      {(() => {
        switch (view) {
          case 'previsao':
            return (
              <div className="animate-fade-in flex flex-col h-full">
                <div className="flex flex-col sm:flex-row justify-end sm:items-center mb-6 gap-2">
                    <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-white border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"/>
                    <button onClick={() => setDateFilter('')} className="px-3 py-1.5 rounded-md bg-secondary hover:bg-gray-200 text-text-primary font-medium text-sm h-9 transition-colors">Limpar</button>
                    <button onClick={handleFecharDia} disabled={isCurrentDayClosed || !dateFilter} className="px-3 py-1.5 rounded-md bg-warning hover:bg-warning/90 text-white font-medium text-sm h-9 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm">
                            {isCurrentDayClosed ? 'Dia Fechado' : 'Fechar Dia'}
                    </button>
                    <button onClick={handleOpenAddEntryModal} className="flex items-center justify-center gap-2 bg-primary text-white font-medium py-1.5 px-4 rounded-md hover:bg-primary-hover transition-colors duration-300 h-9 text-sm shadow-sm">
                        <PlusIcon className="h-4 w-4" /> <span>Adicionar</span>
                    </button>
                    <button onClick={handleTransferToPagamentos} disabled={!dateFilter || filteredPrevisoes.length === 0} className="flex items-center justify-center gap-2 bg-success text-white font-medium py-1.5 px-4 rounded-md hover:bg-success/90 transition-colors duration-300 h-9 text-sm shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed">
                        <TransferIcon className="h-4 w-4" /> <span>Transferir para Pagamentos</span>
                    </button>
                </div>
                {filteredPrevisoes.length > 0 && (
                  <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-card p-4 rounded-lg border border-border shadow-sm text-center">
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Total Receitas</p>
                      <p className="text-xl font-bold text-success">{formatCurrency(totais.totalReceitas)}</p>
                    </div>
                    <div className="bg-card p-4 rounded-lg border border-border shadow-sm text-center">
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Total Despesas</p>
                      <p className="text-xl font-bold text-danger">{formatCurrency(totais.totalDespesas)}</p>
                    </div>
                    <div className="bg-card p-4 rounded-lg border border-border shadow-sm text-center">
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Saldo</p>
                      <p className={`text-xl font-bold ${totais.saldo >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(totais.saldo)}</p>
                    </div>
                  </div>
                )}
                <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm flex-grow">
                   <div ref={scrollRef} className="overflow-x-auto overflow-y-auto h-full">
                      <table className="min-w-full divide-y divide-border text-sm text-left">
                        <thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider sticky top-0">
                          <tr><th className="px-6 py-3">Data</th><th className="px-6 py-3">Semana</th><th className="px-6 py-3">Empresa</th><th className="px-6 py-3">Banco</th><th className="px-6 py-3 text-right">Receitas</th><th className="px-6 py-3 text-right">Despesas</th><th className="px-6 py-3 text-right">Resultado</th><th className="px-6 py-3 text-center">Ações</th></tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                          {filteredPrevisoes.length > 0 ? (
                            filteredPrevisoes.map((item) => {
                              const isRowClosed = closedDates.has(item.data);
                              const resultado = item.receitas - item.despesas;
                              return (
                              <tr key={item.id} onClick={() => handleRowClick(item)} className={`hover:bg-secondary transition-colors ${isRowClosed ? 'opacity-60 bg-secondary cursor-not-allowed' : 'cursor-pointer'}`}>
                                <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{formatDateToBR(item.data)}</td>
                                <td className="px-6 py-4 text-text-secondary">{item.semana}</td>
                                <td className="px-6 py-4 text-text-primary whitespace-nowrap">{item.empresa}</td>
                                <td className="px-6 py-4 text-text-secondary">{item.tipo}</td>
                                <td className="px-6 py-4 text-right text-success font-semibold">{formatCurrency(item.receitas)}</td>
                                <td className="px-6 py-4 text-right text-danger font-semibold">{formatCurrency(item.despesas)}</td>
                                <td className={`px-6 py-4 text-right font-bold ${resultado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(resultado)}</td>
                                <td className="px-6 py-4 text-center"><div className="flex items-center justify-center"><button onClick={(e) => handleDeleteClick(e, item)} disabled={isRowClosed} className={`p-1.5 rounded-md transition-colors ${isRowClosed ? 'text-gray-400 cursor-not-allowed' : 'text-danger hover:bg-danger/10'}`} aria-label="Excluir"><TrashIcon className="h-4 w-4"/></button></div></td>
                              </tr>
                            )})
                          ) : (
                              <tr><td colSpan={8} className="text-center py-16"><div className="flex flex-col items-center justify-center text-text-secondary"><SearchIcon className="w-10 h-10 mb-3 text-gray-300" /><h3 className="text-lg font-medium text-text-primary">Nenhum Lançamento</h3><p className="text-sm mt-1">{dateFilter ? 'Não há dados para a data.' : 'Adicione um novo lançamento.'}</p></div></td></tr>
                          )}
                        </tbody>
                      </table>
                  </div>
                </div>
              </div>
            );
          case 'dashboard':
            return (
              <div className="animate-fade-in">
                {previsaoGeradaAtiva ? (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-bold text-text-primary">Previsão: <span className="text-primary">{previsaoGeradaAtiva.semana}</span></h3>
                          <button onClick={() => setPrevisaoGeradaAtiva(null)} className="px-4 py-2 rounded-md bg-white border border-border text-text-primary text-sm font-medium hover:bg-secondary transition-colors">Voltar</button>
                      </div>
                      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm"><table className="min-w-full divide-y divide-border text-sm text-left"><thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider"><tr><th className="px-6 py-3">Data</th><th className="px-6 py-3 text-right">Receitas</th><th className="px-6 py-3 text-right">Despesas</th><th className="px-6 py-3 text-right">Saldo</th></tr></thead><tbody className="divide-y divide-border bg-white">{previsaoGeradaAtiva.dias.map(dia => (<tr key={dia.data} className="hover:bg-secondary"><td className="px-6 py-4 font-medium text-text-primary">{formatDateToBR(dia.data)}</td><td className="px-6 py-4 text-right text-success font-semibold">{formatCurrency(dia.receitas)}</td><td className="px-6 py-4 text-right text-danger font-semibold">{formatCurrency(dia.despesas)}</td><td className={`px-6 py-4 text-right font-bold ${dia.saldo >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(dia.saldo)}</td></tr>))}</tbody><tfoot><tr className="bg-secondary/50 font-bold text-text-primary"><td colSpan={2} className="px-6 py-4 text-right uppercase text-xs tracking-wider">Total Despesas:</td><td className="px-6 py-4 text-danger">{formatCurrency(previsaoGeradaAtiva.totais.totalDespesas)}</td><td className="px-6 py-4"></td></tr></tfoot></table></div>
                        </div>
                    ) : (
                        <>
                          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 bg-white p-3 rounded-lg border border-border">
                              <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0"><input type="text" placeholder="Buscar por semana..." value={dashboardSemanaFilter} onChange={(e) => setDashboardSemanaFilter(e.target.value)} className="w-full sm:w-64 pl-10 pr-3 py-2 bg-white border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"/><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-4 w-4 text-text-secondary" /></div></div>
                              <div className="flex items-center gap-2"><button onClick={() => setDashboardSemanaFilter('')} className="px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-text-primary font-medium text-sm transition-colors">Limpar</button><button onClick={() => setIsGerarPrevisaoModalOpen(true)} className="flex items-center justify-center gap-2 bg-primary text-white font-medium py-2 px-4 rounded-md hover:bg-primary-hover transition-colors text-sm shadow-sm"><PlusIcon className="h-4 w-4" /> Criar Nova Previsão</button></div>
                          </div>
                          {filteredHistoricoGerado.length > 0 ? (
                              <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm"><table className="min-w-full divide-y divide-border text-sm text-left"><thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider"><tr><th className="px-6 py-3">Semana</th><th className="px-6 py-3">Data da Geração</th><th className="px-6 py-3 text-right">Resultado Total</th><th className="px-6 py-3 text-center">Ações</th></tr></thead><tbody className="divide-y divide-border bg-white">{filteredHistoricoGerado.map(item => (<tr key={item.dataGeracao} className="hover:bg-secondary"><td className="px-6 py-4 font-medium text-text-primary">{item.semana}</td><td className="px-6 py-4 text-text-secondary">{new Date(item.dataGeracao).toLocaleString('pt-BR')}</td><td className={`px-6 py-4 text-right font-bold ${item.totais.totalResultado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(item.totais.totalResultado)}</td><td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => setPrevisaoGeradaAtiva(item)} className="px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-medium text-xs transition-colors border border-primary/30">Visualizar</button><button onClick={() => handleDeleteGeneratedForecastClick(item.dataGeracao)} className="text-danger hover:bg-danger/10 p-1.5 rounded-md transition-colors" aria-label="Excluir"><TrashIcon className="h-4 w-4"/></button></div></td></tr>))}</tbody></table></div>
                          ) : (
                              <div className="text-center py-16"><div className="flex flex-col items-center justify-center text-text-secondary"><DatabaseIcon className="w-10 h-10 mb-3 text-gray-300" /><h3 className="text-lg font-medium text-text-primary">Nenhuma Previsão Gerada</h3><p className="text-sm mt-1">{dashboardSemanaFilter ? 'Nenhuma previsão encontrada.' : 'Crie uma nova previsão.'}</p></div></div>
                          )}
                          </>
                      )}
                  </div>
                );
              case 'banco':
                return (
                  <div className="animate-fade-in">
                      <h3 className="text-lg font-bold text-text-primary mb-4">Totais por Banco</h3>
                      <FilterBar />
                      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                          <table className="min-w-full divide-y divide-border text-sm text-left">
                              <thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider">
                                  <tr>
                                      <th className="px-6 py-3">Empresa</th>
                                      <th className="px-6 py-3">Banco</th>
                                      <th className="px-6 py-3 text-right">Receitas</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-border bg-white">
                                  {totaisPorBanco.length > 0 ? (
                                      totaisPorBanco.map(item => (
                                          <tr key={`${item.empresa}-${item.banco}`} className="hover:bg-secondary">
                                              <td className="px-6 py-4 font-medium text-text-primary">{item.empresa}</td>
                                              <td className="px-6 py-4 text-text-secondary">{item.banco}</td>
                                              <td className="px-6 py-4 text-right text-success font-semibold">{formatCurrency(item.receitas)}</td>
                                          </tr>
                                      ))
                                  ) : (
                                      <tr>
                                          <td colSpan={3} className="text-center py-16 text-text-secondary">
                                              Nenhuma receita para exibir com os filtros selecionados.
                                          </td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
                );
              case 'empresa':
                return (
                  <div className="animate-fade-in">
                    <h3 className="text-lg font-bold text-text-primary mb-4">Despesas por Empresa</h3>
                    <FilterBar />
                    <div className="mb-6">
                        <div className="bg-card p-4 rounded-lg border border-border shadow-sm text-center sm:max-w-sm">
                            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Despesa Total</p>
                            <p className="text-xl font-bold text-danger">{formatCurrency(totalDespesasGeral)}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                        <table className="min-w-full divide-y divide-border text-sm text-left">
                            <thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">Empresa</th>
                                    <th className="px-6 py-3 text-right">Despesas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-white">
                                {despesasPorEmpresa.length > 0 ? (
                                    despesasPorEmpresa.map(item => (
                                        <tr key={item.empresa} className="hover:bg-secondary">
                                            <td className="px-6 py-4 font-medium text-text-primary">{item.empresa}</td>
                                            <td className="px-6 py-4 text-right text-danger font-semibold">{formatCurrency(item.totalDespesas)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="text-center py-16 text-text-secondary">
                                            Nenhuma despesa registrada com os filtros selecionados.
                                        
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                  </div>
                );
              default:
                return <></>;
            }
          })()}
          
          {isEditModalOpen && editingPrevisao && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-card rounded-lg shadow-lg border border-border w-full max-w-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-secondary/30"><h3 className="text-lg font-bold text-text-primary">Editar Previsão</h3></div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Data</label><input type="date" name="data" value={editingPrevisao.data || ''} onChange={handleInputChange} className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9"/></div>
                        <div><label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Semana</label><input type="text" name="semana" value={editingPrevisao.semana || ''} onChange={handleInputChange} className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9"/></div>
                        <div className="md:col-span-2"><label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Empresa</label><input type="text" name="empresa" value={editingPrevisao.empresa || ''} onChange={handleInputChange} className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9"/></div>
                        <div className="md:col-span-2"><label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Banco</label><input type="text" name="tipo" value={editingPrevisao.tipo || ''} onChange={handleInputChange} className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9"/></div>
                        <div><label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Receitas</label><input type="text" name="receitas" value={formatCurrency(editingPrevisao.receitas)} onChange={handleInputChange} className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9"/></div>
                        <div><label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Despesas</label><input type="text" name="despesas" value={formatCurrency(editingPrevisao.despesas)} onChange={handleInputChange} className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9"/></div>
                    </div>
                    <div className="px-6 py-4 border-t border-border bg-secondary/30 flex justify-end gap-3"><button onClick={handleCloseModal} className="px-4 py-2 rounded-md bg-white border border-border text-text-primary text-sm font-medium hover:bg-secondary transition-colors">Cancelar</button><button onClick={handleSaveChanges} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-colors">Salvar</button></div>
                </div>
              </div>
          )}
              
              {isAddEntryModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-card rounded-lg shadow-lg border border-border w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-secondary/30"><h3 className="text-lg font-bold text-text-primary">Adicionar Lançamento</h3></div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Data</label><input type="date" name="data" value={newEntry.data || ''} onChange={handleNewEntryChange} className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9"/></div>
                            <div><label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Semana</label><input type="text" name="semana" value={newEntry.semana || ''} onChange={handleNewEntryChange} placeholder="Ex: Semana 32" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9"/></div>
                            <div className="md:col-span-2"><label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Empresa</label><input type="text" name="empresa" value={newEntry.empresa || ''} onChange={handleNewEntryChange} placeholder="Digite a empresa" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9"/></div>
                            <div className="md:col-span-2"><label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Banco</label><input type="text" name="tipo" value={newEntry.tipo || ''} onChange={handleNewEntryChange} placeholder="Digite o banco" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9"/></div>
                            <div><label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Receitas</label><input type="text" name="receitas" value={formatCurrency(newEntry.receitas)} onChange={handleNewEntryChange} className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9"/></div>
                            <div><label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Despesas</label><input type="text" name="despesas" value={formatCurrency(newEntry.despesas)} onChange={handleNewEntryChange} className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9"/></div>
                        </div>
                        <div className="px-6 py-4 border-t border-border bg-secondary/30 flex justify-end gap-3"><button onClick={() => setIsAddEntryModalOpen(false)} className="px-4 py-2 rounded-md bg-white border border-border text-text-primary text-sm font-medium hover:bg-secondary transition-colors">Cancelar</button><button onClick={handleAddNewEntry} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-colors">Salvar</button></div>
                    </div>
                </div>
              )}

               {isGerarPrevisaoModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-card rounded-lg shadow-lg border border-border w-full max-w-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-border bg-secondary/30">
                                <h3 className="text-lg font-bold text-text-primary">Gerar Dashboard</h3>
                            </div>
                            <div className="p-6">
                                <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Semana</label>
                                <input
                                    type="text"
                                    value={semanaParaGerar}
                                    onChange={(e) => setSemanaParaGerar(e.target.value)}
                                    placeholder="Ex: Semana 42"
                                    className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"
                                />
                            </div>
                            <div className="px-6 py-4 border-t border-border bg-secondary/30 flex justify-end gap-3">
                                <button onClick={() => setIsGerarPrevisaoModalOpen(false)} className="px-4 py-2 rounded-md bg-white border border-border text-text-primary text-sm font-medium hover:bg-secondary transition-colors">Cancelar</button>
                                <button onClick={handleProceedToConfirmGerar} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-colors">Gerar</button>
                            </div>
                        </div>
                    </div>
              )}

              {(isGerarPrevisaoConfirmOpen || isConfirmOpen || isTransferConfirmOpen) && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-card rounded-lg shadow-lg border border-border w-full max-w-sm overflow-hidden p-6">
                        <h3 className="text-lg font-bold mb-2 text-text-primary">Confirmar</h3>
                        <p className="text-sm text-text-secondary mb-6">
                            {isGerarPrevisaoConfirmOpen ? `Deseja gerar a previsão para "${semanaParaGerar}"?` 
                             : isTransferConfirmOpen ? `Deseja transferir os lançamentos de ${formatDateToBR(transferDate)} para Pagamentos Diários?` 
                             : confirmAction.message}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setIsGerarPrevisaoConfirmOpen(false); setIsTransferConfirmOpen(false); handleCancelConfirm(); }} className="px-4 py-2 rounded-md bg-white border border-border text-text-primary text-sm font-medium hover:bg-secondary transition-colors">Cancelar</button>
                            <button onClick={isGerarPrevisaoConfirmOpen ? handleGerarPrevisao : isTransferConfirmOpen ? confirmTransfer : handleConfirm} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-colors">Confirmar</button>
                        </div>
                    </div>
                </div>
              )}
            </div>
          );
        };

export default PrevisaoCristiano;