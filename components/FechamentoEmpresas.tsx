
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, ArrowLeftIcon, CalendarClockIcon, RefreshIcon } from './icons';
import DatePicker from './DatePicker';

// Data structure
interface Fechamento {
  id: string;
  mesReferencia: string;
  empresa: string;
  contabilidade: string;
  portador: string;
  valorBanco: number; 
  valorSolinter: number;
  dataEnvio: string; // YYYY-MM-DD
  anotacoes: string;
}

type FechamentoErrors = Partial<Record<keyof Omit<Fechamento, 'id'>, string>>;

const newFechamentoTemplate: Omit<Fechamento, 'id'> = {
    mesReferencia: '',
    empresa: '',
    contabilidade: '',
    portador: '',
    valorBanco: 0,
    valorSolinter: 0,
    dataEnvio: '',
    anotacoes: '',
};

// Helper function
const applyMonthYearMask = (value: string): string => {
    let maskedValue = value.replace(/\D/g, '');
    if (maskedValue.length > 2) {
        maskedValue = `${maskedValue.slice(0, 2)}/${maskedValue.slice(2, 6)}`;
    }
    return maskedValue;
};

const isValidMonthYear = (dateString: string): boolean => {
    return /^(0[1-9]|1[0-2])\/\d{4}$/.test(dateString);
};


// Predefined template for Fábrica entries
const FABRICA_TEMPLATE = [
    { empresa: 'FIBER HIDROMASSAGENS INDUSTRIA E COMERCIO LTDA - ME', portador: 'CX LIQ', contabilidade: 'DIPLOMATA' },
    { empresa: 'LLS SERVIÇOS DE LIMPEZA EIRELI', portador: 'CX LIQ', contabilidade: 'DIPLOMATA' },
    { empresa: 'CSJ INDUSTRIA E COMERCIO DE PLASTIC', portador: 'INTER', contabilidade: 'DIPLOMATA' },
    { empresa: 'LOPC INDUSTRIA E COMERCIO DE PLASTI', portador: 'INTER', contabilidade: 'DIPLOMATA' },
    { empresa: 'MMA INDUSTRIA DE PLASTICOS REFORCAD', portador: 'INTER', contabilidade: 'SV CONTABIL' },
    { empresa: 'PXT INDUSTRIA E COMERCIO DE PLASTIC', portador: 'INTER', contabilidade: 'SV CONTABIL' },
    { empresa: 'SJB COMERCIO E INDUSTRIA DE PISCINA', portador: 'INTER', contabilidade: 'DIPLOMATA' },
    { empresa: 'LOPC INDUSTRIA E COMERCIO DE PLASTICOS REFORÇADOS', portador: 'XP', contabilidade: 'DIPLOMATA' },
    { empresa: 'PXT INDUSTRIA E COMERCIO DE PLASTIC', portador: 'XP', contabilidade: 'SV CONTABIL' },
    { empresa: 'C.S.J INDUSTRIA E COMERCIO DE PLASTICOS REFORCADOS LTDA', portador: 'BB', contabilidade: 'DIPLOMATA' },
    { empresa: 'SJB COMERCIO E INDUSTRIA DE PISCINAS LTDA', portador: 'BB', contabilidade: 'DIPLOMATA' },
    { empresa: 'PXT INDUSTRIA E COMERCIO DE PLASTIC', portador: 'BB', contabilidade: 'SV CONTABIL' },
    { empresa: 'LOPC INDUSTRIA E COMERCIO DE PLASTICOS REFORÇADOS', portador: 'BB', contabilidade: 'DIPLOMATA' },
    { empresa: 'C.S.J INDUSTRIA E COMERCIO DE PLASTICOS REFORCADOS LTDA', portador: 'SANTANDER', contabilidade: 'DIPLOMATA' },
    { empresa: 'PXT INDUSTRIA E COMERCIO DE PLASTIC', portador: 'SANTANDER', contabilidade: 'SV CONTABIL' },
    { empresa: 'SJB COMERCIO E INDUSTRIA DE PISCINAS LTDA', portador: 'SANTANDER', contabilidade: 'DIPLOMATA' },
];

const CRISTIANO_TEMPLATE = [
    { empresa: 'FIBER ANEL - CACHOEIRINHA', portador: 'INTER', contabilidade: 'DIPLOMATA' },
    { empresa: 'CAMARGOS PISCINAS E SPAS LTDA', portador: 'INTER', contabilidade: 'DIPLOMATA' },
    { empresa: 'FIBER ADM DE FRANQUIAS', portador: 'ITAU', contabilidade: 'DIPLOMATA' },
    { empresa: 'WORLD WIDE SWIMMINGPOOLS', portador: 'INTER', contabilidade: 'SV ALMEIDA' },
    { empresa: 'WORLD WIDE SWIMMINGPOOLS', portador: 'ITAU', contabilidade: 'SV ALMEIDA' },
    { empresa: 'ZMR PISCINAS LTDA', portador: 'INTER', contabilidade: 'DIPLOMATA' },
];


const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDateToBR = (dateString: string): string => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

interface FechamentoEmpresasProps {
    storageKey: string;
    title: string;
    onBack: () => void;
}

const FechamentoEmpresas: React.FC<FechamentoEmpresasProps> = ({ storageKey, title, onBack }) => {
    const [fechamentos, setFechamentos] = useState<Fechamento[]>(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFechamento, setEditingFechamento] = useState<Partial<Fechamento> | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [errors, setErrors] = useState<FechamentoErrors>({});
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [dateEditingFechamento, setDateEditingFechamento] = useState<Fechamento | null>(null);
    const [tempDateEnvio, setTempDateEnvio] = useState('');
    
    const [filters, setFilters] = useState({
        mesReferencia: '',
        empresa: '',
        contabilidade: '',
        portador: '',
    });
    const [newMonth, setNewMonth] = useState('');
    const [newMonthError, setNewMonthError] = useState('');
    const newMonthInputRef = useRef<HTMLInputElement>(null);

    const isFabrica = storageKey.includes('fabrica');
    const isCristiano = storageKey.includes('cristiano');


    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(fechamentos));
    }, [fechamentos, storageKey]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === '+') {
                event.preventDefault();
                if (newMonthInputRef.current) {
                    newMonthInputRef.current.focus();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const filteredFechamentos = useMemo(() => {
        return fechamentos.filter(f => {
            const mesMatch = !filters.mesReferencia || f.mesReferencia.toLowerCase().includes(filters.mesReferencia.toLowerCase());
            const empresaMatch = !filters.empresa || f.empresa.toLowerCase().includes(filters.empresa.toLowerCase());
            const contabilidadeMatch = !filters.contabilidade || f.contabilidade.toLowerCase().includes(filters.contabilidade.toLowerCase());
            const portadorMatch = !filters.portador || f.portador.toLowerCase().includes(filters.portador.toLowerCase());
            return mesMatch && empresaMatch && contabilidadeMatch && portadorMatch;
        });
    }, [fechamentos, filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setFilters({ mesReferencia: '', empresa: '', contabilidade: '', portador: '' });
    };

    const handleRowClick = (fechamento: Fechamento) => {
        setErrors({});
        setEditingFechamento({ ...fechamento });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        const action = () => setFechamentos(fechamentos.filter(f => f.id !== id));
        setConfirmAction({ action, message: 'Você tem certeza que deseja excluir este lançamento permanentemente?' });
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingFechamento(null);
        setErrors({});
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (editingFechamento) {
            const { name, value } = e.target;
            let finalValue: string | number = value;

            if (['valorBanco', 'valorSolinter'].includes(name)) {
                let numericValue = value.replace(/\D/g, '');
                if (numericValue === '') numericValue = '0';
                finalValue = Number(numericValue) / 100;
            } else if (name === 'mesReferencia') {
                finalValue = applyMonthYearMask(value);
            }
            
            setEditingFechamento({ ...editingFechamento, [name]: finalValue });

            if (errors[name as keyof FechamentoErrors]) {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[name as keyof FechamentoErrors];
                    return newErrors;
                });
            }
        }
    };

    const validateField = (name: keyof FechamentoErrors, value: any): string | undefined => {
        switch (name) {
            case 'mesReferencia':
                if (!value?.trim()) return 'Mês de Referência é obrigatório.';
                if (!isValidMonthYear(value.trim())) return 'Formato inválido. Use MM/AAAA.';
                return undefined;
            case 'empresa':
                return !value?.trim() ? 'Empresa é obrigatória.' : undefined;
            case 'contabilidade':
                return !value?.trim() ? 'Contabilidade é obrigatória.' : undefined;
            case 'portador':
                return !value?.trim() ? 'Portador é obrigatório.' : undefined;
            default:
                return undefined;
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (editingFechamento) {
            const { name, value } = e.target as { name: keyof FechamentoErrors; value: any };
            const error = validateField(name, value);
            if (error) {
                setErrors(prev => ({ ...prev, [name]: error }));
            }
        }
    };
    
    const validate = (): boolean => {
        if (!editingFechamento) return false;
        const newErrors: FechamentoErrors = {};
        const fieldsToValidate: (keyof FechamentoErrors)[] = ['mesReferencia', 'empresa', 'contabilidade', 'portador'];

        fieldsToValidate.forEach(field => {
            const error = validateField(field, editingFechamento[field as keyof typeof editingFechamento]);
            if (error) {
                newErrors[field as keyof FechamentoErrors] = error;
            }
        });
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveChanges = () => {
        if (!validate()) return;
        if (!editingFechamento) return;

        const action = () => {
            if (editingFechamento.id) { // Edit
                setFechamentos(fechamentos.map(f => f.id === editingFechamento.id ? editingFechamento as Fechamento : f));
            } else { // Add
                const newId = `fech-${storageKey}-${Date.now()}`;
                setFechamentos([...fechamentos, { ...newFechamentoTemplate, ...editingFechamento, id: newId }]);
            }
            handleCloseModal();
        };

        setConfirmAction({
            action,
            message: editingFechamento.id ? 'Deseja salvar as alterações?' : 'Deseja adicionar este novo lançamento?'
        });
        setIsConfirmOpen(true);
    };

    const handleConfirm = () => {
        if (confirmAction.action) confirmAction.action();
        setIsConfirmOpen(false);
    };

    const handleCancelConfirm = () => setIsConfirmOpen(false);

    const handleRowDoubleClick = (fechamento: Fechamento) => {
        setDateEditingFechamento(fechamento);
        setTempDateEnvio(fechamento.dataEnvio || '');
        setIsDateModalOpen(true);
    };
    
    const handleCloseDateModal = () => {
        setIsDateModalOpen(false);
        setDateEditingFechamento(null);
    };

    const handleSaveDateEnvio = (newDate: string) => {
        if (!dateEditingFechamento) return;
        
        const action = () => {
            setFechamentos(prev => prev.map(f =>
                f.id === dateEditingFechamento.id ? { ...f, dataEnvio: newDate } : f
            ));
            handleCloseDateModal();
        };

        setConfirmAction({
            action,
            message: `Deseja definir a data de envio para ${formatDateToBR(newDate)}?`
        });
        setIsConfirmOpen(true);
    };
    
    const handleNewMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (newMonthError) setNewMonthError('');
        setNewMonth(applyMonthYearMask(e.target.value));
    };

    const handleGenerateMonth = () => {
        if (!newMonth.trim()) {
            setNewMonthError('Mês/Ano obrigatório.');
            return;
        }
        if (!isValidMonthYear(newMonth.trim())) {
            setNewMonthError('Use MM/AAAA');
            return;
        }
        
        setNewMonthError('');
        
        if (fechamentos.some(f => f.mesReferencia.toLowerCase() === newMonth.trim().toLowerCase())) {
            alert('Lançamentos para este mês já existem.');
            return;
        }

        const action = () => {
            const template = isFabrica ? FABRICA_TEMPLATE : isCristiano ? CRISTIANO_TEMPLATE : [];
            const newEntries: Fechamento[] = template.map((templateItem, index) => ({
                ...newFechamentoTemplate,
                id: `fech-${storageKey}-${newMonth.trim()}-${index}`,
                mesReferencia: newMonth.trim(),
                empresa: templateItem.empresa,
                portador: templateItem.portador,
                contabilidade: (templateItem as any).contabilidade || '',
            }));
            setFechamentos(prev => [...prev, ...newEntries]);
            setNewMonth('');
        };
        
        setConfirmAction({
            action,
            message: `Deseja gerar os lançamentos para o mês de referência "${newMonth.trim()}"?`
        });
        setIsConfirmOpen(true);
    };

    return (
        <div className="flex flex-col h-full p-4 sm:p-6 lg:p-8 animate-fade-in w-full">
            
            {/* Header Section: Title & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10 text-sm shadow-sm">
                        <ArrowLeftIcon className="h-4 w-4" />
                        Voltar
                    </button>
                    <h3 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">{title}</h3>
                </div>

                {(isFabrica || isCristiano) && (
                    <div className="flex items-start gap-2 w-full md:w-auto">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-border shadow-sm">
                                <input
                                    ref={newMonthInputRef}
                                    type="text"
                                    value={newMonth}
                                    onChange={handleNewMonthChange}
                                    placeholder="MM/AAAA"
                                    maxLength={7}
                                    className={`bg-transparent px-3 py-1.5 text-text-primary focus:outline-none w-24 text-center font-medium ${newMonthError ? 'text-danger placeholder-danger/50' : ''}`}
                                />
                                <button
                                    onClick={handleGenerateMonth}
                                    className="flex items-center gap-2 bg-primary text-white font-semibold py-1.5 px-4 rounded-full hover:bg-primary-hover transition-colors duration-200 text-sm whitespace-nowrap shadow-sm h-8"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    Gerar Lançamentos
                                </button>
                            </div>
                            {newMonthError && <p className="text-danger text-[10px] mt-1 ml-2 font-medium">{newMonthError}</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Filters Section */}
            <div className="bg-white p-3 rounded-2xl border border-border shadow-sm mb-4 shrink-0">
                <div className="flex flex-col lg:flex-row gap-3 items-center">
                    <div className="flex items-center gap-2 text-text-secondary">
                        <SearchIcon className="h-4 w-4" />
                        <span className="text-sm font-semibold">Filtros:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                        <input name="mesReferencia" value={filters.mesReferencia} onChange={handleFilterChange} placeholder="Mês Ref..." className="bg-secondary border-transparent rounded-xl px-3 py-1.5 text-sm text-text-primary focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary h-9 w-full outline-none transition-all" />
                        <input name="empresa" value={filters.empresa} onChange={handleFilterChange} placeholder="Empresa..." className="bg-secondary border-transparent rounded-xl px-3 py-1.5 text-sm text-text-primary focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary h-9 w-full outline-none transition-all" />
                        <input name="contabilidade" value={filters.contabilidade} onChange={handleFilterChange} placeholder="Contabilidade..." className="bg-secondary border-transparent rounded-xl px-3 py-1.5 text-sm text-text-primary focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary h-9 w-full outline-none transition-all" />
                        <div className="flex gap-2">
                            <input name="portador" value={filters.portador} onChange={handleFilterChange} placeholder="Portador..." className="bg-secondary border-transparent rounded-xl px-3 py-1.5 text-sm text-text-primary focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary h-9 w-full outline-none transition-all" />
                            <button onClick={handleClearFilters} className="px-3 py-1.5 rounded-full bg-gray-200 hover:bg-gray-300 text-text-secondary hover:text-text-primary font-medium transition-colors h-9" title="Limpar Filtros">
                                <RefreshIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section - Optimized for space */}
            <div className="flex-grow overflow-hidden bg-card border border-border rounded-2xl shadow-sm flex flex-col">
                <div className="overflow-auto flex-grow">
                    <table className="min-w-full divide-y divide-border text-sm text-left">
                        <thead className="bg-gray-50 text-text-secondary font-semibold uppercase text-xs tracking-wider sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th scope="col" className="px-4 py-3 whitespace-nowrap">Mês Ref.</th>
                                <th scope="col" className="px-4 py-3">Empresa</th>
                                <th scope="col" className="px-4 py-3 whitespace-nowrap">Contabilidade</th>
                                <th scope="col" className="px-4 py-3 whitespace-nowrap">Portador</th>
                                <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">Banco</th>
                                <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">Solinter</th>
                                <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">Saldo</th>
                                <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Conciliação</th>
                                <th scope="col" className="px-4 py-3 whitespace-nowrap">Data Envio</th>
                                <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Envio</th>
                                <th scope="col" className="px-4 py-3 min-w-[150px]">Anotações</th>
                                <th scope="col" className="px-4 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                            {filteredFechamentos.length > 0 ? (
                                filteredFechamentos.map(item => {
                                    const saldo = (item.valorBanco || 0) - (item.valorSolinter || 0);
                                    const statusConciliacao = saldo === 0 ? 'Conciliado' : 'Pendente';
                                    const statusEnvio = item.dataEnvio ? 'Enviado' : 'Pendente';

                                    return (
                                        <tr 
                                          key={item.id} 
                                          onClick={() => handleRowClick(item)}
                                          onDoubleClick={() => handleRowDoubleClick(item)} 
                                          className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-4 py-3 font-medium whitespace-nowrap">{item.mesReferencia}</td>
                                            <td className="px-4 py-3 max-w-[200px] truncate font-medium text-text-primary" title={item.empresa}>{item.empresa}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-text-secondary">{item.contabilidade}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-text-secondary">{item.portador}</td>
                                            <td className="px-4 py-3 text-right text-success font-semibold whitespace-nowrap">{formatCurrency(item.valorBanco)}</td>
                                            <td className="px-4 py-3 text-right text-danger font-semibold whitespace-nowrap">{formatCurrency(item.valorSolinter)}</td>
                                            <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${saldo === 0 ? 'text-gray-400' : (saldo > 0 ? 'text-success' : 'text-danger')}`}>{formatCurrency(saldo)}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusConciliacao === 'Conciliado' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                                                    {statusConciliacao}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-text-secondary text-xs">{formatDateToBR(item.dataEnvio)}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusEnvio === 'Enviado' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                    {statusEnvio}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 max-w-[200px] truncate text-text-secondary text-xs" title={item.anotacoes}>{item.anotacoes}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id); }} className="text-gray-400 hover:text-danger p-1.5 rounded-full hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100" aria-label="Excluir">
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                 <tr>
                                    <td colSpan={12} className="text-center py-20">
                                         <div className="flex flex-col items-center justify-center text-text-secondary opacity-60">
                                            <SearchIcon className="w-10 h-10 mb-3" />
                                            <h3 className="text-base font-medium">Nenhum Lançamento Encontrado</h3>
                                            <p className="text-sm mt-1">{Object.values(filters).some(f => f) ? 'Tente ajustar os filtros.' : 'Gere um novo mês para começar.'}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Footer Summary - Always Visible */}
                <div className="border-t border-border bg-gray-50 p-3 flex justify-between items-center text-xs text-text-secondary px-6 shrink-0">
                    <span>Total de registros: <strong>{filteredFechamentos.length}</strong></span>
                    <span className="italic">Dica: Duplo clique na linha para definir data de envio.</span>
                </div>
            </div>
            
            {/* Edit Modal */}
            {isModalOpen && editingFechamento && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl overflow-visible">
                        <h3 className="text-xl font-bold mb-6 text-text-primary text-center">{editingFechamento.id ? 'Editar Lançamento' : 'Adicionar Lançamento'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Mês Ref. <span className="text-danger">*</span></label>
                                <input type="text" name="mesReferencia" placeholder="MM/AAAA" maxLength={7} value={editingFechamento.mesReferencia || ''} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.mesReferencia ? 'border-danger' : ''}`} />
                                {errors.mesReferencia && <p className="text-danger text-xs mt-1 ml-1">{errors.mesReferencia}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Empresa <span className="text-danger">*</span></label>
                                <input type="text" value={editingFechamento.empresa || ''} disabled={isFabrica || isCristiano} className={`w-full rounded-xl px-4 py-3 h-12 ${isFabrica || isCristiano ? 'bg-gray-100 border-gray-200 text-text-secondary cursor-not-allowed' : `bg-secondary border-transparent text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none ${errors.empresa ? 'border-danger' : ''}`}`} />
                                {!(isFabrica || isCristiano) && errors.empresa && <p className="text-danger text-xs mt-1 ml-1">{errors.empresa}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Contabilidade <span className="text-danger">*</span></label>
                                <input type="text" name="contabilidade" value={editingFechamento.contabilidade || ''} onChange={handleInputChange} disabled={isCristiano || isFabrica} className={`w-full rounded-xl px-4 py-3 h-12 ${isCristiano || isFabrica ? 'bg-gray-100 border-gray-200 text-text-secondary cursor-not-allowed' : `bg-secondary border-transparent text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none ${errors.contabilidade ? 'border-danger' : ''}`}`} />
                                {!(isCristiano || isFabrica) && errors.contabilidade && <p className="text-danger text-xs mt-1 ml-1">{errors.contabilidade}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Portador <span className="text-danger">*</span></label>
                                 <input type="text" value={editingFechamento.portador || ''} disabled={isFabrica || isCristiano} className={`w-full rounded-xl px-4 py-3 h-12 ${isFabrica || isCristiano ? 'bg-gray-100 border-gray-200 text-text-secondary cursor-not-allowed' : `bg-secondary border-transparent text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none ${errors.portador ? 'border-danger' : ''}`}`} />
                                {!(isFabrica || isCristiano) && errors.portador && <p className="text-danger text-xs mt-1 ml-1">{errors.portador}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Valor Banco</label>
                                <input type="text" name="valorBanco" value={formatCurrency(editingFechamento.valorBanco || 0)} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Valor Solinter</label>
                                <input type="text" name="valorSolinter" value={formatCurrency(editingFechamento.valorSolinter || 0)} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12" />
                            </div>
                             <div className="md:col-span-2">
                                <DatePicker 
                                    label="Data de Envio"
                                    value={editingFechamento.dataEnvio || ''} 
                                    onChange={(val) => setEditingFechamento(prev => ({...prev, dataEnvio: val}))} 
                                    placeholder="Selecione"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Anotações</label>
                                <textarea name="anotacoes" value={editingFechamento.anotacoes || ''} onChange={handleInputChange} rows={3} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none" placeholder="Observações..." />
                            </div>
                        </div>
                        <div className="mt-8 flex justify-center gap-3">
                            <button onClick={handleCloseModal} className="px-6 py-3 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleSaveChanges} className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Date Envio Modal */}
            {isDateModalOpen && dateEditingFechamento && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm overflow-visible">
                        <h3 className="text-xl font-bold mb-4 text-text-primary text-center">Data de Envio</h3>
                        <p className="text-text-secondary text-sm mb-6 text-center">Defina a data para <span className="font-semibold text-text-primary block mt-1">{dateEditingFechamento.empresa}</span></p>
                        <div className="mb-8">
                            <DatePicker 
                                label="Selecione a Data"
                                value={tempDateEnvio || ''} 
                                onChange={setTempDateEnvio} 
                                placeholder="DD/MM/AAAA"
                            />
                        </div>
                        <div className="flex justify-center gap-3">
                            <button onClick={handleCloseDateModal} className="px-6 py-2.5 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={() => handleSaveDateEnvio(tempDateEnvio)} className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {isConfirmOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
                        <h3 className="text-xl font-bold mb-4 text-text-primary">Confirmar</h3>
                        <p className="text-text-secondary mb-8">{confirmAction.message}</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={handleCancelConfirm} className="px-6 py-2.5 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleConfirm} className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FechamentoEmpresas;
