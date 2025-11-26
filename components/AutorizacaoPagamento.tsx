
import React, { useState, useEffect, useMemo } from 'react';
import { DownloadIcon } from './icons';

// Interfaces for data structure
interface AuthValues {
  solinterTotal: number;
  solinterLancamentos: number;
  interTotal: number;
  interLancamentos: number;
  interBoletoInvalido: number; // Generic adjustment 1 (Inter)
  interDesconto: number;       // Generic adjustment 2 (Inter)
  
  // New Section for BB (Fabrica)
  bbTotal: number;
  bbLancamentos: number;

  // Used for "Banco Inter WW" (Cristiano) OR "Banco Santander PXT" (Fabrica)
  santanderTotal: number;
  santanderLancamentos: number;
  santanderCartaoCredito: number; // Generic adjustment
}

interface AuthLabels {
  solinterTitle: string;
  interTitle: string;
  interBoletoInvalidoLabel: string;
  interDescontoLabel: string;
  
  bbTitle: string; // New Label

  santanderTitle: string;
  santanderCartaoCreditoLabel: string;
}

interface AuthDayData {
    values: AuthValues;
    labels: AuthLabels;
}

type AuthHistory = Record<string, AuthDayData>;

interface AutorizacaoPagamentoProps {
  storageKeySuffix?: string;
}

const initialDayData: AuthDayData = {
    values: {
        solinterTotal: 0,
        solinterLancamentos: 0,
        interTotal: 0,
        interLancamentos: 0,
        interBoletoInvalido: 0,
        interDesconto: 0,
        bbTotal: 0,
        bbLancamentos: 0,
        santanderTotal: 0,
        santanderLancamentos: 0,
        santanderCartaoCredito: 0,
    },
    labels: {
        solinterTitle: "1) Solinter",
        interTitle: "2) Banco Inter",
        interBoletoInvalidoLabel: "Ajustes / Tarifas",
        interDescontoLabel: "Outros Ajustes",
        bbTitle: "3) Banco do Brasil LOPC (pagos)",
        santanderTitle: "3) Banco Santander",
        santanderCartaoCreditoLabel: "Ajustes / Tarifas",
    }
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Updated parser to handle negative numbers correctly
const parseCurrency = (value: string): number => {
    const isNegative = value.includes('-');
    let numericValue = value.replace(/[^\d]/g, '');
    if (numericValue === '') return 0;
    let number = Number(numericValue) / 100;
    return isNegative ? -number : number;
};

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

// Styled Input Component matching the image look (clean, spreadsheet-like)
const FormattedInput: React.FC<{
    name: keyof AuthValues, 
    value: number, 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    className?: string
}> = ({ name, value, onChange, className }) => (
    <input
        type="text"
        name={name}
        value={formatCurrency(value)}
        onChange={onChange}
        className={`w-full text-right bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-text-primary transition-colors px-1 ${value < 0 ? 'text-danger' : ''} ${className}`}
    />
);

const NumberInput: React.FC<{
    name: keyof AuthValues, 
    value: number, 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}> = ({ name, value, onChange }) => (
    <input
        type="number"
        name={name}
        value={value === 0 ? '' : value}
        onChange={onChange}
        placeholder="0"
        className="w-full text-right bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-text-primary transition-colors px-1"
    />
);

const EditableLabel: React.FC<{
    name: keyof AuthLabels, 
    value: string, 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, 
    className?: string
}> = ({ name, value, onChange, className }) => (
    <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full bg-transparent focus:outline-none focus:bg-white/50 rounded px-1 ${className}`}
    />
);

const AutorizacaoPagamento: React.FC<AutorizacaoPagamentoProps> = ({ storageKeySuffix = '' }) => {
  const LOCAL_STORAGE_KEY_AUTH = `autorizacao_pagamento_data${storageKeySuffix}`;
  const isFabrica = storageKeySuffix.includes('fabrica');
  const isCristiano = storageKeySuffix.includes('cristiano');

  const [allData, setAllData] = useState<AuthHistory>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_AUTH);
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_AUTH, JSON.stringify(allData));
  }, [allData, LOCAL_STORAGE_KEY_AUTH]);

  const currentData = useMemo(() => {
    const savedDayData = allData[selectedDate];
    
    // Define specific defaults based on context
    let contextLabels = { ...initialDayData.labels };
    
    if (isCristiano) {
        contextLabels = {
            ...contextLabels,
            solinterTitle: "1) Solinter",
            interTitle: "2) Banco Inter lojas",
            interBoletoInvalidoLabel: "Menos Compra Carmo, Daniela pagou com cartão Camargos",
            interDescontoLabel: "Outros Ajustes",
            santanderTitle: "3) Banco Inter WW",
            santanderCartaoCreditoLabel: "Ajustes / Tarifas",
        };
    } else if (isFabrica) {
        contextLabels = {
            ...contextLabels,
            solinterTitle: "1) Solinter",
            interTitle: "2) Banco Inter (Aprovar)",
            bbTitle: "3) Banco do Brasil LOPC (pagos)",
            santanderTitle: "3) Banco Santander PXT (pagos)",
            santanderCartaoCreditoLabel: "Ajustes",
        };
    }

    // Merge saved data with context defaults (saved data takes precedence for values, but defaults for labels if not saved)
    const mergedValues = { ...initialDayData.values, ...(savedDayData?.values || {}) };
    const mergedLabels = { ...contextLabels, ...(savedDayData?.labels || {}) };

    return {
        values: mergedValues,
        labels: mergedLabels,
    };
  }, [allData, selectedDate, isCristiano, isFabrica]);
  
  const updateState = (type: 'values' | 'labels', name: string, value: string | number) => {
    const updatedDayData = {
        ...currentData,
        [type]: {
            ...currentData[type],
            [name]: value
        }
    };

    setAllData(prev => ({
        ...prev,
        [selectedDate]: updatedDayData
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'values' | 'labels') => {
    const { name, value } = e.target;
    
    if(type === 'labels'){
        updateState('labels', name, value);
        return;
    }
    
    if (name.includes('Lancamentos')) {
        updateState('values', name, parseInt(value, 10) || 0);
    } else {
        updateState('values', name, parseCurrency(value));
    }
  };
  
  const calculations = useMemo(() => {
      const { values } = currentData;
      // Logic: Summing all inputs in the group (negatives are entered as negatives)
      const totalInterCalculado = values.interTotal + values.interBoletoInvalido + values.interDesconto;
      const totalBBCalculado = isFabrica ? values.bbTotal : 0;
      const totalSantanderCalculado = values.santanderTotal + values.santanderCartaoCredito;
      
      // Solinter - (Inter + BB + Santander/InterWW)
      const diferencaValor = values.solinterTotal - totalInterCalculado - totalBBCalculado - totalSantanderCalculado;
      const diferencaLancamentos = values.solinterLancamentos - values.interLancamentos - (isFabrica ? values.bbLancamentos : 0) - values.santanderLancamentos;

      return { diferencaValor, diferencaLancamentos, totalInterCalculado, totalBBCalculado, totalSantanderCalculado };
  }, [currentData, isFabrica]);

  const handleExportXLSX = () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) { alert("Erro: A biblioteca de exportação não foi carregada."); return; }

    const { values, labels } = currentData;
    const { diferencaValor, diferencaLancamentos, totalInterCalculado, totalBBCalculado, totalSantanderCalculado } = calculations;
    
    const data: any[][] = [
        [`APROVAÇÃO - ${formatDateToBR(selectedDate)}`, null, null], 
        [],
        [labels.solinterTitle],
        ['Lançamentos', values.solinterLancamentos],
        ['Total', values.solinterTotal],
        [],
        [labels.interTitle],
        ['Lançamentos', values.interLancamentos],
        ['Total', values.interTotal],
        [labels.interBoletoInvalidoLabel, values.interBoletoInvalido],
        [labels.interDescontoLabel, values.interDesconto],
        ['Subtotal Inter', totalInterCalculado],
        []
    ];

    if (isFabrica) {
        data.push(
            [labels.bbTitle],
            ['Lançamentos', values.bbLancamentos],
            ['Total', values.bbTotal],
            [],
        );
    }

    data.push(
        [labels.santanderTitle],
        ['Lançamentos', values.santanderLancamentos],
        ['Total', values.santanderTotal],
        [labels.santanderCartaoCreditoLabel, values.santanderCartaoCredito],
        ['Subtotal', totalSantanderCalculado],
        [],
        ['DIFERENÇA VALOR', diferencaValor],
        ['DIFERENÇA LANÇAMENTOS', diferencaLancamentos]
    );

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Formatting
    const range = XLSX.utils.decode_range(ws['!ref']);
    for(let R = 0; R <= range.e.r; ++R) {
        const cellRef = XLSX.utils.encode_cell({c: 1, r: R}); // Check column B (index 1)
        if (ws[cellRef] && typeof ws[cellRef].v === 'number' && R !== 3 && R !== 7 && R !== 13 && R !== 20) { // Rudimentary check to skip Lancamentos counts based on fixed layout assumptions or just apply currency to everything in Col B > 100 maybe?
             // Easier: just check specific cells or apply to all numbers in column B
             // Let's just apply to all numbers in Col B for now, assuming counts are small integers and values are large? No, unsafe.
             // Let's stick to formatting specific cells is tricky dynamically.
             // We can iterate and check if label in Col A is 'Lançamentos', then skip formatting.
             const labelRef = XLSX.utils.encode_cell({c: 0, r: R});
             if(ws[labelRef] && ws[labelRef].v !== 'Lançamentos' && ws[labelRef].v !== 'DIFERENÇA LANÇAMENTOS') {
                 ws[cellRef].z = 'R$ #,##0.00';
             }
        }
    }

    ws['!cols'] = [{ wch: 50 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Aprovação');
    XLSX.writeFile(wb, `aprovacao_pagamento_${storageKeySuffix}_${selectedDate}.xlsx`);
  };

  return (
    <div className="animate-fade-in p-4 lg:p-8 w-full max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-text-primary uppercase tracking-wider">
                    Aprovação ({isFabrica ? 'Fábrica' : isCristiano ? 'Cristiano' : 'Geral'}) - {formatDateToBR(selectedDate)}
                </h2>
            </div>
            <div className="flex items-center gap-4">
                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                    onClick={handleExportXLSX}
                    className="flex items-center gap-2 bg-secondary text-text-primary font-medium py-1.5 px-4 rounded-full hover:bg-border transition-colors text-sm"
                >
                    <DownloadIcon className="h-4 w-4" />
                    Exportar
                </button>
            </div>
        </div>

        <div className="bg-white border border-border shadow-md rounded-none overflow-hidden text-sm">
            {/* SECTION 1: Solinter */}
            <div className="border-b border-border">
                <div className="bg-secondary/20 px-4 py-2 font-bold text-text-primary">
                    <EditableLabel name="solinterTitle" value={currentData.labels.solinterTitle} onChange={(e) => handleInputChange(e, 'labels')} className="font-bold" />
                </div>
                <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                    <span className="text-text-secondary">Lançamentos</span>
                    <div className="w-24">
                        <NumberInput name="solinterLancamentos" value={currentData.values.solinterLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                    </div>
                </div>
                <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-text-primary font-medium">Total</span>
                    <div className="w-32">
                        <FormattedInput name="solinterTotal" value={currentData.values.solinterTotal} onChange={(e) => handleInputChange(e, 'values')} className="font-medium" />
                    </div>
                </div>
            </div>

            {/* SECTION 2: Banco Inter */}
            <div className="border-b border-border mt-4">
                <div className="bg-secondary/20 px-4 py-2 font-bold text-text-primary">
                    <EditableLabel name="interTitle" value={currentData.labels.interTitle} onChange={(e) => handleInputChange(e, 'labels')} className="font-bold" />
                </div>
                <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                    <span className="text-text-secondary">Lançamentos</span>
                    <div className="w-24">
                        <NumberInput name="interLancamentos" value={currentData.values.interLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                    </div>
                </div>
                <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                    <span className="text-text-primary font-medium">Total</span>
                    <div className="w-32">
                        <FormattedInput name="interTotal" value={currentData.values.interTotal} onChange={(e) => handleInputChange(e, 'values')} className="font-medium" />
                    </div>
                </div>
                {/* Generic Row 1 for Deductions/Adjustments (Shown for Cristiano, Optional for Fabrica) */}
                {(isCristiano || currentData.values.interBoletoInvalido !== 0) && (
                    <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                        <div className="flex-grow mr-4">
                            <EditableLabel name="interBoletoInvalidoLabel" value={currentData.labels.interBoletoInvalidoLabel} onChange={(e) => handleInputChange(e, 'labels')} className="text-text-secondary w-full" />
                        </div>
                        <div className="w-32">
                            <FormattedInput name="interBoletoInvalido" value={currentData.values.interBoletoInvalido} onChange={(e) => handleInputChange(e, 'values')} />
                        </div>
                    </div>
                )}
                 {/* Generic Row 2 for Deductions/Adjustments (Hidden if 0 and empty label, optional logic) */}
                 {(currentData.values.interDesconto !== 0 || currentData.labels.interDescontoLabel !== 'Outros Ajustes') && (
                    <div className="px-4 py-2 flex items-center justify-between">
                        <div className="flex-grow mr-4">
                            <EditableLabel name="interDescontoLabel" value={currentData.labels.interDescontoLabel} onChange={(e) => handleInputChange(e, 'labels')} className="text-text-secondary w-full" />
                        </div>
                        <div className="w-32">
                            <FormattedInput name="interDesconto" value={currentData.values.interDesconto} onChange={(e) => handleInputChange(e, 'values')} />
                        </div>
                    </div>
                 )}
            </div>

            {/* SECTION 3: BB (Fábrica Only) */}
            {isFabrica && (
                <div className="border-b border-border mt-4">
                    <div className="bg-secondary/20 px-4 py-2 font-bold text-text-primary">
                        <EditableLabel name="bbTitle" value={currentData.labels.bbTitle} onChange={(e) => handleInputChange(e, 'labels')} className="font-bold" />
                    </div>
                    <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                        <span className="text-text-secondary">Lançamentos</span>
                        <div className="w-24">
                            <NumberInput name="bbLancamentos" value={currentData.values.bbLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                        </div>
                    </div>
                    <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                        <span className="text-text-primary font-medium">Total</span>
                        <div className="w-32">
                            <FormattedInput name="bbTotal" value={currentData.values.bbTotal} onChange={(e) => handleInputChange(e, 'values')} className="font-medium" />
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 4 (or 3): Santander / Inter WW */}
            <div className="border-b border-border mt-4">
                <div className="bg-secondary/20 px-4 py-2 font-bold text-text-primary">
                    <EditableLabel name="santanderTitle" value={currentData.labels.santanderTitle} onChange={(e) => handleInputChange(e, 'labels')} className="font-bold" />
                </div>
                <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                    <span className="text-text-secondary">Lançamentos</span>
                    <div className="w-24">
                        <NumberInput name="santanderLancamentos" value={currentData.values.santanderLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                    </div>
                </div>
                <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                    <span className="text-text-primary font-medium">Total</span>
                    <div className="w-32">
                        <FormattedInput name="santanderTotal" value={currentData.values.santanderTotal} onChange={(e) => handleInputChange(e, 'values')} className="font-medium" />
                    </div>
                </div>
                 {/* Generic Row for Deductions/Adjustments */}
                 {(currentData.values.santanderCartaoCredito !== 0 || (currentData.labels.santanderCartaoCreditoLabel !== 'Ajustes / Tarifas' && currentData.labels.santanderCartaoCreditoLabel !== 'Ajustes')) && (
                    <div className="px-4 py-2 flex items-center justify-between">
                        <div className="flex-grow mr-4">
                            <EditableLabel name="santanderCartaoCreditoLabel" value={currentData.labels.santanderCartaoCreditoLabel} onChange={(e) => handleInputChange(e, 'labels')} className="text-text-secondary w-full" />
                        </div>
                        <div className="w-32">
                            <FormattedInput name="santanderCartaoCredito" value={currentData.values.santanderCartaoCredito} onChange={(e) => handleInputChange(e, 'values')} />
                        </div>
                    </div>
                 )}
            </div>

            {/* FOOTER: Summary (Yellow Box) */}
            <div className="bg-yellow-300 border-t border-yellow-400 p-4 flex flex-col items-end justify-center gap-1">
                <div className="flex items-center gap-4 w-full justify-end">
                    <span className="text-yellow-900 font-bold text-lg">{formatCurrency(calculations.diferencaValor)}</span>
                </div>
                <div className="flex items-center gap-4 w-full justify-end">
                    <span className="text-yellow-800 font-semibold text-sm">{calculations.diferencaLancamentos}</span>
                </div>
            </div>
        </div>
        
        <div className="mt-4 text-xs text-text-secondary text-center">
            * Valores negativos podem ser inseridos digitando o sinal de menos (-) antes do número.
        </div>
    </div>
  );
};

export default AutorizacaoPagamento;
