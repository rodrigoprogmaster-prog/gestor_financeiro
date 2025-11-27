
import React, { useState, useMemo, useEffect } from 'react';
import TransferenciasEmpresas from './TransferenciasEmpresas';
import AutorizacaoPagamento from './AutorizacaoPagamento';
import { CalendarClockIcon, TrashIcon, ReportIcon, ChevronDownIcon } from './icons';

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
                    <div className="flex items-center bg-secondary rounded-full px-3 border border-border">
                        <span className="text-xs font-medium text-text-secondary mr-2">Data:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => handleDateSelect(e.target.value)}
                            className="bg-transparent border-none text-sm text-text-primary focus:ring-0 h-9"
                        />
                    </div>
                    <button 
                        onClick={handleClearDate}
                        className="py-1.5 px-3 rounded-full bg-white border border-border hover:bg-secondary font-medium text-xs text-text-primary transition-colors h-9 shadow-sm"
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
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-card rounded-2xl shadow-xl p-8 w-full max-w-2xl">
              <h3 className="text-xl font-bold mb-2 text-text-primary">Editar Lançamento</h3>
              <p className="text-text-secondary mb-6">{editingPagamento.empresa} - {formatDateToBR(editingPagamento.data)}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="sm:col-span-2">
                    <label htmlFor="empresa" className="block text-sm font-medium text-text-secondary mb-1">Empresa</label>
                    <input
                        id="empresa"
                        type="text"
                        name="empresa"
                        value={editingPagamento.empresa}
                        onChange={handleInputChange}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-12"
                    />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="tipo" className="block text-sm font-medium text-text-secondary mb-1">Banco</label>
                    <div className="relative">
                        <select
                            id="tipo"
                            name="tipo"
                            value={editingPagamento.tipo}
                            onChange={handleInputChange}
                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary appearance-none h-12"
                        >
                            {BANK_OPTIONS.map(banco => (
                                <option key={banco} value={banco}>{banco}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-text-secondary"><ChevronDownIcon className="h-4 w-4" /></div>
                    </div>
                </div>
                <div>
                  <label htmlFor="receitas" className="block text-sm font-medium text-text-secondary mb-1">Receitas (R$)</label>
                  <input 
                      id="receitas" 
                      type="text" // Changed to text to handle custom currency input
                      name="receitas" 
                      value={formatInputCurrency(tempCurrencyInput.receitas || '')} 
                      onChange={handleCurrencyInputChange} 
                      className={`w-full bg-background border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-12 ${errors.receitas ? 'border-danger' : 'border-border'}`}
                  />
                  {errors.receitas && <p className="text-danger text-xs mt-1">{errors.receitas}</p>}
                </div>
                <div>
                  <label htmlFor="despesas" className="block text-sm font-medium text-text-secondary mb-1">Despesas (R$)</label>
                  <input 
                      id="despesas" 
                      type="text" // Changed to text to handle custom currency input
                      name="despesas" 
                      value={formatInputCurrency(tempCurrencyInput.despesas || '')} 
                      onChange={handleCurrencyInputChange} 
                      className={`w-full bg-background border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-12 ${errors.despesas ? 'border-danger' : 'border-border'}`}
                  />
                   {errors.despesas && <p className="text-danger text-xs mt-1">{errors.despesas}</p>}
                </div>
                <div>
                  <label htmlFor="envia" className="block text-sm font-medium text-text-secondary mb-1">Envia (R$)</label>
                  <input 
                      id="envia" 
                      type="text" // Changed to text to handle custom currency input
                      name="envia" 
                      value={formatInputCurrency(tempCurrencyInput.envia || '')} 
                      onChange={handleCurrencyInputChange} 
                      className={`w-full bg-background border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-12 ${errors.envia ? 'border-danger' : 'border-border'}`}
                  />
                   {errors.envia && <p className="text-danger text-xs mt-1">{errors.envia}</p>}
                </div>
                 <div>
                  <label htmlFor="recebe" className="block text-sm font-medium text-text-secondary mb-1">Recebe (R$)</label>
                  <input 
                      id="recebe" 
                      type="text" // Changed to text to handle custom currency input
                      name="recebe" 
                      value={formatInputCurrency(tempCurrencyInput.recebe || '')} 
                      onChange={handleCurrencyInputChange} 
                      className={`w-full bg-background border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-12 ${errors.recebe ? 'border-danger' : 'border-border'}`}
                  />
                  {errors.recebe && <p className="text-danger text-xs mt-1">{errors.recebe}</p>}
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <button onClick={handleCloseModal} className="py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button>
                <button onClick={handleSaveChanges} className="py-2 px-4 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pagamentos' && isConfirmOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-card rounded-2xl shadow-xl p-8 w-full max-w-sm">
                    <h3 className="text-lg font-bold mb-4 text-text-primary">Confirmar Ação</h3>
                    <p className="text-text-secondary mb-6">{confirmAction.message}</p>
                     <div className="flex justify-end gap-4">
                        <button onClick={handleCancelConfirm} className="py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button>
                        <button onClick={handleConfirm} className="py-2 px-4 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Confirmar</button>
                     </div>
                </div>
            </div>
        )}
      </div>
    );
};

export default PagamentosCristiano;
