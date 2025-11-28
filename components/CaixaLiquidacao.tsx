
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeftIcon, PlusIcon, SearchIcon } from './icons';

// Data structure
interface SaldoEmpresa {
    empresa: string;
    saldo: number;
}

// Helper function
const applyMonthYearMask = (value: string): string => {
    let maskedValue = value.replace(/\D/g, '');
    if (maskedValue.length > 2) {
        maskedValue = `${maskedValue.slice(0, 2)}/${maskedValue.slice(2, 6)}`;
    }
    return maskedValue;
};

const formatNumericStringToCurrency = (numericString: string): string => {
    if (!numericString) return 'R$ 0,00';
    const numberValue = Number(numericString) / 100;
    return numberValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};


// Predefined company lists
const EMPRESAS_CRISTIANO = [
    'FIBER ADM DE FRANQUIAS ITAU', 'WORLD WIDE ITAU', 'CACHOEIRINHA PISCINAS', 
    'CAMARGOS PISCINAS E SPAS LTDA', 'IPR INDUSTRIA E COMERCIO DE PLASTIC', 'ZMR PISCINAS LTDA.',
    'WORLD WIDE SWIMMINGPOOLS NEGOCIOS D'
];

const EMPRESAS_FABRICA = [
    'FIBER HIDROMASSAGENS INDUSTRIA E COMERCIO LTDA-ME', 'LLS SERVIÇOS DE LIMPEZA EIRELI',
    'CSJ INDUSTRIA E COMERCIO DE PLASTIC', 'LOPC INDUSTRIA E COMERCIO DE PLASTICOS REFORÇADOS',
    'MMA INDUSTRIA DE PLASTICOS REFORCAD', 'PXT INDUSTRIA E COMERCIO DE PLASTIC',
    'SJB COMERCIO E INDUSTRIA DE PISCINAS LTDA'
];

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CaixaLiquidacaoProps {
    storageKey: string;
    title: string;
    onBack: () => void;
}

export const CaixaLiquidacao: React.FC<CaixaLiquidacaoProps> = ({ storageKey, title, onBack }) => {
    const isCristiano = storageKey.includes('cristiano');
    const empresaList = isCristiano ? EMPRESAS_CRISTIANO : EMPRESAS_FABRICA;

    const [allSaldos, setAllSaldos] = useState<Record<string, Record<string, number>>>(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : {};
    });
    
    const [mesReferencia, setMesReferencia] = useState('');
    const [mesReferenciaError, setMesReferenciaError] = useState('');

    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<string>(''); // Will store raw digits, e.g., "12345"
    const inputRef = useRef<HTMLInputElement>(null);
    const mesRefInputRef = useRef<HTMLInputElement>(null);
    
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(allSaldos));
    }, [allSaldos, storageKey]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === '+') {
                event.preventDefault();
                if (mesRefInputRef.current) {
                    mesRefInputRef.current.focus();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingCell]);
    
    const tableData: SaldoEmpresa[] = useMemo(() => {
        if (!mesReferencia || !allSaldos[mesReferencia]) {
            return [];
        }
        return empresaList.map(empresa => ({
            empresa,
            saldo: allSaldos[mesReferencia][empresa] || 0
        }));
    }, [empresaList, allSaldos, mesReferencia]);
    
    const handleCellClick = (empresa: string, saldo: number) => {
        setEditingCell(empresa);
        // Convert number to raw digit string
        setEditingValue(String(Math.round(saldo * 100)));
    };

    const handleSaldoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Store only digits from input
        const numericValue = e.target.value.replace(/\D/g, '');
        setEditingValue(numericValue);
    };

    const handleInputBlur = () => {
        if (editingCell) {
            // Convert raw digit string back to number
            const numberValue = Number(editingValue) / 100 || 0;
            
            setAllSaldos(prev => {
                const newAllSaldos = { ...prev };
                if (!newAllSaldos[mesReferencia]) {
                    newAllSaldos[mesReferencia] = {};
                }
                newAllSaldos[mesReferencia] = {
                    ...newAllSaldos[mesReferencia],
                    [editingCell]: numberValue
                };
                return newAllSaldos;
            });
        }
        setEditingCell(null);
        setEditingValue('');
    };
    
    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            handleInputBlur();
        }
    };
    
    const handleMesReferenciaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (mesReferenciaError) setMesReferenciaError('');
        setMesReferencia(applyMonthYearMask(e.target.value));
    };

    const handleGenerateMonth = () => {
        const monthRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;
        if (!mesReferencia.trim()) {
            setMesReferenciaError('Por favor, insira o Mês/Ano.');
            return;
        }
        if (!monthRegex.test(mesReferencia.trim())) {
            setMesReferenciaError('Formato inválido. Use MM/AAAA (ex: 08/2024).');
            return;
        }
        
        setMesReferenciaError('');
        
        if (allSaldos[mesReferencia.trim()]) {
            alert('Lançamentos para este mês já existem. O filtro foi aplicado.');
            return;
        }

        const action = () => {
            const newMonthSaldos: Record<string, number> = {};
            empresaList.forEach(empresa => {
                newMonthSaldos[empresa] = 0;
            });
            setAllSaldos(prev => ({
                ...prev,
                [mesReferencia.trim()]: newMonthSaldos
            }));
        };
        
        setConfirmAction({
            action,
            message: `Deseja gerar os lançamentos do caixa de liquidação para o mês de referência "${mesReferencia.trim()}"?`
        });
        setIsConfirmOpen(true);
    };
    
    const handleConfirm = () => {
        if (confirmAction.action) confirmAction.action();
        setIsConfirmOpen(false);
        setConfirmAction({ action: null, message: '' });
    };

    const handleCancelConfirm = () => {
        setIsConfirmOpen(false);
        setConfirmAction({ action: null, message: '' });
    };

    return (
        <div className="animate-fade-in p-4 sm:p-6 lg:p-8 w-full">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10">
                    <ArrowLeftIcon className="h-5 w-5" />
                    Voltar
                </button>
                <h3 className="text-xl md:text-2xl font-bold text-text-primary">{title}</h3>
            </div>
            
             <div className="flex flex-col sm:flex-row justify-end items-center mb-6 gap-4">
                <div className="flex flex-col w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        <input
                            ref={mesRefInputRef}
                            type="text"
                            value={mesReferencia}
                            onChange={handleMesReferenciaChange}
                            placeholder="Filtrar ou Gerar por MM/AAAA"
                            maxLength={7}
                            className={`bg-background border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 h-10 w-full ${mesReferenciaError ? 'border-danger focus:ring-danger' : 'border-border focus:ring-primary'}`}
                        />
                        <button
                            onClick={handleGenerateMonth}
                            className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors duration-300 h-10 whitespace-nowrap"
                        >
                            <PlusIcon className="h-5 w-5" />
                            Gerar Lançamentos
                        </button>
                    </div>
                    {mesReferenciaError && <p className="text-danger text-xs mt-1">{mesReferenciaError}</p>}
                </div>
            </div>

            <div className="bg-card shadow-md rounded-2xl overflow-x-auto">
                <table className="w-full text-base text-left text-text-secondary">
                    <thead className="text-sm text-text-primary uppercase bg-secondary">
                        <tr>
                            <th scope="col" className="px-6 py-3 w-3/5">Empresa</th>
                            <th scope="col" className="px-6 py-3 text-right">Saldo</th>
                            <th scope="col" className="px-6 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.length > 0 ? (
                            tableData.map(item => {
                                const status = item.saldo === 0 ? 'Conciliado' : 'Pendente';
                                const isEditing = editingCell === item.empresa;

                                return (
                                    <tr 
                                      key={item.empresa} 
                                      className="bg-card border-b border-border hover:bg-secondary transition-colors duration-200 cursor-pointer"
                                      onClick={() => { if (!isEditing) handleCellClick(item.empresa, item.saldo); }}
                                    >
                                        <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{item.empresa}</td>
                                        <td className="px-6 py-4 text-right font-semibold">
                                            {isEditing ? (
                                                <input
                                                    ref={inputRef}
                                                    type="text"
                                                    value={formatNumericStringToCurrency(editingValue)}
                                                    onChange={handleSaldoChange}
                                                    onBlur={handleInputBlur}
                                                    onKeyDown={handleInputKeyDown}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full bg-yellow-100 text-right font-semibold p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            ) : (
                                                <span className={`${item.saldo >= 0 ? 'text-blue-600' : 'text-danger'}`}>
                                                    {formatCurrency(item.saldo)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status === 'Conciliado' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                                                {status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                         ) : (
                            <tr>
                                <td colSpan={3} className="text-center py-16">
                                     <div className="flex flex-col items-center justify-center text-text-secondary">
                                        <SearchIcon className="w-12 h-12 mb-4 text-gray-300" />
                                        <h3 className="text-xl font-semibold text-text-primary">Nenhum Lançamento Encontrado</h3>
                                        <p className="mt-1">Digite um Mês/Ano e clique em "Gerar Lançamentos" para começar.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {isConfirmOpen && (
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
