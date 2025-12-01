
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, DatabaseIcon, 
    ArrowLeftIcon, TrendingUpIcon, ReportIcon, BoletoIcon, SpinnerIcon, TransferIcon, CalculatorIcon } from './icons';
import AutocompleteInput from './AutocompleteInput';
import Calculator from './Calculator';
import DatePicker from './DatePicker';

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
    totais: { totalReceitas: number; totalDespesas: number; totalResultado: number };
    semana: string;
    dataGeracao: string;
}

interface Pagamento {
    id: string; 
    data: string;
    empresa: string;
    tipo: string;
    receitas: number;
    despesas: number;
    envia: number; 
    recebe: number; 
  }

interface NavCardProps {
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
}

const NavCard: React.FC<NavCardProps> = ({ title, icon, onClick }) => (
    <div
        onClick={onClick}
        className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center text-center cursor-pointer hover:border-primary hover:shadow-sm transition-all duration-200 group active:scale-95"
    >
        <div className="bg-secondary p-4 rounded-full mb-4 border border-border group-hover:border-primary/30 transition-colors">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-1 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-xs text-text-secondary">Clique para visualizar</p>
    </div>
);

const PREDEFINED_ENTRIES = [
    { empresa: 'Fiber Hidromassagens Industria E Comercio Ltda - Me', tipo: 'INTER' },
    { empresa: 'Lls Serviços De Limpeza Eireli', tipo: 'INTER' },
    { empresa: 'Csj Industria E Comercio De Plastic', tipo: 'INTER' },
    { empresa: 'Lopc Industria E Comercio De Plasti', tipo: 'INTER' },
    { empresa: 'Mma Industria De Plasticos Reforcad', tipo: 'INTER' },
    { empresa: 'Pxt Industria E Comercio De Plastic', tipo: 'INTER' },
    { empresa: 'Sjb Comercio E Industria De Piscinas Ltda', tipo: 'INTER' },
    { empresa: 'Lopc Industria E Comercio De Plasti', tipo: 'XP' },
    { empresa: 'Pxt Industria E Comercio De Plastic', tipo: 'XP' },
    { empresa: 'Csj Industria E Comercio De Plastic - cheque especial', tipo: 'ITAU' },
    { empresa: 'Pxt Industria E Comercio De Plastic', tipo: 'ITAU' },
    { empresa: 'Csj Industria E Comercio De Plastic', tipo: 'BB' },
    { empresa: 'Sjb Comercio E Industria De Piscinas Ltdas Ltda', tipo: 'BB' },
    { empresa: 'Pxt Industria E Comercio De Plastic', tipo: 'BB' },
    { empresa: 'Lopc Industria E Comercio De Plasti', tipo: 'BB' },
    { empresa: 'Cheques A Compensar', tipo: 'SANTANDER' },
    { empresa: 'Recebimento De Boletos', tipo: 'SANTANDER' },
    { empresa: 'Pagamento Salários', tipo: 'SANTANDER' },
];

const FIXED_BANKS = ['INTER', 'XP', 'ITAU', 'BB', 'SANTANDER'];

const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const formatDateToBR = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const [year, month, day] = isoDate.split('-');
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.toLocaleDateString('pt-BR', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

// Filter Bar Component extracted to prevent re-renders
const ReportFilterBar: React.FC<{
    dateFilter: string;
    setDateFilter: (date: string) => void;
    weekFilter: string;
    setWeekFilter: (week: string) => void;
}> = ({ dateFilter, setDateFilter, weekFilter, setWeekFilter }) => (
    <div className="flex flex-col sm:flex-row items-end gap-4 bg-white p-4 rounded-2xl border border-border shadow-sm flex-shrink-0">
        <div className="w-full sm:w-auto">
            <DatePicker 
                label="Data"
                value={dateFilter} 
                onChange={setDateFilter} 
                placeholder="Selecione"
                className="w-full sm:w-40 h-10"
            />
        </div>
        <div className="w-full sm:w-auto">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Semana</label>
            <input 
                type="text" 
                placeholder="Ex: Semana 42" 
                value={weekFilter} 
                onChange={e => setWeekFilter(e.target.value)} 
                className="bg-white border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full sm:w-40 h-10 transition-all"
            />
        </div>
        <button 
            onClick={() => {setDateFilter(''); setWeekFilter('')}} 
            className="w-full sm:w-auto px-6 rounded-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-sm transition-colors h-10 shadow-sm"
        >
            Limpar
        </button>
    </div>
);

type View = 'menu' | 'previsao' | 'dashboard' | 'banco' | 'empresa';

export const PrevisaoFabrica: React.FC = () => {
    const [previsoes, setPrevisoes] = useState<Previsao[]>(() => {
        const savedPrevisoes = localStorage.getItem('previsoes');
        return savedPrevisoes ? JSON.parse(savedPrevisoes) : [];
    });
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPrevisao, setEditingPrevisao] = useState<Partial<Previsao> | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
    const [newEntry, setNewEntry] = useState<Partial<Previsao>>({
        data: new Date().toISOString().split('T')[0],
        semana: '',
        empresa: '',
        tipo: '',
        receitas: 0,
        despesas: 0
    });
    
    const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
    const [closedDates, setClosedDates] = useState<Set<string>>(() => {
        const savedClosedDates = localStorage.getItem('closedDates');
        return savedClosedDates ? new Set(JSON.parse(savedClosedDates)) : new Set();
    });
    
    const [view, setView] = useState<View>('menu');
    
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

    const scrollRef = useRef<HTMLDivElement>(null);
    
    // Calculator State
    const [showCalculator, setShowCalculator] = useState<{ field: string | null }>({ field: null });

    const uniqueEmpresas = useMemo(() => {
        const historical = previsoes.map(p => p.empresa).filter(Boolean);
        const predefined = PREDEFINED_ENTRIES.map(e => e.empresa).filter(Boolean);
        return [...new Set([...historical, ...predefined])].sort();
    }, [previsoes]);

    const uniqueBancos = useMemo(() => {
        const historical = previsoes.map(p => p.tipo).filter(Boolean);
        const predefined = PREDEFINED_ENTRIES.map(e => e.tipo).filter(Boolean);
        return [...new Set([...historical, ...predefined, ...FIXED_BANKS])].sort();
    }, [previsoes]);

    useEffect(() => {
        localStorage.setItem('previsoes', JSON.stringify(previsoes));
    }, [previsoes]);

    useEffect(() => {
        localStorage.setItem('closedDates', JSON.stringify(Array.from(closedDates)));
    }, [closedDates]);

    useEffect(() => {
      const savedGeneratedHistory = localStorage.getItem('historicoPrevisoesGeradas');
      if (savedGeneratedHistory) {
          try {
            setHistoricoPrevisoesGeradas(JSON.parse(savedGeneratedHistory));
          } catch (e) {
            console.error("Failed to parse historicoPrevisoesGeradas", e);
            setHistoricoPrevisoesGeradas([]);
          }
      }
    }, []);

    useEffect(() => {
        if (historicoPrevisoesGeradas.length > 0 || localStorage.getItem('historicoPrevisoesGeradas')) {
            localStorage.setItem('historicoPrevisoesGeradas', JSON.stringify(historicoPrevisoesGeradas));
        }
    }, [historicoPrevisoesGeradas]);
    
    const filteredHistoricoGerado = useMemo(() => {
        return historicoPrevisoesGeradas.filter(item =>
            item.semana.toLowerCase().includes(dashboardSemanaFilter.toLowerCase())
        );
    }, [historicoPrevisoesGeradas, dashboardSemanaFilter]);

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
            const empresaClean = item.empresa.trim().toUpperCase();
            const bancoClean = item.tipo.trim().toUpperCase();
            const key = `${empresaClean}-${bancoClean}`;
            
            if (!acc[key]) {
                acc[key] = { 
                    empresa: item.empresa.trim(), 
                    banco: item.tipo.trim(), 
                    receitas: 0 
                };
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

    const bankSummaries = useMemo(() => {
        const acc: Record<string, number> = {};
        filteredReportData.forEach(item => {
            const bank = item.tipo.trim().toUpperCase();
            acc[bank] = (acc[bank] || 0) + item.receitas;
        });
        return Object.entries(acc).sort((a, b) => b[1] - a[1]); 
    }, [filteredReportData]);

    const despesasPorEmpresa = useMemo(() => {
        const porEmpresa = filteredReportData.reduce<Record<string, { totalDespesas: number }>>((acc, item) => {
            if (!acc[item.empresa]) {
                acc[item.empresa] = { totalDespesas: 0 };
            }
            acc[item.empresa].totalDespesas += item.despesas;
            return acc;
        }, {});
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

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === '+') {
                event.preventDefault();
                if (view === 'previsao') {
                    handleOpenAddEntryModal();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, dateFilter]);
    
    const handleProceedToConfirmGerar = () => {
        if (!semanaParaGerar.trim()) {
            alert("Por favor, informe a semana.");
            return;
        }
        setIsGerarPrevisaoModalOpen(false); 
        setIsGerarPrevisaoConfirmOpen(true); 
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
        setSemanaParaGerar('');
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
      setShowCalculator({ field: null });
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

    const handleCalculatorUpdate = (result: number, field: 'receitas' | 'despesas', mode: 'edit' | 'add') => {
        if (mode === 'edit' && editingPrevisao) {
            setEditingPrevisao(prev => ({ ...prev, [field]: result }));
        } else if (mode === 'add') {
            setNewEntry(prev => ({ ...prev, [field]: result }));
        }
        setShowCalculator({ field: null });
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
        const LOCAL_STORAGE_KEY_PAGAMENTOS = 'pagamentos_diarios_fabrica';
        let existingPagamentos: Pagamento[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PAGAMENTOS) || '[]');
        
        const entriesToTransfer = filteredPrevisoes.filter(p => p.receitas > 0 || p.despesas > 0);

        const existingPaymentsForDateMap = new Map<string, Pagamento>();
        existingPagamentos.forEach(p => {
            if (p.data === transferDate) {
                const key = `${p.empresa}-${p.tipo}`;
                existingPaymentsForDateMap.set(key, p);
            }
        });

        let otherPagamentos = existingPagamentos.filter(p => p.data !== transferDate);
        let updatedPaymentsForDate: Pagamento[] = [];

        entriesToTransfer.forEach(prev => {
            const key = `${prev.empresa}-${prev.tipo}`;
            const existingPayment = existingPaymentsForDateMap.get(key);

            if (existingPayment) {
                updatedPaymentsForDate.push({
                    ...existingPayment,
                    receitas: prev.receitas,
                    despesas: prev.despesas,
                    envia: existingPayment.envia || 0, 
                    recebe: existingPayment.recebe || 0,
                });
                existingPaymentsForDateMap.delete(key); 
            } else {
                updatedPaymentsForDate.push({
                    id: `${prev.data}-${prev.empresa}-${prev.tipo}-${Date.now()}`, 
                    data: prev.data,
                    empresa: prev.empresa,
                    tipo: prev.tipo,
                    receitas: prev.receitas,
                    despesas: prev.despesas,
                    envia: 0,
                    recebe: 0,
                });
            }
        });

        existingPaymentsForDateMap.forEach(p => updatedPaymentsForDate.push(p));

        const finalPagamentos = [...otherPagamentos, ...updatedPaymentsForDate];
        
        localStorage.setItem(LOCAL_STORAGE_KEY_PAGAMENTOS, JSON.stringify(finalPagamentos));
        alert(`${updatedPaymentsForDate.length} lançamentos do dia ${formatDateToBR(transferDate)} transferidos/atualizados com sucesso para Pagamentos Diários Fábrica!`);
        setIsTransferConfirmOpen(false);
    };

    if (view === 'menu') {
        return (
            <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in">
                <h2 className="text-2xl font-bold text-text-primary mb-2 text-center">Previsão Fábrica</h2>
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

  return (
    <div className="p-4 sm:p-6 w-full h-full flex flex-col animate-fade-in">
       <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
              <button onClick={() => setView('menu')} className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition-colors text-sm shadow-sm">
                  <ArrowLeftIcon className="h-4 w-4" /> Voltar
              </button>
              <h2 className="text-xl font-bold text-text-primary">{viewTitles[view]}</h2>
          </div>
      </div>
      
      {(() => {
        switch (view) {
          case 'previsao':
            return (
              <div className="animate-fade-in flex flex-col h-full">
                <div className="flex flex-col lg:flex-row justify-end items-center mb-4 gap-2 bg-card p-3 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center rounded-full px-2">
                        <DatePicker 
                            value={dateFilter} 
                            onChange={setDateFilter} 
                            placeholder="Selecione"
                            className="w-40 h-9"
                        />
                    </div>
                    <button onClick={() => setDateFilter('')} className="px-3 py-1.5 rounded-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-xs transition-colors h-9 shadow-sm">Limpar</button>
                    <div className="h-6 w-px bg-border mx-2 hidden lg:block"></div>
                    <button onClick={handleFecharDia} disabled={isCurrentDayClosed || !dateFilter} className={`px-3 py-1.5 rounded-full font-medium text-xs h-9 transition-colors shadow-sm ${isCurrentDayClosed ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' : 'bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'}`}>
                            {isCurrentDayClosed ? 'Dia Fechado' : 'Fechar Dia'}
                    </button>
                    <button onClick={handleOpenAddEntryModal} className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-primary font-medium py-1.5 px-3 rounded-full hover:bg-orange-50 hover:border-orange-200 transition-colors duration-300 h-9 text-xs shadow-sm">
                        <PlusIcon className="h-4 w-4" /> <span>Adicionar</span>
                    </button>
                    <button onClick={handleTransferToPagamentos} disabled={!dateFilter || filteredPrevisoes.length === 0} className={`flex items-center justify-center gap-2 font-medium py-1.5 px-3 rounded-full transition-colors duration-300 h-9 text-xs shadow-sm ${(!dateFilter || filteredPrevisoes.length === 0) ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' : 'bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'}`}>
                        <TransferIcon className="h-4 w-4" /> <span>Transferir</span>
                    </button>
                </div>

                {filteredPrevisoes.length > 0 && (
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    <div className="bg-card p-3 rounded-2xl shadow-sm border border-border text-center">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Receitas</p>
                      <p className="text-lg font-bold text-success">{formatCurrency(totais.totalReceitas)}</p>
                    </div>
                    <div className="bg-card p-3 rounded-2xl border border-border shadow-sm text-center">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Despesas</p>
                      <p className="text-lg font-bold text-danger">{formatCurrency(totais.totalDespesas)}</p>
                    </div>
                    <div className="bg-card p-3 rounded-2xl border border-border shadow-sm text-center">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Saldo</p>
                      <p className={`text-lg font-bold ${totais.saldo >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(totais.saldo)}</p>
                    </div>
                  </div>
                )}
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex-grow flex flex-col">
                   <div ref={scrollRef} className="overflow-auto flex-grow">
                      <table className="w-full text-sm text-left font-sans">
                        <thead className="bg-secondary text-text-secondary font-medium uppercase text-xs sticky top-0 shadow-sm">
                          <tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Semana</th><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Banco</th><th className="px-4 py-3 text-right">Receitas</th><th className="px-4 py-3 text-right">Despesas</th><th className="px-4 py-3 text-right">Resultado</th><th className="px-4 py-3 text-center">Ações</th></tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                          {filteredPrevisoes.length > 0 ? (
                            filteredPrevisoes.map((item) => {
                              const isRowClosed = closedDates.has(item.data);
                              const resultado = item.receitas - item.despesas;
                              return (
                              <tr key={item.id} onClick={() => handleRowClick(item)} className={`hover:bg-secondary transition-colors ${isRowClosed ? 'opacity-60 bg-secondary cursor-not-allowed' : 'cursor-pointer'}`}>
                                <td className="px-4 py-3 font-medium text-text-primary whitespace-nowrap">{formatDateToBR(item.data)}</td>
                                <td className="px-4 py-3 text-text-secondary">{item.semana}</td>
                                <td className="px-4 py-3 text-text-primary whitespace-nowrap">{item.empresa}</td>
                                <td className="px-4 py-3 text-text-secondary">{item.tipo}</td>
                                <td className="px-4 py-3 text-right text-success font-semibold">{formatCurrency(item.receitas)}</td>
                                <td className="px-4 py-3 text-right text-danger font-semibold">{formatCurrency(item.despesas)}</td>
                                <td className={`px-4 py-3 text-right font-bold ${resultado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(resultado)}</td>
                                <td className="px-4 py-3 text-center"><div className="flex items-center justify-center"><button onClick={(e) => handleDeleteClick(e, item)} disabled={isRowClosed} className={`p-1.5 rounded-full transition-colors ${isRowClosed ? 'text-gray-400 cursor-not-allowed' : 'text-danger hover:bg-danger/10'}`} aria-label="Excluir"><TrashIcon className="h-4 w-4"/></button></div></td>
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
                          <button onClick={() => setPrevisaoGeradaAtiva(null)} className="px-4 py-2 rounded-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors shadow-sm">Voltar</button>
                      </div>
                      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-border text-sm text-left font-sans"><thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider"><tr><th className="px-6 py-3">Data</th><th className="px-6 py-3 text-right">Receitas</th><th className="px-6 py-3 text-right">Despesas</th><th className="px-6 py-3 text-right">Saldo</th></tr></thead><tbody className="divide-y divide-border bg-white">{previsaoGeradaAtiva.dias.map(dia => (<tr key={dia.data} className="hover:bg-secondary"><td className="px-6 py-4 font-medium text-text-primary">{formatDateToBR(dia.data)}</td><td className="px-6 py-4 text-right text-success font-semibold">{formatCurrency(dia.receitas)}</td><td className="px-6 py-4 text-right text-danger font-semibold">{formatCurrency(dia.despesas)}</td><td className={`px-6 py-4 text-right font-bold ${dia.saldo >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(dia.saldo)}</td></tr>))}</tbody><tfoot><tr className="bg-secondary/50 font-bold text-text-primary"><td colSpan={2} className="px-6 py-4 text-right uppercase text-xs tracking-wider">Total Despesas:</td><td className="px-6 py-4 text-danger">{formatCurrency(previsaoGeradaAtiva.totais.totalDespesas)}</td><td className="px-6 py-4"></td></tr></tfoot></table>
                        </div>
                      </div>
                    </div>
                    ) : (
                        <>
                          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 bg-white p-3 rounded-2xl border border-border">
                              <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0"><input type="text" placeholder="Buscar por semana..." value={dashboardSemanaFilter} onChange={(e) => setDashboardSemanaFilter(e.target.value)} className="w-full sm:w-64 pl-10 pr-3 py-2 bg-white border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"/><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-4 w-4 text-text-secondary" /></div></div>
                              <div className="flex items-center gap-2"><button onClick={() => setDashboardSemanaFilter('')} className="px-3 py-2 rounded-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors shadow-sm">Limpar</button><button onClick={() => setIsGerarPrevisaoModalOpen(true)} className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-primary font-bold py-2 px-4 rounded-full hover:bg-orange-50 hover:border-orange-200 transition-colors text-sm shadow-sm"><PlusIcon className="h-4 w-4" /> Criar Nova Previsão</button></div>
                          </div>
                          {filteredHistoricoGerado.length > 0 ? (
                              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-border text-sm text-left font-sans"><thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider"><tr><th className="px-6 py-3">Semana</th><th className="px-6 py-3">Data da Geração</th><th className="px-6 py-3 text-right">Resultado Total</th><th className="px-6 py-3 text-center">Ações</th></tr></thead><tbody className="divide-y divide-border bg-white">{filteredHistoricoGerado.map(item => (<tr key={item.dataGeracao} className="hover:bg-secondary"><td className="px-6 py-4 font-medium text-text-primary">{item.semana}</td><td className="px-6 py-4 text-text-secondary">{new Date(item.dataGeracao).toLocaleString('pt-BR')}</td><td className={`px-6 py-4 text-right font-bold ${item.totais.totalResultado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(item.totais.totalResultado)}</td><td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => setPrevisaoGeradaAtiva(item)} className="px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 font-medium text-xs transition-colors border border-primary/30">Visualizar</button><button onClick={() => handleDeleteGeneratedForecastClick(item.dataGeracao)} className="text-danger hover:bg-danger/10 p-1.5 rounded-full transition-colors" aria-label="Excluir"><TrashIcon className="h-4 w-4"/></button></div></td></tr>))}</tbody></table>
                                </div>
                              </div>
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
                      <div className="flex flex-col xl:flex-row items-start xl:items-center gap-6 mb-6">
                          <ReportFilterBar 
                            dateFilter={reportDateFilter} 
                            setDateFilter={setReportDateFilter} 
                            weekFilter={reportWeekFilter} 
                            setWeekFilter={setReportWeekFilter} 
                          />
                          <div className="w-full xl:flex-1 overflow-x-auto custom-scrollbar pb-2 xl:pb-0">
                              <div className="flex gap-3 xl:justify-end min-w-max px-1">
                                  {bankSummaries.map(([bank, value]) => (
                                      <div key={bank} className="bg-white p-3 rounded-xl border border-border text-center min-w-[140px] shadow-sm">
                                          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-0.5 truncate px-1" title={bank}>{bank}</p>
                                          <p className="text-lg font-bold text-text-primary">{formatCurrency(value)}</p>
                                      </div>
                                  ))}
                                  {bankSummaries.length === 0 && (
                                       <div className="text-xs text-text-secondary italic self-center px-4">Sem dados para exibir.</div>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border text-sm text-left font-sans">
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
                  </div>
                );
              case 'empresa':
                return (
                  <div className="animate-fade-in">
                    <h3 className="text-lg font-bold text-text-primary mb-4">Despesas por Empresa</h3>
                    <ReportFilterBar 
                        dateFilter={reportDateFilter} 
                        setDateFilter={setReportDateFilter} 
                        weekFilter={reportWeekFilter} 
                        setWeekFilter={setReportWeekFilter} 
                    />
                    <div className="mb-6">
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm text-center sm:max-w-sm">
                            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Despesa Total</p>
                            <p className="text-xl font-bold text-danger">{formatCurrency(totalDespesasGeral)}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border text-sm text-left font-sans">
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
                  </div>
                );
              default:
                return null;
            }
          })()}
          
          {/* Modals outside the switch to prevent nesting issues */}
          {isEditModalOpen && editingPrevisao && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="shrink-0 p-6 pb-4 border-b border-gray-100">
                        <h3 className="text-2xl font-bold text-text-primary text-center">Editar Previsão</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-32">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                            <div>
                                <DatePicker 
                                    label="Data"
                                    value={editingPrevisao.data || ''} 
                                    onChange={(val) => setEditingPrevisao(prev => ({...prev, data: val}))} 
                                    placeholder="Selecione"
                                />
                            </div>
                            <div><label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider ml-1">Semana</label><input type="text" name="semana" value={editingPrevisao.semana || ''} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"/></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider ml-1">Empresa</label>
                            <AutocompleteInput name="empresa" value={editingPrevisao.empresa || ''} onChange={handleInputChange} suggestions={uniqueEmpresas} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"/></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider ml-1">Banco</label>
                            <AutocompleteInput name="tipo" value={editingPrevisao.tipo || ''} onChange={handleInputChange} suggestions={uniqueBancos} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"/></div>
                            
                            <div className="relative">
                                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider ml-1">Receitas</label>
                                <div className="relative">
                                    <input type="text" name="receitas" value={formatCurrency(editingPrevisao.receitas)} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 pr-10 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"/>
                                    <button onClick={() => setShowCalculator({ field: 'receitas' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary"><CalculatorIcon className="h-5 w-5" /></button>
                                </div>
                                {showCalculator.field === 'receitas' && <Calculator initialValue={editingPrevisao.receitas} onResult={(res) => handleCalculatorUpdate(res, 'receitas', 'edit')} onClose={() => setShowCalculator({ field: null })} />}
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider ml-1">Despesas</label>
                                <div className="relative">
                                    <input type="text" name="despesas" value={formatCurrency(editingPrevisao.despesas)} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 pr-10 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"/>
                                    <button onClick={() => setShowCalculator({ field: 'despesas' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary"><CalculatorIcon className="h-5 w-5" /></button>
                                </div>
                                {showCalculator.field === 'despesas' && <Calculator initialValue={editingPrevisao.despesas} onResult={(res) => handleCalculatorUpdate(res, 'despesas', 'edit')} onClose={() => setShowCalculator({ field: null })} />}
                            </div>
                        </div>
                    </div>
                    <div className="shrink-0 p-6 pt-4 border-t border-gray-100 flex justify-center gap-3 bg-gray-50">
                        <button onClick={handleCloseModal} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-text-primary font-semibold hover:bg-gray-50 transition-colors shadow-sm">Cancelar</button>
                        <button onClick={handleSaveChanges} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-primary font-bold shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Salvar</button>
                    </div>
                </div>
              </div>
          )}
              
          {isAddEntryModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="shrink-0 p-6 pb-4 border-b border-gray-100">
                        <h3 className="text-2xl font-bold text-text-primary text-center">Adicionar Lançamento</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-32">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                            <div>
                                <DatePicker 
                                    label="Data"
                                    value={newEntry.data || ''} 
                                    onChange={(val) => setNewEntry(prev => ({...prev, data: val}))} 
                                    placeholder="Selecione"
                                />
                            </div>
                            <div><label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider ml-1">Semana</label><input type="text" name="semana" value={newEntry.semana || ''} onChange={handleNewEntryChange} placeholder="Ex: Semana 32" className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"/></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider ml-1">Empresa</label>
                            <AutocompleteInput name="empresa" value={newEntry.empresa || ''} onChange={handleNewEntryChange} suggestions={uniqueEmpresas} placeholder="Digite a empresa" className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"/></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider ml-1">Banco</label>
                            <AutocompleteInput name="tipo" value={newEntry.tipo || ''} onChange={handleNewEntryChange} suggestions={uniqueBancos} placeholder="Digite o banco" className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"/></div>
                            
                            <div className="relative">
                                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider ml-1">Receitas</label>
                                <div className="relative">
                                    <input type="text" name="receitas" value={formatCurrency(newEntry.receitas)} onChange={handleNewEntryChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 pr-10 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"/>
                                    <button onClick={() => setShowCalculator({ field: 'receitas' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary"><CalculatorIcon className="h-5 w-5" /></button>
                                </div>
                                {showCalculator.field === 'receitas' && <Calculator initialValue={newEntry.receitas} onResult={(res) => handleCalculatorUpdate(res, 'receitas', 'add')} onClose={() => setShowCalculator({ field: null })} />}
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider ml-1">Despesas</label>
                                <div className="relative">
                                    <input type="text" name="despesas" value={formatCurrency(newEntry.despesas)} onChange={handleNewEntryChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 pr-10 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"/>
                                    <button onClick={() => setShowCalculator({ field: 'despesas' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary"><CalculatorIcon className="h-5 w-5" /></button>
                                </div>
                                {showCalculator.field === 'despesas' && <Calculator initialValue={newEntry.despesas} onResult={(res) => handleCalculatorUpdate(res, 'despesas', 'add')} onClose={() => setShowCalculator({ field: null })} />}
                            </div>
                        </div>
                    </div>
                    <div className="shrink-0 p-6 pt-4 border-t border-gray-100 flex justify-center gap-3 bg-gray-50">
                        <button onClick={() => setIsAddEntryModalOpen(false)} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-text-primary font-semibold hover:bg-gray-50 transition-colors shadow-sm">Cancelar</button>
                        <button onClick={handleAddNewEntry} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-primary font-bold shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Salvar</button>
                    </div>
                </div>
            </div>
          )}

          {(isGerarPrevisaoConfirmOpen || isConfirmOpen || isTransferConfirmOpen) && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
                    <h3 className="text-xl font-bold mb-4 text-text-primary">Confirmar</h3>
                    <p className="text-text-secondary mb-8">
                        {isGerarPrevisaoConfirmOpen ? `Deseja gerar a previsão para "${semanaParaGerar}"?` 
                         : isTransferConfirmOpen ? `Deseja transferir os lançamentos de ${formatDateToBR(transferDate)} para Pagamentos Diários?` 
                         : confirmAction.message}
                    </p>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => { setIsGerarPrevisaoConfirmOpen(false); setIsTransferConfirmOpen(false); if(confirmAction.action) setIsConfirmOpen(false); }} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-text-primary font-semibold hover:bg-gray-50 transition-colors shadow-sm">Cancelar</button>
                        <button onClick={isGerarPrevisaoConfirmOpen ? handleGerarPrevisao : isTransferConfirmOpen ? confirmTransfer : handleConfirm} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-primary font-bold shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Confirmar</button>
                    </div>
                </div>
            </div>
          )}
          
          {isGerarPrevisaoModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
                    <h3 className="text-xl font-bold mb-4 text-text-primary">Gerar Previsão</h3>
                    <p className="text-text-secondary mb-4">Informe a semana para agrupar os lançamentos.</p>
                    <input
                        type="text"
                        placeholder="Ex: Semana 42"
                        value={semanaParaGerar}
                        onChange={(e) => setSemanaParaGerar(e.target.value)}
                        className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 mb-6"
                    />
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setIsGerarPrevisaoModalOpen(false)} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-text-primary font-semibold hover:bg-gray-50 transition-colors shadow-sm">Cancelar</button>
                        <button onClick={handleProceedToConfirmGerar} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-primary font-bold shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Continuar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
