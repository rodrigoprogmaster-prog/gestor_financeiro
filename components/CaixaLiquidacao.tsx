
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeftIcon, DownloadIcon, SearchIcon, PlusIcon, TrashIcon, CalculatorIcon } from './icons';

interface CaixaLiquidacaoProps {
    title: string;
    storageKey: string;
    onBack: () => void;
}

// Predefined lists
const COMPANIES_CRISTIANO = [
    'FIBER ANEL - CACHOEIRINHA',
    'CAMARGOS PISCINAS E SPAS LTDA',
    'FIBER ADM DE FRANQUIAS',
    'WORLD WIDE SWIMMINGPOOLS',
    'ZMR PISCINAS LTDA'
];

const COMPANIES_FABRICA = [
    'FIBER HIDROMASSAGENS',
    'LLS SERVIÇOS DE LIMPEZA',
    'CSJ INDUSTRIA',
    'LOPC INDUSTRIA',
    'MMA INDUSTRIA',
    'PXT INDUSTRIA',
    'SJB COMERCIO'
];

const applyMonthMask = (val: string) => {
    return val.replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1/$2')
        .slice(0, 7);
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const CaixaLiquidacao: React.FC<CaixaLiquidacaoProps> = ({ title, storageKey, onBack }) => {
    // Current Month (MM/YYYY)
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${month}/${year}`;
    });

    // Data Structure: { "MM/YYYY": { "Company Name": 1234.56, ... } }
    const [allData, setAllData] = useState<Record<string, Record<string, number>>>(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : {};
    });

    // Custom Companies List
    const [customCompanies, setCustomCompanies] = useState<string[]>(() => {
        const saved = localStorage.getItem(`${storageKey}_companies`);
        return saved ? JSON.parse(saved) : (storageKey.includes('cristiano') ? COMPANIES_CRISTIANO : COMPANIES_FABRICA);
    });

    const [newCompany, setNewCompany] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(allData));
    }, [allData, storageKey]);

    useEffect(() => {
        localStorage.setItem(`${storageKey}_companies`, JSON.stringify(customCompanies));
    }, [customCompanies, storageKey]);

    const currentBalances = useMemo(() => {
        return allData[currentMonth] || {};
    }, [allData, currentMonth]);

    const totalGeral = useMemo(() => {
        return Object.values(currentBalances).reduce((acc: number, val: number) => acc + val, 0);
    }, [currentBalances]);

    const handleBalanceChange = (company: string, rawValue: string) => {
        let numericValue = rawValue.replace(/\D/g, '');
        const value = Number(numericValue) / 100;

        setAllData(prev => ({
            ...prev,
            [currentMonth]: {
                ...(prev[currentMonth] || {}),
                [company]: value
            }
        }));
    };

    const handleAddCompany = () => {
        if (newCompany.trim() && !customCompanies.includes(newCompany.trim().toUpperCase())) {
            setCustomCompanies(prev => [...prev, newCompany.trim().toUpperCase()]);
            setNewCompany('');
            setIsAddModalOpen(false);
        }
    };

    const handleDeleteCompany = (company: string) => {
        if (confirm(`Deseja remover "${company}" da lista? Os dados históricos serão mantidos.`)) {
            setCustomCompanies(prev => prev.filter(c => c !== company));
        }
    };

    const handleExport = () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) { alert("Biblioteca XLSX não carregada."); return; }

        const dataToExport = customCompanies.map(company => ({
            'Empresa': company,
            'Saldo': currentBalances[company] || 0
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        
        // Format Currency Column
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = 1; R <= range.e.r; ++R) {
            const cellRef = XLSX.utils.encode_cell({c: 1, r: R});
            if(ws[cellRef]) {
                ws[cellRef].t = 'n';
                ws[cellRef].z = 'R$ #,##0.00';
            }
        }

        XLSX.utils.sheet_add_aoa(ws, [[null, 'Total:', totalGeral]], { origin: -1 });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Caixa ${currentMonth.replace('/', '-')}`);
        XLSX.writeFile(wb, `caixa_liquidacao_${currentMonth.replace('/', '-')}.xlsx`);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10 text-sm shadow-sm">
                        <ArrowLeftIcon className="h-4 w-4" />
                        Voltar
                    </button>
                    <h3 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-white border border-border rounded-xl px-3 py-1.5 flex items-center shadow-sm h-10">
                        <span className="text-xs font-bold text-text-secondary uppercase mr-2">Mês:</span>
                        <input 
                            type="text" 
                            value={currentMonth} 
                            onChange={(e) => setCurrentMonth(applyMonthMask(e.target.value))}
                            placeholder="MM/AAAA"
                            className="w-20 bg-transparent text-sm font-bold text-text-primary focus:outline-none text-center"
                            maxLength={7}
                        />
                    </div>
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-white border border-gray-300 text-success font-bold py-2 px-4 rounded-full hover:bg-green-50 transition-colors h-10 text-sm shadow-sm"
                    >
                        <DownloadIcon className="h-4 w-4" /> Exportar
                    </button>
                </div>
            </div>

            {/* Summary Card */}
            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm mb-6 flex items-center justify-between shrink-0 max-w-md">
                <div>
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Saldo Total ({currentMonth})</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totalGeral)}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                    <CalculatorIcon className="h-6 w-6 text-primary" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex-grow flex flex-col">
                <div className="overflow-auto flex-grow">
                    <table className="min-w-full divide-y divide-border text-sm text-left">
                        <thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3">Empresa</th>
                                <th className="px-6 py-3 text-right">Saldo em Caixa</th>
                                <th className="px-6 py-3 text-center w-20">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                            {customCompanies.map((company) => (
                                <tr key={company} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-text-primary">{company}</td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="relative inline-block w-full max-w-[200px]">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">R$</span>
                                            <input 
                                                type="text"
                                                value={(currentBalances[company] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                onChange={(e) => handleBalanceChange(company, e.target.value)}
                                                className="w-full bg-secondary/50 border border-transparent hover:border-border focus:border-primary focus:bg-white rounded-lg py-1.5 pl-10 pr-3 text-right font-medium outline-none transition-all"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <button 
                                            onClick={() => handleDeleteCompany(company)}
                                            className="p-1.5 rounded-full text-gray-400 hover:text-danger hover:bg-danger/10 transition-colors"
                                            title="Remover empresa"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {/* Add Button Row */}
                            <tr>
                                <td colSpan={3} className="px-6 py-3 text-center border-t border-dashed border-border">
                                    {isAddModalOpen ? (
                                        <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
                                            <input 
                                                type="text" 
                                                value={newCompany}
                                                onChange={(e) => setNewCompany(e.target.value)}
                                                placeholder="Nome da nova empresa..."
                                                className="flex-grow bg-white border border-primary rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                                                autoFocus
                                            />
                                            <button onClick={handleAddCompany} className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-primary-hover">Salvar</button>
                                            <button onClick={() => setIsAddModalOpen(false)} className="text-text-secondary hover:text-text-primary px-2 text-sm">Cancelar</button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setIsAddModalOpen(true)}
                                            className="text-primary hover:text-primary-hover font-semibold text-sm flex items-center justify-center gap-2 py-1"
                                        >
                                            <PlusIcon className="h-4 w-4" /> Adicionar Empresa
                                        </button>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
