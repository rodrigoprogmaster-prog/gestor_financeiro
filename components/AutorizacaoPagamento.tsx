import React, { useState, useEffect, useMemo } from 'react';
import { DownloadIcon } from './icons';

// Interfaces for data structure
interface AuthValues {
  solinterTotal: number;
  solinterLancamentos: number;
  interTotal: number;
  interLancamentos: number;
  interBoletoInvalido: number;
  interDesconto: number;
  santanderTotal: number;
  santanderLancamentos: number;
  santanderCartaoCredito: number;
}

interface AuthLabels {
  solinterTitle: string;
  interTitle: string;
  interBoletoInvalidoLabel: string;
  interDescontoLabel: string;
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
        santanderTotal: 0,
        santanderLancamentos: 0,
        santanderCartaoCredito: 0,
    },
    labels: {
        solinterTitle: "1) Solinter",
        interTitle: "2) Banco Inter (lançamentos para aprovar)",
        interBoletoInvalidoLabel: "Menos boleto inválido",
        interDescontoLabel: "Desconto",
        santanderTitle: "3) Santander PXT (pagamentos efetuados)",
        santanderCartaoCreditoLabel: "Cartão de crédito WW",
    }
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const parseCurrency = (value: string): number => {
    let numericValue = value.replace(/[^\d]/g, '');
    if (numericValue === '') return 0;
    return Number(numericValue) / 100;
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


// Reusable components for inputs - styled with thin lines and sober colors
const FormattedInput: React.FC<{name: keyof AuthValues, value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ name, value, onChange }) => (
    <input
        type="text"
        name={name}
        value={formatCurrency(value)}
        onChange={onChange}
        className="w-full text-right bg-white border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
    />
);

const NumberInput: React.FC<{name: keyof AuthValues, value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ name, value, onChange }) => (
    <input
        type="number"
        name={name}
        value={value === 0 ? '' : value}
        onChange={onChange}
        placeholder="0"
        className="w-full text-right bg-white border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
    />
);


const EditableLabel: React.FC<{name: keyof AuthLabels, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, className?: string, isHeader?: boolean}> = ({ name, value, onChange, className, isHeader = false }) => (
    <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full bg-transparent p-1 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white focus:text-text-primary rounded ${className} ${isHeader ? 'font-semibold' : ''}`}
    />
);


const AutorizacaoPagamento: React.FC<AutorizacaoPagamentoProps> = ({ storageKeySuffix = '' }) => {
  const LOCAL_STORAGE_KEY_AUTH = `autorizacao_pagamento_data${storageKeySuffix}`;

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
    if (savedDayData) {
        return {
            values: { ...initialDayData.values, ...savedDayData.values },
            labels: { ...initialDayData.labels, ...savedDayData.labels },
        };
    }
    return initialDayData;
  }, [allData, selectedDate]);
  
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
      const totalInterCalculado = values.interTotal - values.interBoletoInvalido - values.interDesconto;
      const totalSantanderCalculado = values.santanderTotal + values.santanderCartaoCredito;
      const diferencaValor = values.solinterTotal - totalInterCalculado - totalSantanderCalculado;
      const diferencaLancamentos = values.solinterLancamentos - values.interLancamentos - values.santanderLancamentos;

      return { diferencaValor, diferencaLancamentos, totalInterCalculado, totalSantanderCalculado };
  }, [currentData]);

  const handleExportXLSX = () => {
    // ... Export logic kept same ...
    const XLSX = (window as any).XLSX;
    if (!XLSX) { alert("Erro: A biblioteca de exportação não foi carregada."); return; }

    const { values, labels } = currentData;
    const { diferencaValor, diferencaLancamentos, totalInterCalculado, totalSantanderCalculado } = calculations;
    
    const data = [
        [`APROVAÇÃO - ${formatDateToBR(selectedDate)}`, null, null, null], [],
        [labels.solinterTitle, 'Lançamentos', 'Total', null],
        ['Total:', values.solinterLancamentos || null, values.solinterTotal, null], [],
        [labels.interTitle, 'Lançamentos', 'Total', 'Saldo'],
        ['Total:', values.interLancamentos || null, values.interTotal, null],
        [labels.interBoletoInvalidoLabel, null, -values.interBoletoInvalido, values.interTotal - values.interBoletoInvalido],
        [labels.interDescontoLabel, null, -values.interDesconto, totalInterCalculado], [],
        [labels.santanderTitle, 'Lançamentos', 'Total', 'Saldo'],
        ['Total:', values.santanderLancamentos || null, values.santanderTotal, values.santanderTotal],
        [labels.santanderCartaoCreditoLabel, null, values.santanderCartaoCredito, totalSantanderCalculado], [],
        ['DIFERENÇA', diferencaLancamentos || null, diferencaValor, null]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    const formatCell = (row: number, col: number, format: string, type: 'n' | 's' = 'n') => {
        const cellRef = XLSX.utils.encode_cell({c: col, r: row});
        if (ws[cellRef]) { ws[cellRef].t = type; ws[cellRef].z = format; }
    };
    formatCell(3, 2, 'R$ #,##0.00'); formatCell(6, 2, 'R$ #,##0.00'); formatCell(7, 2, 'R$ #,##0.00'); formatCell(7, 3, 'R$ #,##0.00');
    formatCell(8, 2, 'R$ #,##0.00'); formatCell(8, 3, 'R$ #,##0.00'); formatCell(11, 2, 'R$ #,##0.00'); formatCell(11, 3, 'R$ #,##0.00');
    formatCell(12, 2, 'R$ #,##0.00'); formatCell(12, 3, 'R$ #,##0.00'); formatCell(14, 2, 'R$ #,##0.00');
    ws['!cols'] = [{ wch: 50 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Aprovação');
    XLSX.writeFile(wb, `aprovacao_pagamento_${selectedDate}.xlsx`);
  };

  return (
    <div className="animate-fade-in p-4 bg-white border border-border max-w-4xl mx-auto rounded-lg shadow-sm">
        <div className="bg-secondary border-b border-border p-4 rounded-t-lg flex justify-between items-center flex-wrap gap-4">
            <div>
                <h2 className="text-xl font-bold text-text-primary">Aprovação</h2>
                <div className="flex items-center gap-2 mt-2">
                    <label htmlFor="auth-date-selector" className="font-semibold text-sm text-text-secondary">Data:</label>
                    <input
                        id="auth-date-selector"
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="bg-white border border-border rounded-md px-2 py-1 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                    />
                </div>
            </div>
             <button
                onClick={handleExportXLSX}
                className="flex items-center gap-2 bg-success text-white font-medium py-1.5 px-4 rounded-md hover:bg-green-700 transition-colors text-sm shadow-sm"
              >
                <DownloadIcon className="h-4 w-4" />
                Exportar
            </button>
        </div>
        
        <div className={`flex items-center justify-around gap-4 p-4 border-b border-border mb-4 ${
            calculations.diferencaValor === 0 && calculations.diferencaLancamentos === 0 ? 'bg-green-50' : 'bg-red-50'
        }`}>
            <div className="text-center">
                <p className="text-xs text-text-secondary font-semibold uppercase tracking-wide">Diferença Lançamentos</p>
                <p className={`text-xl font-bold ${
                    calculations.diferencaLancamentos === 0 ? 'text-success' : 'text-danger'
                }`}>
                    {calculations.diferencaLancamentos}
                </p>
            </div>
            <div className="text-center">
                <p className="text-xs text-text-secondary font-semibold uppercase tracking-wide">Diferença Valor</p>
                <p className={`text-xl font-bold ${
                    calculations.diferencaValor === 0 ? 'text-success' : 'text-danger'
                }`}>
                    {formatCurrency(calculations.diferencaValor)}
                </p>
            </div>
        </div>

        <div className="space-y-6 p-4">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border bg-secondary/30">
                        <th className="p-2 text-left font-semibold w-1/2">
                           <EditableLabel name="solinterTitle" value={currentData.labels.solinterTitle} onChange={(e) => handleInputChange(e, 'labels')} className="text-text-primary font-semibold" isHeader/>
                        </th>
                        <th className="p-2 text-center font-medium text-text-secondary uppercase text-xs w-1/4">Lançamentos</th>
                        <th className="p-2 text-center font-medium text-text-secondary uppercase text-xs w-1/4">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    <tr>
                        <td className="p-2 font-medium text-text-secondary">Total:</td>
                        <td className="p-2">
                           <NumberInput name="solinterLancamentos" value={currentData.values.solinterLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="p-2">
                            <FormattedInput name="solinterTotal" value={currentData.values.solinterTotal} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                    </tr>
                </tbody>
            </table>

            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border bg-secondary/30">
                        <th className="p-2 text-left font-semibold w-1/4">
                          <EditableLabel name="interTitle" value={currentData.labels.interTitle} onChange={(e) => handleInputChange(e, 'labels')} className="text-text-primary font-semibold" isHeader/>
                        </th>
                        <th className="p-2 text-center font-medium text-text-secondary uppercase text-xs w-1/4">Lançamentos</th>
                        <th className="p-2 text-center font-medium text-text-secondary uppercase text-xs w-1/4">Total</th>
                        <th className="p-2 text-center font-medium text-text-secondary uppercase text-xs w-1/4">Saldo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    <tr>
                        <td className="p-2 font-medium text-text-secondary">Total:</td>
                         <td className="p-2">
                           <NumberInput name="interLancamentos" value={currentData.values.interLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="p-2">
                           <FormattedInput name="interTotal" value={currentData.values.interTotal} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="w-1/4"></td>
                    </tr>
                    <tr className="bg-secondary/10">
                        <td className="p-2">
                           <EditableLabel name="interBoletoInvalidoLabel" value={currentData.labels.interBoletoInvalidoLabel} onChange={(e) => handleInputChange(e, 'labels')} className="text-text-secondary" />
                        </td>
                        <td></td>
                        <td className="p-2">
                           <FormattedInput name="interBoletoInvalido" value={currentData.values.interBoletoInvalido} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="p-2 text-right font-semibold text-text-primary">{formatCurrency(currentData.values.interTotal - currentData.values.interBoletoInvalido)}</td>
                    </tr>
                     <tr className="bg-secondary/10">
                        <td className="p-2">
                           <EditableLabel name="interDescontoLabel" value={currentData.labels.interDescontoLabel} onChange={(e) => handleInputChange(e, 'labels')} className="text-text-secondary" />
                        </td>
                        <td></td>
                        <td className="p-2">
                           <FormattedInput name="interDesconto" value={currentData.values.interDesconto} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="p-2 text-right font-bold text-primary">{formatCurrency(calculations.totalInterCalculado)}</td>
                    </tr>
                </tbody>
            </table>

            <table className="w-full border-collapse text-sm">
                 <thead>
                    <tr className="border-b border-border bg-secondary/30">
                        <th className="p-2 text-left font-semibold w-1/4">
                          <EditableLabel name="santanderTitle" value={currentData.labels.santanderTitle} onChange={(e) => handleInputChange(e, 'labels')} className="text-text-primary font-semibold" isHeader/>
                        </th>
                         <th className="p-2 text-center font-medium text-text-secondary uppercase text-xs w-1/4">Lançamentos</th>
                         <th className="p-2 text-center font-medium text-text-secondary uppercase text-xs w-1/4">Total</th>
                         <th className="p-2 text-center font-medium text-text-secondary uppercase text-xs w-1/4">Saldo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    <tr>
                        <td className="p-2 font-medium text-text-secondary">Total:</td>
                        <td className="p-2">
                           <NumberInput name="santanderLancamentos" value={currentData.values.santanderLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="p-2">
                           <FormattedInput name="santanderTotal" value={currentData.values.santanderTotal} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                         <td className="p-2 text-right font-semibold text-text-primary">{formatCurrency(currentData.values.santanderTotal)}</td>
                    </tr>
                    <tr className="bg-secondary/10">
                        <td className="p-2">
                           <EditableLabel name="santanderCartaoCreditoLabel" value={currentData.labels.santanderCartaoCreditoLabel} onChange={(e) => handleInputChange(e, 'labels')} className="text-text-secondary" />
                        </td>
                        <td></td>
                        <td className="p-2">
                            <FormattedInput name="santanderCartaoCredito" value={currentData.values.santanderCartaoCredito} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="p-2 text-right font-bold text-primary">{formatCurrency(calculations.totalSantanderCalculado)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default AutorizacaoPagamento;