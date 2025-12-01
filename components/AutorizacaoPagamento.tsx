import React, { useState, useEffect, useMemo } from 'react';
import { DownloadIcon } from './icons';
import DatePicker from './DatePicker';

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
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Autorização");
    XLSX.writeFile(wb, `autorizacao_pagamento_${selectedDate}.xlsx`);
  };

  return (
    <div className="animate-fade-in flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
                <DatePicker 
                    value={selectedDate} 
                    onChange={setSelectedDate}
                    className="w-40" 
                />
            </div>
            <button 
                onClick={handleExportXLSX}
                className="flex items-center gap-2 bg-white border border-gray-300 text-success font-medium py-2 px-4 rounded-full hover:bg-green-50 transition-colors shadow-sm text-sm"
            >
                <DownloadIcon className="h-4 w-4" /> Exportar Planilha
            </button>
        </div>

        {/* Content Grid */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 overflow-y-auto flex-grow custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                
                {/* Left Column: Solinter */}
                <div className="space-y-6">
                    <div className="bg-secondary/30 p-4 rounded-xl border border-border">
                        <EditableLabel name="solinterTitle" value={currentData.labels.solinterTitle} onChange={(e) => handleInputChange(e, 'labels')} className="font-bold text-lg text-primary mb-3 block" />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-text-secondary uppercase">Lançamentos</label>
                                <NumberInput name="solinterLancamentos" value={currentData.values.solinterLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary uppercase">Valor Total</label>
                                <FormattedInput name="solinterTotal" value={currentData.values.solinterTotal} onChange={(e) => handleInputChange(e, 'values')} className="font-bold" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Banks */}
                <div className="space-y-6">
                    {/* Inter */}
                    <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                        <EditableLabel name="interTitle" value={currentData.labels.interTitle} onChange={(e) => handleInputChange(e, 'labels')} className="font-bold text-lg text-text-primary mb-3 block" />
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs font-bold text-text-secondary uppercase">Lançamentos</label>
                                <NumberInput name="interLancamentos" value={currentData.values.interLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary uppercase">Valor Total</label>
                                <FormattedInput name="interTotal" value={currentData.values.interTotal} onChange={(e) => handleInputChange(e, 'values')} />
                            </div>
                        </div>
                        <div className="space-y-2 border-t border-border pt-2">
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <div className="col-span-2"><EditableLabel name="interBoletoInvalidoLabel" value={currentData.labels.interBoletoInvalidoLabel} onChange={(e) => handleInputChange(e, 'labels')} className="text-sm text-text-secondary" /></div>
                                <FormattedInput name="interBoletoInvalido" value={currentData.values.interBoletoInvalido} onChange={(e) => handleInputChange(e, 'values')} />
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <div className="col-span-2"><EditableLabel name="interDescontoLabel" value={currentData.labels.interDescontoLabel} onChange={(e) => handleInputChange(e, 'labels')} className="text-sm text-text-secondary" /></div>
                                <FormattedInput name="interDesconto" value={currentData.values.interDesconto} onChange={(e) => handleInputChange(e, 'values')} />
                            </div>
                            <div className="flex justify-between items-center pt-2 mt-2 border-t border-dashed border-border">
                                <span className="text-sm font-bold text-text-primary">Subtotal Inter</span>
                                <span className="text-sm font-bold text-text-primary">{formatCurrency(calculations.totalInterCalculado)}</span>
                            </div>
                        </div>
                    </div>

                    {/* BB (Only Fabrica) */}
                    {isFabrica && (
                        <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                            <EditableLabel name="bbTitle" value={currentData.labels.bbTitle} onChange={(e) => handleInputChange(e, 'labels')} className="font-bold text-lg text-text-primary mb-3 block" />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-text-secondary uppercase">Lançamentos</label>
                                    <NumberInput name="bbLancamentos" value={currentData.values.bbLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-text-secondary uppercase">Valor Total</label>
                                    <FormattedInput name="bbTotal" value={currentData.values.bbTotal} onChange={(e) => handleInputChange(e, 'values')} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Santander / Inter WW */}
                    <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                        <EditableLabel name="santanderTitle" value={currentData.labels.santanderTitle} onChange={(e) => handleInputChange(e, 'labels')} className="font-bold text-lg text-text-primary mb-3 block" />
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs font-bold text-text-secondary uppercase">Lançamentos</label>
                                <NumberInput name="santanderLancamentos" value={currentData.values.santanderLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary uppercase">Valor Total</label>
                                <FormattedInput name="santanderTotal" value={currentData.values.santanderTotal} onChange={(e) => handleInputChange(e, 'values')} />
                            </div>
                        </div>
                        <div className="space-y-2 border-t border-border pt-2">
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <div className="col-span-2"><EditableLabel name="santanderCartaoCreditoLabel" value={currentData.labels.santanderCartaoCreditoLabel} onChange={(e) => handleInputChange(e, 'labels')} className="text-sm text-text-secondary" /></div>
                                <FormattedInput name="santanderCartaoCredito" value={currentData.values.santanderCartaoCredito} onChange={(e) => handleInputChange(e, 'values')} />
                            </div>
                             <div className="flex justify-between items-center pt-2 mt-2 border-t border-dashed border-border">
                                <span className="text-sm font-bold text-text-primary">Subtotal</span>
                                <span className="text-sm font-bold text-text-primary">{formatCurrency(calculations.totalSantanderCalculado)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Summary */}
        <div className="mt-6 bg-white p-6 rounded-2xl border border-border shadow-sm max-w-5xl mx-auto w-full">
            <div className="grid grid-cols-2 gap-8">
                <div className="flex justify-between items-center p-4 bg-secondary/20 rounded-xl border border-border/50">
                    <span className="font-bold text-text-secondary uppercase text-sm">Diferença Valor</span>
                    <span className={`text-2xl font-bold ${calculations.diferencaValor === 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(calculations.diferencaValor)}
                    </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-secondary/20 rounded-xl border border-border/50">
                    <span className="font-bold text-text-secondary uppercase text-sm">Diferença Lançamentos</span>
                    <span className={`text-2xl font-bold ${calculations.diferencaLancamentos === 0 ? 'text-success' : 'text-danger'}`}>
                        {calculations.diferencaLancamentos}
                    </span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default AutorizacaoPagamento;