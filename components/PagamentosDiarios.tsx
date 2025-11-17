import React, { useState, useMemo, useEffect } from 'react';
import TransferenciasEmpresas from './TransferenciasEmpresas';
import PlanilhaBanco from './PlanilhaBanco'; // Importa o novo componente
import { CalendarClockIcon } from './icons';

// Interface para um lançamento de pagamento
interface Pagamento {
  id: string; // `data-empresa-index` para unicidade
  data: string;
  empresa: string;
  tipo: string;
  receitas: number;
  despesas: number;
  envia: number;
  recebe: number;
}

type PagamentoErrors = Partial<Record<keyof Omit<Pagamento, 'id' | 'data' | 'empresa' | 'tipo'>, string>>;

// Lista pré-definida de empresas baseada na imagem
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

const LOCAL_STORAGE_KEY = 'pagamentos_diarios';

// Funções utilitárias
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getDayOfWeek = (dateString: string): string => {
  if (!dateString) return '';
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const date = new Date(`${dateString}T00:00:00`); // Previne problemas de fuso horário
  return days[date.getDay()];
};

const PagamentosDiarios: React.FC = () => {
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
    const [activeTab, setActiveTab] = useState<'pagamentos' | 'transferencias' | 'inserir_banco'>('pagamentos');

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pagamentos));
    }, [pagamentos]);

    const handleDateSelect = (newDate: string) => {
        if (!newDate) return;
        
        setSelectedDate(newDate);

        const dataExists = pagamentos.some(p => p.data === newDate);
        if (!dataExists) {
            const newEntries = PREDEFINED_ENTRIES.map((entry, index) => ({
                id: `${newDate}-${entry.empresa}-${index}`, // Índice para garantir IDs únicos
                data: newDate,
                empresa: entry.empresa,
                tipo: 'INTER', // Carrega INTER como padrão
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

    const totais = useMemo(() => {
        return dailyData.reduce((acc, item) => {
            acc.receitas += item.receitas;
            acc.despesas += item.despesas;
            acc.envia += item.envia;
            acc.recebe += item.recebe;
            acc.resultado += (item.receitas + item.recebe) - (item.despesas + item.envia);
            return acc;
        }, { receitas: 0, despesas: 0, envia: 0, recebe: 0, resultado: 0 });
    }, [dailyData]);

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


    return (
      <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in">
         <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-6">
            Pagamentos Diários
          </h2>

        <div className="mb-6 border-b border-border">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                    onClick={() => setActiveTab('pagamentos')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'pagamentos' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'}`}
                >
                    Pagamentos
                </button>
                <button
                    onClick={() => setActiveTab('transferencias')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'transferencias' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'}`}
                >
                    Transferências
                </button>
                <button
                    onClick={() => setActiveTab('inserir_banco')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'inserir_banco' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'}`}
                >
                    Inserir no Banco
                </button>
            </nav>
        </div>

        {activeTab === 'pagamentos' && (
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
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold text-text-primary bg-secondary/50 text-base border-t-2 border-primary">
                      <td colSpan={4} className="px-6 py-4 text-right uppercase">Totais:</td>
                      <td className="px-6 py-4 text-right text-success">{formatCurrency(totais.receitas)}</td>
                      <td className="px-6 py-4 text-right text-danger">{formatCurrency(totais.despesas)}</td>
                      <td className="px-6 py-4 text-right text-orange-500">{formatCurrency(totais.envia)}</td>
                      <td className="px-6 py-4 text-right text-blue-500">{formatCurrency(totais.recebe)}</td>
                      <td className={`px-6 py-4 text-right ${totais.resultado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(totais.resultado)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 bg-card rounded-lg shadow-md flex flex-col items-center justify-center">
                <CalendarClockIcon className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-text-primary">Nenhuma Data Selecionada</h3>
                <p className="mt-2 text-text-secondary">Por favor, escolha uma data acima para carregar ou criar os pagamentos do dia.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'transferencias' && <TransferenciasEmpresas />}
        {activeTab === 'inserir_banco' && <PlanilhaBanco />}


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

export default PagamentosDiarios;