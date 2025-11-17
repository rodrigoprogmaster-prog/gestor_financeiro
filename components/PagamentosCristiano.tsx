import React, { useState, useMemo, useEffect } from 'react';
import TransferenciasEmpresas from './TransferenciasEmpresas';
import AutorizacaoPagamento from './AutorizacaoPagamento';
import { CalendarClockIcon, TrashIcon, ArrowLeftIcon, ReportIcon, TransferIcon, DatabaseIcon } from './icons';

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

// Pre-defined list of companies based on the image
const PREDEFINED_ENTRIES = [
  { empresa: 'FIBER ADM DE FRANQUIAS ITAU' },
  { empresa: 'CACHOEIRINHA PISCINAS' },
  { empresa: 'WORLD WIDE ITAU' },
  { empresa: 'CAMARGOS PISCINAS E SPAS LTDA' },
  { empresa: 'IPR INDUSTRIA E COMERCIO DE PLASTIC' },
  { empresa: 'ZMR PISCINAS LTDA.' },
  { empresa: 'WORLD WIDE SWIMMINGPOOLS NEGOCIOS D' },
  { empresa: 'CRISTIANO B FRANÇA' },
  { empresa: 'CRISTIANO B FRANÇA' },
  { empresa: 'VAZIO' },
];

const BANK_OPTIONS = ['INTER', 'ITAU', 'BANCO DO BRASIL'];

const LOCAL_STORAGE_KEY = 'pagamentos_diarios_cristiano';

// Utility functions
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getDayOfWeek = (dateString: string): string => {
  if (!dateString) return '';
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const date = new Date(`${dateString}T00:00:00`); // Prevents timezone issues
  return days[date.getDay()];
};

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

type View = 'menu' | 'pagamentos' | 'transferencias' | 'inserir_banco';


const PagamentosCristiano: React.FC = () => {
    const [pagamentos, setPagamentos] = useState<Pagamento[]>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPagamento, setEditingPagamento] = useState<Pagamento | null>(null);
    const [errors, setErrors] = useState<PagamentoErrors>({});
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [view, setView] = useState<View>('menu');

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pagamentos));
    }, [pagamentos]);

    const handleDateSelect = (newDate: string) => {
        if (!newDate) return;
        
        setSelectedDate(newDate);

        const dataExists = pagamentos.some(p => p.data === newDate);
        if (!dataExists) {
            const newEntries = PREDEFINED_ENTRIES.map((entry, index) => ({
                id: `${newDate}-${entry.empresa}-${index}`, // Index to ensure unique IDs
                data: newDate,
                empresa: entry.empresa,
                tipo: 'INTER', // Loads INTER as default
                receitas: 0,
                despesas: 0,
                envia: 0,
                recebe: 0,
            }));
            setPagamentos(prev => [...prev, ...newEntries]);
        }
    };
    
    const dailyData = useMemo(() => {
        return pagamentos.filter(p => p.data === selectedDate).sort((a, b) => a.tipo.localeCompare(b.tipo));
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
            return acc;
        }, { despesas: 0, envia: 0, recebe: 0, resultado: 0 });
    
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
            receitas: saldoAcumuladoAnterior, // This is now the "Saldo Inicial"
            despesas: totaisDoDia.despesas,
            envia: totaisDoDia.envia,
            recebe: totaisDoDia.recebe,
            resultado: totaisDoDia.resultado,
        };
    }, [selectedDate, dailyData, balanceByDate]);

    const handleRowClick = (pagamento: Pagamento) => {
        setErrors({});
        setEditingPagamento({ ...pagamento });
        setIsEditModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsEditModalOpen(false);
        setEditingPagamento(null);
        setErrors({});
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (editingPagamento) {
            const { name, value } = e.target;
            if (['receitas', 'despesas', 'envia', 'recebe'].includes(name)) {
                let numericValue = value.replace(/\D/g, '');
                if (numericValue === '') numericValue = '0';
                const numberValue = Number(numericValue) / 100;
                setEditingPagamento({ ...editingPagamento, [name]: numberValue });
            } else {
                setEditingPagamento({ ...editingPagamento, [name]: value });
            }
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

    if (view === 'menu') {
      return (
          <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in">
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-6 text-center">
                  Pagamentos Cristiano
              </h2>
              <p className="text-lg text-text-secondary text-center mb-10">Selecione uma área para gerenciar.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                  <NavCard title="Pagamentos" icon={<ReportIcon className="h-10 w-10 text-primary" />} onClick={() => setView('pagamentos')} />
                  <NavCard title="Transferências" icon={<TransferIcon className="h-10 w-10 text-primary" />} onClick={() => setView('transferencias')} />
                  <NavCard title="Inserir no Banco" icon={<DatabaseIcon className="h-10 w-10 text-primary" />} onClick={() => setView('inserir_banco')} />
              </div>
          </div>
      );
    }

    const viewTitles: Record<View, string> = {
        menu: '',
        pagamentos: 'Pagamentos Diários',
        transferencias: 'Transferências entre Empresas',
        inserir_banco: 'Autorização de Pagamento',
    };

    return (
      <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setView('menu')} className="flex items-center gap-2 py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">
                <ArrowLeftIcon className="h-5 w-5" />
                Voltar
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-text-primary">{viewTitles[view]}</h2>
        </div>

        {view === 'pagamentos' && (
          <>
            <div className="flex flex-col sm:flex-row justify-end sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="date-selector" className="font-semibold">Selecione o Dia:</label>
                <input 
                  id="date-selector"
                  type="date" 
                  value={selectedDate} 
                  onChange={e => handleDateSelect(e.target.value)} 
                  className="bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10"
                />
              </div>
            </div>

            {selectedDate ? (
              <>
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-card p-4 rounded-lg shadow-md border border-border text-center">
                        <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Saldo Inicial</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(totais.receitas)}</p>
                    </div>
                    <div className="bg-card p-4 rounded-lg shadow-md border border-border text-center">
                        <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Despesas</p>
                        <p className="text-2xl font-bold text-danger">{formatCurrency(totais.despesas)}</p>
                    </div>
                    <div className="bg-card p-4 rounded-lg shadow-md border border-border text-center">
                        <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Envia</p>
                        <p className="text-2xl font-bold text-orange-500">{formatCurrency(totais.envia)}</p>
                    </div>
                    <div className="bg-card p-4 rounded-lg shadow-md border border-border text-center">
                        <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Recebe</p>
                        <p className="text-2xl font-bold text-blue-500">{formatCurrency(totais.recebe)}</p>
                    </div>
                    <div className="bg-card p-4 rounded-lg shadow-md border border-border text-center">
                        <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Resultado do Dia</p>
                        <p className={`text-2xl font-bold ${totais.resultado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(totais.resultado)}</p>
                    </div>
                </div>
                <div className="bg-card shadow-md rounded-lg overflow-x-auto">
                  <table className="w-full text-base text-left text-text-secondary">
                    <thead className="text-sm text-text-primary uppercase bg-secondary">
                      <tr>
                        <th scope="col" className="px-6 py-3">Data</th>
                        <th scope="col" className="px-6 py-3">Dia semana</th>
                        <th scope="col" className="px-6 py-3">Empresa</th>
                        <th scope="col" className="px-6 py-3">Banco</th>
                        <th scope="col" className="px-6 py-3 text-right">Receitas (R$)</th>
                        <th scope="col" className="px-6 py-3 text-right">Despesas (R$)</th>
                        <th scope="col" className="px-6 py-3 text-right">Envia (R$)</th>
                        <th scope="col" className="px-6 py-3 text-right">Recebe (R$)</th>
                        <th scope="col" className="px-6 py-3 text-right">Resultado (R$)</th>
                        <th scope="col" className="px-6 py-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.map((item) => {
                        const resultado = (item.receitas + item.recebe) - (item.despesas + item.envia);
                        return (
                          <tr
                            key={item.id}
                            onClick={() => handleRowClick(item)}
                            className="bg-card border-b border-border hover:bg-secondary cursor-pointer transition-colors duration-200"
                          >
                            <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{new Date(`${item.data}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                            <td className="px-6 py-4">{getDayOfWeek(item.data)}</td>
                            <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{item.empresa}</td>
                            <td className="px-6 py-4">{item.tipo}</td>
                            <td className="px-6 py-4 text-right text-success font-semibold">{formatCurrency(item.receitas)}</td>
                            <td className="px-6 py-4 text-right text-danger font-semibold">{formatCurrency(item.despesas)}</td>
                            <td className="px-6 py-4 text-right text-orange-500 font-semibold">{formatCurrency(item.envia)}</td>
                            <td className="px-6 py-4 text-right text-blue-500 font-semibold">{formatCurrency(item.recebe)}</td>
                            <td className={`px-6 py-4 text-right font-bold ${resultado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(resultado)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center">
                                  <button
                                      onClick={(e) => handleDeleteClick(e, item.id)}
                                      className="text-danger hover:text-danger/80 p-2 rounded-full hover:bg-danger/10 transition-colors"
                                      aria-label="Excluir lançamento"
                                  >
                                      <TrashIcon className="h-5 w-5"/>
                                  </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-card rounded-lg shadow-md flex flex-col items-center justify-center">
                <CalendarClockIcon className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-text-primary">Nenhuma Data Selecionada</h3>
                <p className="mt-2 text-text-secondary">Por favor, escolha uma data acima para carregar ou criar os pagamentos do dia.</p>
              </div>
            )}
          </>
        )}

        {view === 'transferencias' && <TransferenciasEmpresas storageKeySuffix="_cristiano" />}
        {view === 'inserir_banco' && <AutorizacaoPagamento storageKeySuffix="_cristiano" />}


        {isEditModalOpen && editingPagamento && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-2xl">
              <h3 className="text-xl font-bold mb-2 text-text-primary">Editar Lançamento</h3>
              <p className="text-text-secondary mb-6">{editingPagamento.empresa} - {new Date(`${editingPagamento.data}T00:00:00`).toLocaleDateString('pt-BR')}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="sm:col-span-2">
                    <label htmlFor="empresa" className="block text-sm font-medium text-text-secondary mb-1">Empresa</label>
                    <input
                        id="empresa"
                        type="text"
                        name="empresa"
                        value={editingPagamento.empresa}
                        onChange={handleInputChange}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="tipo" className="block text-sm font-medium text-text-secondary mb-1">Banco</label>
                    <select
                        id="tipo"
                        name="tipo"
                        value={editingPagamento.tipo}
                        onChange={handleInputChange}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        {BANK_OPTIONS.map(banco => (
                            <option key={banco} value={banco}>{banco}</option>
                        ))}
                    </select>
                </div>
                <div>
                  <label htmlFor="receitas" className="block text-sm font-medium text-text-secondary mb-1">Receitas (R$)</label>
                  <input id="receitas" type="text" name="receitas" value={formatCurrency(editingPagamento.receitas)} onChange={handleInputChange} className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary ${errors.receitas ? 'border-danger' : 'border-border'}`}/>
                  {errors.receitas && <p className="text-danger text-xs mt-1">{errors.receitas}</p>}
                </div>
                <div>
                  <label htmlFor="despesas" className="block text-sm font-medium text-text-secondary mb-1">Despesas (R$)</label>
                  <input id="despesas" type="text" name="despesas" value={formatCurrency(editingPagamento.despesas)} onChange={handleInputChange} className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary ${errors.despesas ? 'border-danger' : 'border-border'}`}/>
                   {errors.despesas && <p className="text-danger text-xs mt-1">{errors.despesas}</p>}
                </div>
                <div>
                  <label htmlFor="envia" className="block text-sm font-medium text-text-secondary mb-1">Envia (R$)</label>
                  <input id="envia" type="text" name="envia" value={formatCurrency(editingPagamento.envia)} onChange={handleInputChange} className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary ${errors.envia ? 'border-danger' : 'border-border'}`}/>
                   {errors.envia && <p className="text-danger text-xs mt-1">{errors.envia}</p>}
                </div>
                 <div>
                  <label htmlFor="recebe" className="block text-sm font-medium text-text-secondary mb-1">Recebe (R$)</label>
                  <input id="recebe" type="text" name="recebe" value={formatCurrency(editingPagamento.recebe)} onChange={handleInputChange} className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary ${errors.recebe ? 'border-danger' : 'border-border'}`}/>
                  {errors.recebe && <p className="text-danger text-xs mt-1">{errors.recebe}</p>}
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <button onClick={handleCloseModal} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button>
                <button onClick={handleSaveChanges} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}

        {isConfirmOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-sm">
                    <h3 className="text-lg font-bold mb-4 text-text-primary">Confirmar Ação</h3>
                    <p className="text-text-secondary mb-6">{confirmAction.message}</p>
                     <div className="flex justify-end gap-4">
                        <button onClick={handleCancelConfirm} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button>
                        <button onClick={handleConfirm} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Confirmar</button>
                     </div>
                </div>
            </div>
        )}
      </div>
    );
};

export default PagamentosCristiano;