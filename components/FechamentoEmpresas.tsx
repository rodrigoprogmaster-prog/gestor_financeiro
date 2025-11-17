import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, EditIcon, SearchIcon, ArrowLeftIcon } from './icons';

// Data structure
interface Fechamento {
  id: string;
  mesReferencia: string;
  empresa: string;
  contabilidade: string;
  portador: string;
  valorBanco: number; // Renamed from valorReceitas
  valorSolinter: number; // Renamed from valorDespesas
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
    
    const [filters, setFilters] = useState({
        mesReferencia: '',
        empresa: '',
        contabilidade: '',
        portador: '',
    });
    const [newMonth, setNewMonth] = useState('');
    const [newMonthError, setNewMonthError] = useState('');

    const isFabrica = storageKey.includes('fabrica');
    const isCristiano = storageKey.includes('cristiano');


    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(fechamentos));
    }, [fechamentos, storageKey]);

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
            setNewMonthError('Por favor, insira o Mês/Ano.');
            return;
        }
        if (!isValidMonthYear(newMonth.trim())) {
            setNewMonthError('Formato inválido. Use MM/AAAA (ex: 08/2024).');
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
        <div className="animate-fade-in p-4 sm:p-6 lg:p-8 w-full">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">
                    <ArrowLeftIcon className="h-5 w-5" />
                    Voltar
                </button>
                <h3 className="text-xl md:text-2xl font-bold text-text-primary">{title}</h3>
            </div>
             <div className="flex flex-col sm:flex-row justify-end items-center mb-6 gap-4">
                 {(isFabrica || isCristiano) && (
                    <div className="flex flex-col w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newMonth}
                                onChange={handleNewMonthChange}
                                placeholder="MM/AAAA"
                                maxLength={7}
                                className={`bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 h-10 w-full ${newMonthError ? 'border-danger focus:ring-danger' : 'border-border focus:ring-primary'}`}
                            />
                            <button
                                onClick={handleGenerateMonth}
                                className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors duration-300 h-10 whitespace-nowrap"
                            >
                                <PlusIcon className="h-5 w-5" />
                                Gerar Lançamentos
                            </button>
                        </div>
                        {newMonthError && <p className="text-danger text-xs mt-1">{newMonthError}</p>}
                    </div>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-secondary/50 rounded-lg">
                <h4 className="font-semibold text-text-primary mr-2">Filtros:</h4>
                <input name="mesReferencia" value={filters.mesReferencia} onChange={handleFilterChange} placeholder="Filtrar por Mês Referência..." className="bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10 flex-grow sm:flex-grow-0" />
                <input name="empresa" value={filters.empresa} onChange={handleFilterChange} placeholder="Filtrar por Empresa..." className="bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10 flex-grow sm:flex-grow-0" />
                <input name="contabilidade" value={filters.contabilidade} onChange={handleFilterChange} placeholder="Filtrar por Contabilidade..." className="bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10 flex-grow sm:flex-grow-0" />
                <input name="portador" value={filters.portador} onChange={handleFilterChange} placeholder="Filtrar por Portador..." className="bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10 flex-grow sm:flex-grow-0" />
                <button onClick={handleClearFilters} className="py-2 px-4 rounded-lg bg-gray-300 hover:bg-gray-400 font-semibold transition-colors h-10">Limpar Filtros</button>
            </div>
            <div className="bg-card shadow-md rounded-lg overflow-x-auto">
                <table className="w-full text-base text-left text-text-secondary">
                    <thead className="text-sm text-text-primary uppercase bg-secondary">
                        <tr>
                            <th scope="col" className="px-6 py-3">Mês Referência</th>
                            <th scope="col" className="px-6 py-3">Empresa</th>
                            <th scope="col" className="px-6 py-3">Contabilidade</th>
                            <th scope="col" className="px-6 py-3">Portador</th>
                            <th scope="col" className="px-6 py-3 text-right">Banco</th>
                            <th scope="col" className="px-6 py-3 text-right">Solinter</th>
                            <th scope="col" className="px-6 py-3 text-right">Saldo</th>
                            <th scope="col" className="px-6 py-3 text-center">Status Conciliação</th>
                            <th scope="col" className="px-6 py-3">Data Envio</th>
                             <th scope="col" className="px-6 py-3 text-center">Status Envio</th>
                            <th scope="col" className="px-6 py-3">Anotações</th>
                            <th scope="col" className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
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
                                      className="bg-card border-b border-border hover:bg-secondary transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4 font-medium">{item.mesReferencia}</td>
                                        <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{item.empresa}</td>
                                        <td className="px-6 py-4">{item.contabilidade}</td>
                                        <td className="px-6 py-4">{item.portador}</td>
                                        <td className="px-6 py-4 text-right text-success font-semibold">{formatCurrency(item.valorBanco)}</td>
                                        <td className="px-6 py-4 text-right text-danger font-semibold">{formatCurrency(item.valorSolinter)}</td>
                                        <td className={`px-6 py-4 text-right font-bold ${saldo === 0 ? 'text-text-primary' : (saldo > 0 ? 'text-success' : 'text-danger')}`}>{formatCurrency(saldo)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusConciliacao === 'Conciliado' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                                                {statusConciliacao}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{formatDateToBR(item.dataEnvio)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusEnvio === 'Enviado' ? 'bg-blue-500/20 text-blue-600' : 'bg-gray-400/20 text-gray-600'}`}>
                                                {statusEnvio}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs truncate" title={item.anotacoes}>{item.anotacoes}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id); }} className="text-danger hover:text-danger/80 p-2 rounded-full hover:bg-danger/10 transition-colors" aria-label="Excluir lançamento">
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                             <tr>
                                <td colSpan={12} className="text-center py-16">
                                     <div className="flex flex-col items-center justify-center text-text-secondary">
                                        <SearchIcon className="w-12 h-12 mb-4 text-gray-300" />
                                        <h3 className="text-xl font-semibold text-text-primary">Nenhum Lançamento Encontrado</h3>
                                        <p className="mt-1">{Object.values(filters).some(f => f) ? 'Tente ajustar sua busca.' : 'Gere um novo mês de lançamentos para começar.'}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {isModalOpen && editingFechamento && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-2xl">
                        <h3 className="text-xl font-bold mb-6 text-text-primary">{editingFechamento.id ? 'Editar Lançamento' : 'Adicionar Lançamento'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Mês Referência <span className="text-danger">*</span></label>
                                <input type="text" name="mesReferencia" placeholder="MM/AAAA" maxLength={7} value={editingFechamento.mesReferencia || ''} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.mesReferencia ? 'border-danger focus:ring-danger focus:border-danger' : 'border-border focus:ring-primary'}`} />
                                {errors.mesReferencia && <p className="text-danger text-xs mt-1">{errors.mesReferencia}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Empresa <span className="text-danger">*</span></label>
                                <input type="text" value={editingFechamento.empresa || ''} disabled={isFabrica || isCristiano} className={`w-full rounded-md px-3 py-2 ${isFabrica || isCristiano ? 'bg-gray-100 border-gray-300 text-text-secondary cursor-not-allowed' : `bg-background border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary ${errors.empresa ? 'border-danger' : 'border-border'}`}`} />
                                {!(isFabrica || isCristiano) && errors.empresa && <p className="text-danger text-xs mt-1">{errors.empresa}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Contabilidade <span className="text-danger">*</span></label>
                                <input type="text" name="contabilidade" value={editingFechamento.contabilidade || ''} onChange={handleInputChange} disabled={isCristiano || isFabrica} className={`w-full rounded-md px-3 py-2 ${isCristiano || isFabrica ? 'bg-gray-100 border-gray-300 text-text-secondary cursor-not-allowed' : `bg-background border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary ${errors.contabilidade ? 'border-danger' : 'border-border'}`}`} />
                                {!(isCristiano || isFabrica) && errors.contabilidade && <p className="text-danger text-xs mt-1">{errors.contabilidade}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Portador <span className="text-danger">*</span></label>
                                 <input type="text" value={editingFechamento.portador || ''} disabled={isFabrica || isCristiano} className={`w-full rounded-md px-3 py-2 ${isFabrica || isCristiano ? 'bg-gray-100 border-gray-300 text-text-secondary cursor-not-allowed' : `bg-background border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary ${errors.portador ? 'border-danger' : 'border-border'}`}`} />
                                {!(isFabrica || isCristiano) && errors.portador && <p className="text-danger text-xs mt-1">{errors.portador}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Valor Banco</label>
                                <input type="text" name="valorBanco" value={formatCurrency(editingFechamento.valorBanco || 0)} onChange={handleInputChange} className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Valor Solinter</label>
                                <input type="text" name="valorSolinter" value={formatCurrency(editingFechamento.valorSolinter || 0)} onChange={handleInputChange} className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                             <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-secondary mb-1">Data de Envio</label>
                                <input type="date" name="dataEnvio" value={editingFechamento.dataEnvio || ''} onChange={handleInputChange} className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-secondary mb-1">Anotações</label>
                                <textarea name="anotacoes" value={editingFechamento.anotacoes || ''} onChange={handleInputChange} rows={3} className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-4">
                            <button onClick={handleCloseModal} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button>
                            <button onClick={handleSaveChanges} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {isDateModalOpen && dateEditingFechamento && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const newDate = formData.get('dataEnvioModal') as string;
                        handleSaveDateEnvio(newDate);
                    }}>
                        <div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-sm">
                            <h3 className="text-lg font-bold mb-4 text-text-primary">Definir Data de Envio</h3>
                            <p className="text-text-secondary mb-4">Para: <span className="font-semibold">{dateEditingFechamento.empresa}</span></p>
                            <div>
                                <label htmlFor="dataEnvioModal" className="block text-sm font-medium text-text-secondary mb-1">Data de Envio</label>
                                <input
                                    id="dataEnvioModal"
                                    type="date"
                                    name="dataEnvioModal"
                                    defaultValue={dateEditingFechamento.dataEnvio || new Date().toISOString().split('T')[0]}
                                    required
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="mt-6 flex justify-end gap-4">
                                <button type="button" onClick={handleCloseDateModal} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button>
                                <button type="submit" className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Salvar Data</button>
                            </div>
                        </div>
                    </form>
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

export default FechamentoEmpresas;