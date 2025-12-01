
import React, { useState, useMemo, useEffect } from 'react';
import TransferenciasEmpresas from './TransferenciasEmpresas';
import AutorizacaoPagamento from './AutorizacaoPagamento';
import { CalendarClockIcon, TrashIcon, ReportIcon, ChevronDownIcon, CalculatorIcon } from './icons';
import Calculator from './Calculator';
import DatePicker from './DatePicker';

// Interface for a launch of payment
interface Pagamento {
  id: string; // `data-empresa-index` for uniqueness
  data: string;
  empresa: string;
  tipo: string;
  receitas: number;
  despesas: number;
  envia: number;
  recebe: number;
}

type PagamentoErrors = Partial<Record<keyof Omit<Pagamento, 'id' | 'data' | 'empresa' | 'tipo'>, string>>;

const BANK_OPTIONS = ['INTER', 'ITAU', 'BANCO DO BRASIL'];

const LOCAL_STORAGE_KEY = 'pagamentos_diarios_cristiano';

// Utility functions
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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


const getDayOfWeek = (dateString: string): string => {
  if (!dateString) return '';
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const date = new Date(`${dateString}T00:00:00`); // Prevents timezone issues
  return days[date.getDay()];
};

type Tab = 'pagamentos' | 'transferencias' | 'inserir_banco';

// Currency formatter for the input field itself (ATM style)
const formatInputCurrency = (rawDigits: string): string => {
    if (!rawDigits) return '0,00';
    const num = parseInt(rawDigits, 10);
    if (isNaN(num)) return '0,00'; // Fallback for invalid inputs

    let s = num.toString();
    // Ensure at least two digits for cents, padding with '0' if needed
    while (s.length < 3) s = '0' + s; 
    
    const integerPart = s.slice(0, s.length - 2);
    const decimalPart = s.slice(s.length - 2);
    
    // Add thousands separator (dots)
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${formattedInteger},${decimalPart}`;
};


const PagamentosCristiano: React.FC = () => {
    const [pagamentos, setPagamentos] = useState<Pagamento[]>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });
    // Initialize with current date
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPagamento, setEditingPagamento] = useState<Pagamento | null>(null);
    const [errors, setErrors] = useState<PagamentoErrors>({});
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [activeTab, setActiveTab] = useState<Tab>('pagamentos');
    const [tempCurrencyInput, setTempCurrencyInput] = useState<Record<string, string>>({}); // New state for raw currency input
    
    // Calculator State
    const [showCalculator, setShowCalculator] = useState<{ field: string | null }>({ field: null });

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pagamentos));
    }, [pagamentos]);

    const handleDateSelect = (newDate: string) => {
        if (!newDate) return;
        setSelectedDate(newDate);
        // No auto-generation of rows. Data must come from Transfer or existing storage.
    };
    
    const dailyData = useMemo(() => {
        // Filter payments for the selected date and exclude entries where all financial values are zero
        return pagamentos.filter(p => 
            p.data === selectedDate && 
            (p.receitas !== 0 || p.despesas !== 0 || p.envia !== 0 || p.recebe !== 0)
        ).sort((a, b) => a.tipo.localeCompare(b.tipo));
    }, [pagamentos, selectedDate]);

    const balanceByDate = useMemo(() => {
        const dailyResults: Record<string, number> = {};
        for (const p of pagamentos) {
            if (!p.data) continue;
            if (!dailyResults[p.data]) dailyResults[p.data] = 0;
            dailyResults[p.data] += (p.receitas + p.recebe) - (p.despesas + p.envia);
        }

        const sortedDates = Object.keys(dailyResults).sort();
        const cumulativeBalances: Record<string, number> = {};
        let runningTotal = 0;
        for (const date of sortedDates) {
            runningTotal += dailyResults[date];
            cumulativeBalances[date] = runningTotal;
        }
        return { cumulativeBalances, sortedDates };
    }, [pagamentos]);

    const totais = useMemo(() => {
        const totaisDoDia = dailyData.reduce((acc, item) => {
            acc.despesas += item.despesas;
            acc.envia += item.envia;
            acc.recebe += item.recebe;
            acc.resultado += (item.receitas + item.recebe) - (item.despesas + item.envia);
            acc.receitasDoDia += item.receitas;
            return acc;
        }, { despesas: 0, envia: 0, recebe: 0, resultado: 0, receitasDoDia: 0 });
    
        const { cumulativeBalances, sortedDates } = balanceByDate;
        let saldoAcumuladoAnterior = 0;
        
        if (selectedDate) {
            const selectedDateIndex = sortedDates.indexOf(selectedDate);
            if (selectedDateIndex > 0) {
                const previousDate = sortedDates[selectedDateIndex - 1];
                saldoAcumuladoAnterior = cumulativeBalances[previousDate] || 0;
            }
        }
        
        return {
            receitas: totaisDoDia.receitasDoDia, 
            despesas: totaisDoDia.despesas,
            envia: totaisDoDia.envia,
            recebe: totaisDoDia.recebe,
            resultado: totaisDoDia.resultado,
            receitasDoDia: totaisDoDia.receitasDoDia, // Explicitly keep for card.
        };
    }, [selectedDate, dailyData, balanceByDate]);

    const handleRowClick = (pagamento: Pagamento) => {
        setErrors({});
        setEditingPagamento({ ...pagamento });
        // Initialize temp currency inputs with values * 100 as strings
        setTempCurrencyInput({
            receitas: (pagamento.receitas * 100).toFixed(0),
            despesas: (pagamento.despesas * 100).toFixed(0),
            envia: (pagamento.envia * 100).toFixed(0),
            recebe: (pagamento.recebe * 100).toFixed(0),
        });
        setIsEditModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsEditModalOpen(false);
        setEditingPagamento(null);
        setErrors({});
        setTempCurrencyInput({}); // Clear temp state on close
        setShowCalculator({ field: null });
    };
    
    const handleDeleteClick = (e: React.MouseEvent, idToDelete: string) => {
        e.stopPropagation();
        const action = () => {
            setPagamentos(prev => prev.filter(p => p.id !== idToDelete));
        };
        setConfirmAction({
            action,
            message: 'Você tem certeza que deseja excluir este lançamento permanentemente?'
        });
        setIsConfirmOpen(true);
    };

    // Generic input change for non-currency fields
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (editingPagamento) {
            const { name, value } = e.target;
            setEditingPagamento({ ...editingPagamento, [name]: value });
        }
    };

    // Specific handler for ATM-style currency inputs
    const handleCurrencyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingPagamento) return;
        const { name, value } = e.target;
        
        // Only allow digits in the temporary input state
        const rawDigits = value.replace(/\D/g, '');
        
        setTempCurrencyInput(prev => ({
            ...prev,
            [name]: rawDigits,
        }));

        // Convert rawDigits to a number (e.g., "12345" -> 123.45) for the actual Pagamento object
        const numberValue = parseInt(rawDigits, 10) / 100 || 0;
        setEditingPagamento(prev => prev ? { ...prev, [name]: numberValue } : null);

        // Clear error on change if it exists
        if (errors[name as keyof PagamentoErrors]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name as keyof PagamentoErrors];
                return newErrors;
            });
        }
    };

    const handleCalculatorUpdate = (result: number, field: string) => {
        if (!editingPagamento) return;
        
        // Update the numeric value in editingPagamento
        setEditingPagamento(prev => prev ? { ...prev, [field]: result } : null);
        
        // Update the temp input (raw digits)
        // Convert result back to integer representation (e.g., 100.50 -> "10050")
        const rawDigits = Math.round(result * 100).toString();
        setTempCurrencyInput(prev => ({ ...prev, [field]: rawDigits }));
        
        setShowCalculator({ field: null });
    };

    const validate = (): boolean => {
        if (!editingPagamento) return false;
        const newErrors: PagamentoErrors = {};

        if (editingPagamento.receitas < 0) newErrors.receitas = 'Valor não pode ser negativo.';
        if (editingPagamento.despesas < 0) newErrors.despesas = 'Valor não pode ser negativo.';
        if (editingPagamento.envia < 0) newErrors.envia = 'Valor não pode ser negativo.';
        if (editingPagamento.recebe < 0) newErrors.recebe = 'Valor não pode ser negativo.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveChanges = () => {
        if (!validate()) return;

        if (editingPagamento) {
            const action = () => {
                setPagamentos(pagamentos.map(p => p.id === editingPagamento!.id ? editingPagamento : p));
                handleCloseModal();
            };
            setConfirmAction({
                action,
                message: 'Você tem certeza que deseja salvar as alterações?'
            });
            setIsConfirmOpen(true);
        }
    };

    const handleConfirm = () => {
        if (confirmAction.action) {
            confirmAction.action();
        }
        setIsConfirmOpen(false);
        setConfirmAction({ action: null, message: '' });
    };

    const handleCancelConfirm = () => {
        setIsConfirmOpen(false);
        setConfirmAction({ action: null, message: '' });
    };

    const handleClearDate = () => {
        setSelectedDate('');
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'pagamentos':
                return (
                    <>
                        {selectedDate && dailyData.length > 0 ? (
                            <>
                                <div className="mb-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
                                    <div className="bg-card p-3 rounded-2xl shadow-sm border border-border text-center">
                                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Receitas</p>
                                        <p className="text-lg font-bold text-success">{formatCurrency(totais.receitasDoDia)}</p>
                                    </div>
                                    <div className="bg-card p-3 rounded-2xl shadow-sm border border-border text-center">
                                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Despesas</p>
                                        <p className="text-lg font-bold text-danger">{formatCurrency(totais.despesas)}</p>
                                    </div>
                                    <div className="bg-card p-3 rounded-2xl shadow-sm border border-border text-center">
                                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Envia</p>
                                        <p className="text-lg font-bold text-orange-500">{formatCurrency(totais.envia)}</p>
                                    </div>
                                    <div className="bg-card p-3 rounded-2xl shadow-sm border border-border text-center">
                                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Recebe</p>
                                        <p className="text-lg font-bold text-blue-500">{formatCurrency(totais.recebe)}</p>
                                    </div>
                                    <div className="bg-card p-3 rounded-2xl shadow-sm border border-border text-center col-span-2 lg:col-span-1">
                                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Resultado</p>
                                        <p className={`text-lg font-bold ${totais.resultado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(totais.resultado)}</p>
                                    </div>
                                </div>
                                <div className="bg-card shadow-md rounded-2xl overflow-hidden border border-border flex-grow flex flex-col">
                                    <div className="overflow-auto flex-grow">
                                        <table className="w-full text-sm text-left text-text-secondary">
                                            <thead className="text-xs text-text-primary uppercase bg-secondary sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3">Data</th>
                                                    <th scope="col" className="px-4 py-3">Dia</th>
                                                    <th scope="col" className="px-4 py-3">Empresa</th>
                                                    <th scope="col" className="px-4 py-3">Banco</th>
                                                    <th scope="col" className="px-4 py-3 text-right">Receitas</th>
                                                    <th scope="col" className="px-4 py-3 text-right">Despesas</th>
                                                    <th scope="col" className="px-4 py-3 text-right">Envia</th>
                                                    <th scope="col" className="px-4 py-3 text-right">Recebe</th>
                                                    <th scope="col" className="px-4 py-3 text-right">Resultado</th>
                                                    <th scope="col" className="px-4 py-3 text-center">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {dailyData.map((item) => {
                                                    const resultado = (item.receitas + item.recebe) - (item.despesas + item.envia);
                                                    return (
                                                        <tr
                                                            key={item.id}
                                                            onClick={() => handleRowClick(item)}
                                                            className="bg-card hover:bg-secondary cursor-pointer transition-colors duration-200"
                                                        >
                                                            <td className="px-4 py-3 font-medium text-text-primary whitespace-nowrap">{formatDateToBR(item.data)}</td>
                                                            <td className="px-4 py-3">{getDayOfWeek(item.data)}</td>
                                                            <td className="px-4 py-3 font-medium text-text-primary whitespace-nowrap">{item.empresa}</td>
                                                            <td className="px-4 py-3">{item.tipo}</td>
                                                            <td className="px-4 py-3 text-right text-success font-semibold">{formatCurrency(item.receitas)}</td>
                                                            <td className="px-4 py-3 text-right text-danger font-semibold">{formatCurrency(item.despesas)}</td>
                                                            <td className="px-4 py-3 text-right text-orange-500 font-semibold">{formatCurrency(item.envia)}</td>
                                                            <td className="px-4 py-3 text-right text-blue-500 font-semibold">{formatCurrency(item.recebe)}</td>
                                                            <td className={`px-4 py-3 text-right font-bold ${resultado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(resultado)}</td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center justify-center">
                                                                    <button
                                                                        onClick={(e) => handleDeleteClick(e, item.id)}
                                                                        className="text-danger hover:text-danger/80 p-1.5 rounded-full hover:bg-danger/10 transition-colors"
                                                                        aria-label="Excluir lançamento"
                                                                    >
                                                                        <TrashIcon className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-16 bg-card rounded-2xl shadow-sm flex flex-col items-center justify-center border border-border h-64">
                                <ReportIcon className="w-12 h-12 mb-4 text-gray-300" />
                                <h3 className="text-lg font-semibold text-text-primary">Nenhum Lançamento Encontrado</h3>
                                <p className="mt-2 text-text-secondary text-sm max-w-md">
                                    {selectedDate 
                                        ? "Não há pagamentos registrados para esta data. Realize a transferência através do módulo de Previsão Financeira." 
                                        : "Selecione uma data acima para visualizar."}
                                </p>
                            </div>
                        )}
                    </>
                );
            case 'transferencias':
                return <TransferenciasEmpresas storageKeySuffix="_cristiano" />;
            case 'inserir_banco':
                return <AutorizacaoPagamento storageKeySuffix="_cristiano" />;
            default:
                return null;
        }
    };


    return (
      <div className="p-4 sm:p-6 w-full h-full flex flex-col animate-fade-in">
        {/* Unified Toolbar: Sub-tabs + Date Filter */}
        <div className="flex flex-col lg:flex-row justify-between items-center mb-4 gap-4 bg-card p-3 rounded-2xl border border-border shadow-sm">
            
            {/* Left: Sub-tabs (Pills) */}
            <div className="flex p-1 bg-secondary rounded-full">
                <button
                    onClick={() => setActiveTab('pagamentos')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                        activeTab === 'pagamentos'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                >
                    Pagamentos
                </button>
                <button
                    onClick={() => setActiveTab('transferencias')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                        activeTab === 'transferencias'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                >
                    Transferências
                </button>
                <button
                    onClick={() => setActiveTab('inserir_banco')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                        activeTab === 'inserir_banco'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                >
                    Inserir no Banco
                </button>
            </div>

            {/* Right: Filters (Only show for Pagamentos tab) */}
            {activeTab === 'pagamentos' && (
                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                    <div className="flex items-center rounded-full px-2">
                        <DatePicker
                            value={selectedDate}
                            onChange={handleDateSelect}
                            className="w-36 h-9"
                            placeholder="Selecione Data"
                        />
                    </div>
                    <button 
                        onClick={handleClearDate}
                        className="py-1.5 px-3 rounded-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-xs transition-colors h-9 shadow-sm"
                    >
                        Limpar
                    </button>
                </div>
            )}
        </div>
        
        <div className="flex-grow flex flex-col overflow-hidden">
            {renderContent()}
        </div>

        {activeTab === 'pagamentos' && isEditModalOpen && editingPagamento && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="shrink-0 p-6 pb-4 border-b border-gray-100">
                  <h3 className="text-2xl font-bold text-text-primary text-center">Editar Lançamento</h3>
                  <p className="text-text-secondary text-sm text-center mt-1">{editingPagamento.empresa} - {formatDateToBR(editingPagamento.data)}</p>
              </div>
              
              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 relative">
                    <div className="sm:col-span-2">
                        <label htmlFor="empresa" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Empresa</label>
                        <input
                            id="empresa"
                            type="text"
                            name="empresa"
                            value={editingPagamento.empresa}
                            onChange={handleInputChange}
                            className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="tipo" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Banco</label>
                        <div className="relative">
                            <select
                                id="tipo"
                                name="tipo"
                                value={editingPagamento.tipo}
                                onChange={handleInputChange}
                                className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 appearance-none"
                            >
                                {BANK_OPTIONS.map(banco => (
                                    <option key={banco} value={banco}>{banco}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-text-secondary"><ChevronDownIcon className="h-4 w-4" /></div>
                        </div>
                    </div>
                    <div className="relative">
                      <label htmlFor="receitas" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Receitas (R$)</label>
                      <input 
                          id="receitas" 
                          type="text" 
                          name="receitas" 
                          value={formatInputCurrency(tempCurrencyInput.receitas || '')} 
                          onChange={handleCurrencyInputChange} 
                          className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.receitas ? 'border-danger' : ''}`}
                      />
                      <button onClick={() => setShowCalculator({ field: 'receitas' })} className="absolute right-3 top-9 text-text-secondary hover:text-primary"><CalculatorIcon className="h-5 w-5" /></button>
                      {showCalculator.field === 'receitas' && <Calculator initialValue={editingPagamento.receitas} onResult={(res) => handleCalculatorUpdate(res, 'receitas')} onClose={() => setShowCalculator({ field: null })} />}
                      {errors.receitas && <p className="text-danger text-xs mt-1">{errors.receitas}</p>}
                    </div>
                    <div className="relative">
                      <label htmlFor="despesas" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Despesas (R$)</label>
                      <input 
                          id="despesas" 
                          type="text" 
                          name="despesas" 
                          value={formatInputCurrency(tempCurrencyInput.despesas || '')} 
                          onChange={handleCurrencyInputChange} 
                          className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.despesas ? 'border-danger' : ''}`}
                      />
                       <button onClick={() => setShowCalculator({ field: 'despesas' })} className="absolute right-3 top-9 text-text-secondary hover:text-primary"><CalculatorIcon className="h-5 w-5" /></button>
                       {showCalculator.field === 'despesas' && <Calculator initialValue={editingPagamento.despesas} onResult={(res) => handleCalculatorUpdate(res, 'despesas')} onClose={() => setShowCalculator({ field: null })} />}
                       {errors.despesas && <p className="text-danger text-xs mt-1">{errors.despesas}</p>}
                    </div>
                    <div className="relative">
                      <label htmlFor="envia" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Envia (R$)</label>
                      <input 
                          id="envia" 
                          type="text" 
                          name="envia" 
                          value={formatInputCurrency(tempCurrencyInput.envia || '')} 
                          onChange={handleCurrencyInputChange} 
                          className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.envia ? 'border-danger' : ''}`}
                      />
                       <button onClick={() => setShowCalculator({ field: 'envia' })} className="absolute right-3 top-9 text-text-secondary hover:text-primary"><CalculatorIcon className="h-5 w-5" /></button>
                       {showCalculator.field === 'envia' && <Calculator initialValue={editingPagamento.envia} onResult={(res) => handleCalculatorUpdate(res, 'envia')} onClose={() => setShowCalculator({ field: null })} />}
                       {errors.envia && <p className="text-danger text-xs mt-1">{errors.envia}</p>}
                    </div>
                     <div className="relative">
                      <label htmlFor="recebe" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Recebe (R$)</label>
                      <input 
                          id="recebe" 
                          type="text" 
                          name="recebe" 
                          value={formatInputCurrency(tempCurrencyInput.recebe || '')} 
                          onChange={handleCurrencyInputChange} 
                          className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.recebe ? 'border-danger' : ''}`}
                      />
                      <button onClick={() => setShowCalculator({ field: 'recebe' })} className="absolute right-3 top-9 text-text-secondary hover:text-primary"><CalculatorIcon className="h-5 w-5" /></button>
                      {showCalculator.field === 'recebe' && <Calculator initialValue={editingPagamento.recebe} onResult={(res) => handleCalculatorUpdate(res, 'recebe')} onClose={() => setShowCalculator({ field: null })} />}
                      {errors.recebe && <p className="text-danger text-xs mt-1">{errors.recebe}</p>}
                    </div>
                  </div>
              </div>

              {/* Fixed Footer */}
              <div className="shrink-0 p-6 pt-4 border-t border-gray-100 flex justify-center gap-3 bg-gray-50">
                <button onClick={handleCloseModal} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-text-primary font-semibold hover:bg-gray-50 transition-colors shadow-sm">Cancelar</button>
                <button onClick={handleSaveChanges} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-primary font-bold shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pagamentos' && isConfirmOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
                    <h3 className="text-xl font-bold mb-4 text-text-primary">Confirmar Ação</h3>
                    <p className="text-text-secondary mb-8">{confirmAction.message}</p>
                     <div className="flex justify-center gap-4">
                        <button onClick={handleCancelConfirm} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-text-primary font-semibold hover:bg-gray-50 transition-colors shadow-sm">Cancelar</button>
                        <button onClick={handleConfirm} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-primary font-bold shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Confirmar</button>
                     </div>
                </div>
            </div>
        )}
      </div>
    );
};

export default PagamentosCristiano;
