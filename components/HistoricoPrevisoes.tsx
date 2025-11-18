import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, DatabaseIcon, ArrowLeftIcon, TrendingUpIcon, ReportIcon, BoletoIcon } from './icons';

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
    totais: { receitas: number; despesas: number; resultado: number };
    semana: string;
    dataGeracao: string;
}

interface NavCardProps {
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
}

const NavCard: React.FC<NavCardProps> = ({ title, icon, onClick }) => (
    <div
        onClick={onClick}
        className="bg-card rounded-xl shadow-lg p-6 flex flex-col items-center text-center cursor-pointer transform hover:scale-105 transition-transform duration-300 border border-border hover:border-primary"
    >
        <div className="bg-primary/20 p-4 rounded-full mb-4 flex items-center justify-center">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
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
const formatCurrency = (value: number) => {
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


const PrevisaoCristiano: React.FC = () => {
    const [previsoes, setPrevisoes] = useState<Previsao[]>(() => {
        const savedPrevisoes = localStorage.getItem('previsoes_cristiano');
        return savedPrevisoes ? JSON.parse(savedPrevisoes) : [];
    });
    const [historico, setHistorico] = useState<Previsao[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPrevisao, setEditingPrevisao] = useState<Partial<Previsao> | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
    const [newDayDate, setNewDayDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [newDaySemana, setNewDaySemana] = useState<string>('');
    
    const [dateFilter, setDateFilter] = useState<string>('');
    const [closedDates, setClosedDates] = useState<Set<string>>(() => {
        const savedClosedDates = localStorage.getItem('closedDates_cristiano');
        return savedClosedDates ? new Set(JSON.parse(savedClosedDates)) : new Set();
    });
    
    const [view, setView] = useState<View>('menu');
    
    const [isGerarPrevisaoModalOpen, setIsGerarPrevisaoModalOpen] = useState(false);
    const [isGerarPrevisaoConfirmOpen, setIsGerarPrevisaoConfirmOpen] = useState(false);
    const [semanaParaGerar, setSemanaParaGerar] = useState('');
    const [previsaoGeradaAtiva, setPrevisaoGeradaAtiva] = useState<PrevisaoGerada | null>(null);
    const [historicoPrevisoesGeradas, setHistoricoPrevisoesGeradas] = useState<PrevisaoGerada[]>([]);
    const [dashboardSemanaFilter, setDashboardSemanaFilter] = useState('');

    useEffect(() => {
        localStorage.setItem('previsoes_cristiano', JSON.stringify(previsoes));
    }, [previsoes]);

    useEffect(() => {
        localStorage.setItem('closedDates_cristiano', JSON.stringify(Array.from(closedDates)));
    }, [closedDates]);

    useEffect(() => {
      const savedHistory = localStorage.getItem('historicoPrevisoes_cristiano');
      if (savedHistory) setHistorico(JSON.parse(savedHistory));
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

    const totaisPorBanco = useMemo(() => {
        // FIX: Explicitly type the initial value of reduce to ensure correct type inference for the accumulator.
// @FIX: Explicitly type the initial value of reduce to ensure correct type inference for the accumulator.
        const porEmpresaBanco = previsoes.reduce((acc, item) => {
            const key = `${item.empresa}-${item.tipo}`;
            if (!acc[key]) {
                acc[key] = { empresa: item.empresa, banco: item.tipo, receitas: 0 };
            }
            acc[key].receitas += item.receitas;
            return acc;
            // FIX: Add explicit type to the accumulator to resolve TypeScript errors.
        }, {} as Record<string, { empresa: string; banco: string; receitas: number; }>);
    
        return Object.values(porEmpresaBanco)
            .filter(item => item.receitas > 0)
            .sort((a, b) => {
                if (a.empresa !== b.empresa) return a.empresa.localeCompare(b.empresa);
                return a.banco.localeCompare(b.banco);
            });
    }, [previsoes]);

    const despesasPorEmpresa = useMemo(() => {
        // FIX: Explicitly type the initial value of reduce to ensure correct type inference for the accumulator.
// @FIX: Explicitly type the initial value of reduce to ensure correct type inference for the accumulator.
        const porEmpresa = previsoes.reduce((acc, item) => {
            if (!acc[item.empresa]) {
                acc[item.empresa] = { totalDespesas: 0 };
            }
            acc[item.empresa].totalDespesas += item.despesas;
            return acc;
            // FIX: Add explicit type to the accumulator to resolve TypeScript errors.
        }, {} as Record<string, { totalDespesas: number; }>);
        return Object.entries(porEmpresa).map(([empresa, { totalDespesas }]) => ({ empresa, totalDespesas })).filter(item => item.totalDespesas > 0).sort((a, b) => b.totalDespesas - a.totalDespesas);
    }, [previsoes]);

    const totalDespesasGeral = useMemo(() => {
        return despesasPorEmpresa.reduce((acc, item) => acc + item.totalDespesas, 0);
    }, [despesasPorEmpresa]);

    const handleRowClick = (previsao: Previsao) => {
        if (closedDates.has(previsao.data)) return;
        setEditingPrevisao({ ...previsao });
        setIsEditModalOpen(true);
    };

    const handleOpenAddDayModal = () => {
        setNewDayDate(new Date().toISOString().split('T')[0]);
        setNewDaySemana('');
        setIsAddDayModalOpen(true);
    };
    
    const handleProceedToConfirmGerar = () => {
        if (!semanaParaGerar.trim()) {
            alert("Por favor, informe a semana.");
            return;
        }
        setIsGerarPrevisaoConfirmOpen(true);
    };
    
    const handleGerarPrevisao = () => {
        const dadosDaSemana = previsoes.filter(item => item.semana.toLowerCase() === semanaParaGerar.trim().toLowerCase());
        if (dadosDaSemana.length === 0) {
            alert(`Nenhum dado de previsão encontrado para a semana "${semanaParaGerar}".`);
            setIsGerarPrevisaoConfirmOpen(false);
            return;
        }
        
        // FIX: Explicitly type the initial value of reduce to ensure correct type inference for the accumulator.
// @FIX: Explicitly type the initial value of reduce to ensure correct type inference for the accumulator.
        const groupedByDate = dadosDaSemana.reduce((acc, item) => {
            if (!acc[item.data]) {
                acc[item.data] = { data: item.data, receitas: 0, despesas: 0 };
            }
            acc[item.data].receitas += item.receitas;
            acc[item.data].despesas += item.despesas;
            return acc;
            // FIX: Add explicit type to the accumulator to resolve TypeScript errors.
        }, {} as Record<string, { data: string; receitas: number; despesas: number; }>);

        const diasOrdenados = Object.values(groupedByDate).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

        let saldoAcumulado = 0;
        const diasProcessados = diasOrdenados.map(dia => {
            const resultadoDoDia = dia.receitas - dia.despesas;
            saldoAcumulado += resultadoDoDia;
            return { ...dia, resultado: resultadoDoDia, saldo: saldoAcumulado };
        });

        const totais = diasProcessados.reduce((acc, dia) => {
            acc.receitas += dia.receitas;
            acc.despesas += dia.despesas;
            acc.resultado += dia.resultado;
            return acc;
        }, { receitas: 0, despesas: 0, resultado: 0 });

        const novaPrevisao: PrevisaoGerada = { dias: diasProcessados, totais, semana: semanaParaGerar.trim(), dataGeracao: new Date().toISOString() };
        
        setHistoricoPrevisoesGeradas(prev => [novaPrevisao, ...prev]);
        setPrevisaoGeradaAtiva(novaPrevisao);
        setView('dashboard');
        
        setIsGerarPrevisaoConfirmOpen(false);
        setIsGerarPrevisaoModalOpen(false);
        setSemanaParaGerar('');
    };

    const handleAddDay = () => {
        const todayString = new Date().toISOString().split('T')[0];
        if (newDayDate < todayString) {
            alert("A data não pode ser no passado.");
            return;
        }
        if (previsoes.some(p => p.data === newDayDate)) {
            alert("Já existem lançamentos para esta data.");
            return;
        }

        const action = () => {
            const newEntries: Previsao[] = CRISTIANO_PREDEFINED_ENTRIES.map((entry, index) => ({
                id: Date.now() + index,
                data: newDayDate,
                semana: newDaySemana,
                empresa: entry.empresa,
                tipo: entry.tipo,
                receitas: 0,
                despesas: 0,
            }));
            setPrevisoes(prev => [...prev, ...newEntries].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()));
            setDateFilter(newDayDate);
            setNewDaySemana('');
        };
        
        setConfirmAction({ action, message: `Deseja criar a previsão para o dia ${formatDateToBR(newDayDate)}?` });
        setIsConfirmOpen(true);
        setIsAddDayModalOpen(false);
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
            const existingHistory: Previsao[] = JSON.parse(localStorage.getItem('historicoPrevisoes_cristiano') || '[]');
            const updatedHistory = [...existingHistory, ...filteredPrevisoes];
            localStorage.setItem('historicoPrevisoes_cristiano', JSON.stringify(updatedHistory));
            setHistorico(updatedHistory);
            setClosedDates(prev => new Set(prev).add(dateFilter));
        };
        setConfirmAction({ action, message: `Deseja fechar o dia ${formatDateToBR(dateFilter)}?` });
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => setIsEditModalOpen(false);

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
        if (!editingPrevisao.data) {
            alert("O campo de data é obrigatório.");
            return;
        }
        
        const todayString = new Date().toISOString().split('T')[0];
        if (editingPrevisao.data < todayString) {
            alert("A data não pode ser no passado.");
            return;
        }

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

   if (view === 'menu') {
      return (
          <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in">
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-6 text-center">Previsão Cristiano</h2>
              <p className="text-lg text-text-secondary text-center mb-10">Selecione uma área para visualizar.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                  <NavCard title="Previsão" icon={<TrendingUpIcon className="h-10 w-10 text-primary" />} onClick={() => setView('previsao')} />
                  <NavCard title="Dashboard" icon={<ReportIcon className="h-10 w-10 text-primary" />} onClick={() => setView('dashboard')} />
                  <NavCard title="Totais por Banco" icon={<DatabaseIcon className="h-10 w-10 text-primary" />} onClick={() => setView('banco')} />
                  <NavCard title="Despesas por Empresa" icon={<BoletoIcon className="h-10 w-10 text-primary" />} onClick={() => setView('empresa')} />
              </div>
          </div>
      );
    }
    
    const viewTitles: Record<View, string> = { menu: '', previsao: 'Previsão', dashboard: 'Dashboard', banco: 'Totais por Banco e Empresa', empresa: 'Despesas por Empresa' };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in">
       <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('menu')} className="flex items-center gap-2 py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">
              <ArrowLeftIcon className="h-5 w-5" /> Voltar
          </button>
          <h2 className="text-xl md:text-2xl font-bold text-text-primary">{viewTitles[view]}</h2>
      </div>
      
      {view === 'previsao' && (
        <div className="animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-end sm:items-center mb-6 gap-2">
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10"/>
              <button onClick={() => setDateFilter('')} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">Limpar</button>
              <button onClick={handleFecharDia} disabled={isCurrentDayClosed || !dateFilter} className="py-2 px-4 rounded-lg bg-warning hover:bg-yellow-500 text-white font-semibold transition-colors h-10 disabled:bg-gray-400 disabled:cursor-not-allowed">
                  {isCurrentDayClosed ? 'Dia Fechado' : 'Fechar Dia'}
              </button>
              <button onClick={handleOpenAddDayModal} className="flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors duration-300 h-10">
                  <PlusIcon className="h-5 w-5" /> <span>Adicionar</span>
              </button>
          </div>
          {filteredPrevisoes.length > 0 && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card p-4 rounded-lg shadow-md border border-border text-center">
                <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Total Receitas</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(totais.totalReceitas)}</p>
              </div>
              <div className="bg-card p-4 rounded-lg shadow-md border border-border text-center">
                <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Total Despesas</p>
                <p className="text-2xl font-bold text-danger">{formatCurrency(totais.totalDespesas)}</p>
              </div>
              <div className="bg-card p-4 rounded-lg shadow-md border border-border text-center">
                <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Saldo</p>
                <p className={`text-2xl font-bold ${totais.saldo >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(totais.saldo)}</p>
              </div>
            </div>
          )}
          <div className="bg-card shadow-md rounded-lg overflow-x-auto">
            <table className="w-full text-base text-left text-text-secondary">
              <thead className="text-sm text-text-primary uppercase bg-secondary">
                <tr><th scope="col" className="px-6 py-3">Data</th><th scope="col" className="px-6 py-3">Semana</th><th scope="col" className="px-6 py-3">Empresa</th><th scope="col" className="px-6 py-3">Banco</th><th scope="col" className="px-6 py-3 text-right">Receitas</th><th scope="col" className="px-6 py-3 text-right">Despesas</th><th scope="col" className="px-6 py-3 text-right">Resultado</th><th scope="col" className="px-6 py-3 text-center">Ações</th></tr>
              </thead>
              <tbody>
                {filteredPrevisoes.length > 0 ? (
                  filteredPrevisoes.map((item) => {
                    const isRowClosed = closedDates.has(item.data);
                    const resultado = item.receitas - item.despesas;
                    return (
                    <tr key={item.id} onClick={() => handleRowClick(item)} className={`bg-card border-b border-border transition-colors duration-200 ${isRowClosed ? 'bg-gray-100 opacity-70 cursor-not-allowed' : 'hover:bg-secondary cursor-pointer'}`}>
                      <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{formatDateToBR(item.data)}</td>
                      <td className="px-6 py-4">{item.semana}</td>
                      <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{item.empresa}</td>
                      <td className="px-6 py-4">{item.tipo}</td>
                      <td className="px-6 py-4 text-right text-success font-semibold">{item.receitas > 0 ? formatCurrency(item.receitas) : '-'}</td>
                      <td className="px-6 py-4 text-right text-danger font-semibold">{item.despesas > 0 ? formatCurrency(item.despesas) : '-'}</td>
                      <td className={`px-6 py-4 text-right font-bold ${resultado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(resultado)}</td>
                      <td className="px-6 py-4"><div className="flex items-center justify-center"><button onClick={(e) => handleDeleteClick(e, item)} disabled={isRowClosed} className={`p-2 rounded-full transition-colors ${isRowClosed ? 'text-gray-400 cursor-not-allowed' : 'text-danger hover:text-danger/80 hover:bg-danger/10'}`} aria-label="Excluir"><TrashIcon className="h-5 w-5"/></button></div></td>
                    </tr>
                  )})
                ) : (
                    <tr><td colSpan={8} className="text-center py-16"><div className="flex flex-col items-center justify-center text-text-secondary"><SearchIcon className="w-12 h-12 mb-4 text-gray-300" /><h3 className="text-xl font-semibold text-text-primary">Nenhum Lançamento</h3><p className="mt-1">{dateFilter ? 'Não há dados para a data.' : 'Adicione um novo dia.'}</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="animate-fade-in">
          {previsaoGeradaAtiva ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-text-primary">Previsão para: <span className="text-primary">{previsaoGeradaAtiva.semana}</span></h3>
                    <button onClick={() => setPrevisaoGeradaAtiva(null)} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">Voltar</button>
                </div>
                <div className="bg-card shadow-md rounded-lg overflow-x-auto"><table className="w-full text-base text-left text-text-secondary"><thead className="text-sm text-text-primary uppercase bg-secondary"><tr><th scope="col" className="px-6 py-3">Data</th><th scope="col" className="px-6 py-3 text-right">Receitas</th><th scope="col" className="px-6 py-3 text-right">Despesas</th><th scope="col" className="px-6 py-3 text-right">Saldo</th></tr></thead><tbody>{previsaoGeradaAtiva.dias.map(dia => (<tr key={dia.data} className="bg-card border-b border-border"><td className="px-6 py-4 font-medium text-text-primary">{formatDateToBR(dia.data)}</td><td className="px-6 py-4 text-right text-success font-semibold">{formatCurrency(dia.receitas)}</td><td className="px-6 py-4 text-right text-danger font-semibold">{formatCurrency(dia.despesas)}</td><td className={`px-6 py-4 text-right font-bold ${dia.saldo >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(dia.saldo)}</td></tr>))}</tbody><tfoot><tr className="font-bold text-text-primary bg-secondary/50 text-base border-t-2 border-border"><td colSpan={2} className="px-6 py-4 text-right uppercase">Total Despesas:</td><td className="px-6 py-4 text-right text-danger">{formatCurrency(previsaoGeradaAtiva.totais.despesas)}</td><td className="px-6 py-4"></td></tr></tfoot></table></div>
              </div>
          ) : (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <div className="relative w-full sm:w-auto"><input type="text" placeholder="Buscar por semana..." value={dashboardSemanaFilter} onChange={(e) => setDashboardSemanaFilter(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 pl-10 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10 w-full sm:w-64"/><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-text-secondary" /></div></div>
                    <div className="flex items-center gap-2"><button onClick={() => setDashboardSemanaFilter('')} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">Limpar</button><button onClick={() => setIsGerarPrevisaoModalOpen(true)} className="flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors duration-300 h-10"><PlusIcon className="h-5 w-5" /> Criar Nova Previsão</button></div>
                </div>
                {filteredHistoricoGerado.length > 0 ? (
                    <div className="bg-card shadow-md rounded-lg overflow-x-auto"><table className="w-full text-base text-left text-text-secondary"><thead className="text-sm text-text-primary uppercase bg-secondary"><tr><th scope="col" className="px-6 py-3">Semana</th><th scope="col" className="px-6 py-3">Data da Geração</th><th scope="col" className="px-6 py-3 text-right">Resultado Total</th><th scope="col" className="px-6 py-3 text-center">Ações</th></tr></thead><tbody>{filteredHistoricoGerado.map(item => (<tr key={item.dataGeracao} className="bg-card border-b border-border"><td className="px-6 py-4 font-medium text-text-primary">{item.semana}</td><td className="px-6 py-4">{new Date(item.dataGeracao).toLocaleString('pt-BR')}</td><td className={`px-6 py-4 text-right font-bold ${item.totais.resultado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(item.totais.resultado)}</td><td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => setPrevisaoGeradaAtiva(item)} className="py-1 px-3 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 font-semibold transition-colors">Visualizar</button><button onClick={() => handleDeleteGeneratedForecastClick(item.dataGeracao)} className="text-danger hover:text-danger/80 p-2 rounded-full hover:bg-danger/10 transition-colors" aria-label="Excluir"><TrashIcon className="h-5 w-5"/></button></div></td></tr>))}</tbody></table></div>
                ) : (
                    <div className="text-center py-16"><div className="flex flex-col items-center justify-center text-text-secondary"><DatabaseIcon className="w-12 h-12 mb-4 text-gray-300" /><h3 className="text-xl font-semibold text-text-primary">Nenhuma Previsão Gerada</h3><p className="mt-1">{dashboardSemanaFilter ? 'Nenhuma previsão encontrada.' : 'Crie uma nova previsão.'}</p></div></div>
                )}
                </>
            )}
        </div>
      )}
      
      {view === 'banco' && (<div className="animate-fade-in"><h3 className="text-xl font-bold text-text-primary mb-4">Totais Consolidados por Banco e Empresa</h3><div className="bg-card shadow-md rounded-lg overflow-x-auto"><table className="w-full text-base text-left text-text-secondary"><thead className="text-sm text-text-primary uppercase bg-secondary"><tr><th scope="col" className="px-6 py-3">Empresa</th><th scope="col" className="px-6 py-3">Banco</th><th scope="col" className="px-6 py-3 text-right">Receitas</th></tr></thead><tbody>{totaisPorBanco.length > 0 ? (totaisPorBanco.map(item => (<tr key={`${item.empresa}-${item.banco}`} className="bg-card border-b border-border"><td className="px-6 py-4 font-medium text-text-primary">{item.empresa}</td><td className="px-6 py-4">{item.banco}</td><td className="px-6 py-4 text-right text-success font-semibold">{formatCurrency(item.receitas)}</td></tr>))) : (<tr><td colSpan={3} className="text-center py-16 text-text-secondary">Nenhuma receita para exibir.</td></tr>)}</tbody></table></div></div>)}
      {view === 'empresa' && (<div className="animate-fade-in">
        <h3 className="text-xl font-bold text-text-primary mb-4">Totais de Despesas por Empresa</h3>
        <div className="mb-6">
            <div className="bg-card p-4 rounded-lg shadow-md border border-border text-center sm:max-w-sm">
                <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Despesa Total</p>
                <p className="text-2xl font-bold text-danger">{formatCurrency(totalDespesasGeral)}</p>
            </div>
        </div>
        <div className="bg-card shadow-md rounded-lg overflow-x-auto"><table className="w-full text-base text-left text-text-secondary"><thead className="text-sm text-text-primary uppercase bg-secondary"><tr><th scope="col" className="px-6 py-3">Empresa</th><th scope="col" className="px-6 py-3 text-right">Despesas</th></tr></thead><tbody>{despesasPorEmpresa.length > 0 ? (despesasPorEmpresa.map(item => (<tr key={item.empresa} className="bg-card border-b border-border"><td className="px-6 py-4 font-medium text-text-primary">{item.empresa}</td><td className="px-6 py-4 text-right text-danger font-semibold">{formatCurrency(item.totalDespesas)}</td></tr>))) : (<tr><td colSpan={2} className="text-center py-16 text-text-secondary">Nenhuma despesa registrada.</td></tr>)}</tbody></table></div></div>)}
      {isEditModalOpen && editingPrevisao && (<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"><div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-lg"><h3 className="text-xl font-bold mb-6 text-text-primary">Editar Previsão</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label htmlFor="data" className="block text-sm font-medium text-text-secondary mb-1">Data</label><input id="data" type="date" name="data" value={editingPrevisao.data || ''} onChange={handleInputChange} className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"/></div><div><label htmlFor="semana" className="block text-sm font-medium text-text-secondary mb-1">Semana</label><input id="semana" type="text" name="semana" value={editingPrevisao.semana || ''} onChange={handleInputChange} disabled className="w-full bg-gray-100 border-gray-300 rounded-md px-3 py-2 text-text-secondary cursor-not-allowed"/></div><div className="md:col-span-2"><label htmlFor="empresa" className="block text-sm font-medium text-text-secondary mb-1">Empresa</label><select id="empresa" name="empresa" value={editingPrevisao.empresa || ''} onChange={handleInputChange} className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"><option value="" disabled>Selecione</option>{uniqueEmpresas.map(empresa => (<option key={empresa} value={empresa}>{empresa}</option>))}</select></div><div><label htmlFor="tipo" className="block text-sm font-medium text-text-secondary mb-1">Banco</label><select id="tipo" name="tipo" value={editingPrevisao.tipo || ''} onChange={handleInputChange} className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"><option value="" disabled>Selecione</option>{FIXED_BANKS.map(banco => (<option key={banco} value={banco}>{banco}</option>))}</select></div><div></div><div><label htmlFor="receitas" className="block text-sm font-medium text-text-secondary mb-1">Receitas</label><input id="receitas" type="text" name="receitas" value={formatCurrency(editingPrevisao.receitas || 0)} onChange={handleInputChange} className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"/></div><div><label htmlFor="despesas" className="block text-sm font-medium text-text-secondary mb-1">Despesas</label><input id="despesas" type="text" name="despesas" value={formatCurrency(editingPrevisao.despesas || 0)} onChange={handleInputChange} className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"/></div></div><div className="mt-8 flex justify-end gap-4"><button onClick={handleCloseModal} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button><button onClick={handleSaveChanges} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Salvar</button></div></div></div>)}
      {isAddDayModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"><div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-sm"><h3 className="text-lg font-bold mb-4 text-text-primary">Adicionar Dia</h3><p className="text-text-secondary mb-4">Selecione a data e informe a semana.</p><div className="space-y-4"><div><label htmlFor="newDayDate" className="block text-sm font-medium text-text-secondary mb-1">Data</label><input id="newDayDate" type="date" name="newDayDate" value={newDayDate} onChange={(e) => setNewDayDate(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"/></div><div><label htmlFor="newDaySemana" className="block text-sm font-medium text-text-secondary mb-1">Semana</label><input id="newDaySemana" type="text" name="newDaySemana" value={newDaySemana} onChange={(e) => setNewDaySemana(e.target.value)} placeholder="Ex: Semana 32" className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"/></div></div><div className="mt-6 flex justify-end gap-4"><button onClick={() => setIsAddDayModalOpen(false)} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button><button onClick={handleAddDay} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Gerar</button></div></div></div>)}
      {isGerarPrevisaoModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"><div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-sm"><h3 className="text-lg font-bold mb-4 text-text-primary">Criar Previsão</h3><p className="text-text-secondary mb-4">Digite a semana para gerar o resumo.</p><div><label htmlFor="semanaParaGerar" className="block text-sm font-medium text-text-secondary mb-1">Semana</label><input id="semanaParaGerar" type="text" value={semanaParaGerar} onChange={(e) => setSemanaParaGerar(e.target.value)} placeholder="Ex: Semana 32" className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"/></div><div className="mt-6 flex justify-end gap-4"><button onClick={() => setIsGerarPrevisaoModalOpen(false)} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button><button onClick={handleProceedToConfirmGerar} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Gerar</button></div></div></div>)}
      {isGerarPrevisaoConfirmOpen && (<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"><div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-sm"><h3 className="text-lg font-bold mb-4 text-text-primary">Confirmar</h3><p className="text-text-secondary mb-6">Deseja gerar a previsão para "{semanaParaGerar}"?</p><div className="flex justify-end gap-4"><button onClick={() => setIsGerarPrevisaoConfirmOpen(false)} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button><button onClick={handleGerarPrevisao} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Confirmar</button></div></div></div>)}
      {isConfirmOpen && (<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"><div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-sm"><h3 className="text-lg font-bold mb-4 text-text-primary">Confirmar</h3><p className="text-text-secondary mb-6">{confirmAction.message}</p><div className="flex justify-end gap-4"><button onClick={handleCancelConfirm} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button><button onClick={handleConfirm} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Confirmar</button></div></div></div>)}
    </div>
  );
};

export default PrevisaoCristiano;