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

const formatDateToBR = (dateString: string): string => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

// Reusable components for inputs
const FormattedInput: React.FC<{name: keyof AuthValues, value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ name, value, onChange }) => (
    <input
        type="text"
        name={name}
        value={formatCurrency(value)}
        onChange={onChange}
        className="w-full text-right bg-yellow-50 border border-yellow-200 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary"
    />
);

const NumberInput: React.FC<{name: keyof AuthValues, value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ name, value, onChange }) => (
    <input
        type="number"
        name={name}
        value={value === 0 ? '' : value}
        onChange={onChange}
        placeholder="0"
        className="w-full text-right bg-yellow-50 border border-yellow-200 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary"
    />
);


const EditableLabel: React.FC<{name: keyof AuthLabels, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, className?: string, isHeader?: boolean}> = ({ name, value, onChange, className, isHeader = false }) => (
    <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full bg-transparent p-2 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white focus:text-text-primary rounded ${className} ${isHeader ? 'font-semibold' : ''}`}
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
    // Merge initial data with saved data to ensure all keys exist
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
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
        alert("Erro: A biblioteca de exportação não foi carregada.");
        return;
    }

    const { values, labels } = currentData;
    const { diferencaValor, diferencaLancamentos, totalInterCalculado, totalSantanderCalculado } = calculations;

    const data = [
        // Header
        [`APROVAÇÃO - ${formatDateToBR(selectedDate)}`, null, null, null],
        [], // Spacer row

        // Section 1: Solinter
        [labels.solinterTitle, 'Lançamentos', 'Total', null],
        ['Total:', values.solinterLancamentos || null, values.solinterTotal, null],
        [],

        // Section 2: Banco Inter
        [labels.interTitle, 'Lançamentos', 'Total', 'Saldo'],
        ['Total:', values.interLancamentos || null, values.interTotal, null],
        [labels.interBoletoInvalidoLabel, null, -values.interBoletoInvalido, values.interTotal - values.interBoletoInvalido],
        [labels.interDescontoLabel, null, -values.interDesconto, totalInterCalculado],
        [],

        // Section 3: Santander
        [labels.santanderTitle, 'Lançamentos', 'Total', 'Saldo'],
        ['Total:', values.santanderLancamentos || null, values.santanderTotal, values.santanderTotal],
        [labels.santanderCartaoCreditoLabel, null, values.santanderCartaoCredito, totalSantanderCalculado],
        [],

        // Footer: Diferença
        ['DIFERENÇA', diferencaLancamentos || null, diferencaValor, null]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Merging
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Title
    ];

    // Formatting
    const moneyFormat = 'R$ #,##0.00';
    const numberFormat = '#,##0';

    const formatCell = (row: number, col: number, format: string, type: 'n' | 's' = 'n') => {
        const cellRef = XLSX.utils.encode_cell({c: col, r: row});
        if (ws[cellRef]) {
            ws[cellRef].t = type;
            ws[cellRef].z = format;
        }
    };
    
    // Apply currency format
    formatCell(3, 2, moneyFormat); // Solinter Total
    formatCell(6, 2, moneyFormat); // Inter Total
    formatCell(7, 2, moneyFormat); // Inter Boleto Inválido
    formatCell(7, 3, moneyFormat); // Inter Saldo 1
    formatCell(8, 2, moneyFormat); // Inter Desconto
    formatCell(8, 3, moneyFormat); // Inter Saldo 2
    formatCell(11, 2, moneyFormat); // Santander Total
    formatCell(11, 3, moneyFormat); // Santander Saldo 1
    formatCell(12, 2, moneyFormat); // Santander Cartão
    formatCell(12, 3, moneyFormat); // Santander Saldo 2
    formatCell(14, 2, moneyFormat); // Diferença Valor

    // Apply number format
    formatCell(3, 1, numberFormat);
    formatCell(6, 1, numberFormat);
    formatCell(11, 1, numberFormat);
    formatCell(14, 1, numberFormat);

    // Column widths
    ws['!cols'] = [
        { wch: 50 }, // Column A
        { wch: 15 }, // Column B
        { wch: 20 }, // Column C
        { wch: 20 }, // Column D
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Aprovação');
    XLSX.writeFile(wb, `aprovacao_pagamento_${selectedDate}.xlsx`);
};


  return (
    <div className="animate-fade-in p-4 bg-gray-50 max-w-4xl mx-auto rounded-lg shadow">
        <div className="bg-gray-700 text-white p-4 rounded-t-lg flex justify-between items-center flex-wrap gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white">Aprovação</h2>
                <div className="flex items-center gap-2 mt-2">
                    <label htmlFor="auth-date-selector" className="font-semibold">Data:</label>
                    <input
                        id="auth-date-selector"
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="bg-gray-600 border border-gray-500 rounded-md p-1 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
            </div>
             <button
                onClick={handleExportXLSX}
                className="flex items-center gap-2 bg-success text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors duration-300 h-10"
                aria-label="Exportar para XLSX"
              >
                <DownloadIcon className="h-5 w-5" />
                Exportar
            </button>
        </div>
        
        <div className={`flex items-center justify-around gap-4 p-4 rounded-b-lg mb-4 ${
            calculations.diferencaValor === 0 && calculations.diferencaLancamentos === 0 ? 'bg-success/20' : 'bg-danger/20'
        }`}>
            <div className="text-center">
                <p className="text-sm text-text-secondary font-semibold uppercase">Diferença Lançamentos</p>
                <p className={`text-2xl font-bold ${
                    calculations.diferencaLancamentos === 0 ? 'text-success' : 'text-danger'
                }`}>
                    {calculations.diferencaLancamentos}
                </p>
            </div>
            <div className="text-center">
                <p className="text-sm text-text-secondary font-semibold uppercase">Diferença Valor</p>
                <p className={`text-2xl font-bold ${
                    calculations.diferencaValor === 0 ? 'text-success' : 'text-danger'
                }`}>
                    {formatCurrency(calculations.diferencaValor)}
                </p>
            </div>
        </div>

        <div className="space-y-4 p-4">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-gray-600 text-white">
                        <th className="p-0 text-left font-semibold">
                           <EditableLabel name="solinterTitle" value={currentData.labels.solinterTitle} onChange={(e) => handleInputChange(e, 'labels')} className="text-white placeholder-gray-300" isHeader/>
                        </th>
                        <th className="p-2 text-center w-1/4">Lançamentos</th>
                        <th className="p-2 text-center w-1/4">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border border-gray-300">
                        <td className="p-2 font-medium w-2/4">Total:</td>
                        <td className="p-2">
                           <NumberInput name="solinterLancamentos" value={currentData.values.solinterLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="p-2">
                            <FormattedInput name="solinterTotal" value={currentData.values.solinterTotal} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                    </tr>
                </tbody>
            </table>

            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-gray-600 text-white">
                        <th className="p-0 text-left font-semibold">
                          <EditableLabel name="interTitle" value={currentData.labels.interTitle} onChange={(e) => handleInputChange(e, 'labels')} className="text-white placeholder-gray-300" isHeader/>
                        </th>
                        <th className="p-2 text-center w-1/4">Lançamentos</th>
                        <th className="p-2 text-center w-1/4">Total</th>
                        <th className="p-2 text-center w-1/4">Saldo</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border border-gray-300">
                        <td className="p-2 font-medium w-2/4">Total:</td>
                         <td className="p-2">
                           <NumberInput name="interLancamentos" value={currentData.values.interLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="p-2">
                           <FormattedInput name="interTotal" value={currentData.values.interTotal} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="w-1/4"></td>
                    </tr>
                    <tr className="border border-gray-300 bg-yellow-50">
                        <td className="p-0 font-medium">
                           <EditableLabel name="interBoletoInvalidoLabel" value={currentData.labels.interBoletoInvalidoLabel} onChange={(e) => handleInputChange(e, 'labels')} />
                        </td>
                        <td></td>
                        <td className="p-2">
                           <FormattedInput name="interBoletoInvalido" value={currentData.values.interBoletoInvalido} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="p-2 text-right font-semibold">{formatCurrency(currentData.values.interTotal - currentData.values.interBoletoInvalido)}</td>
                    </tr>
                     <tr className="border border-gray-300 bg-yellow-50">
                        <td className="p-0 font-medium">
                           <EditableLabel name="interDescontoLabel" value={currentData.labels.interDescontoLabel} onChange={(e) => handleInputChange(e, 'labels')} />
                        </td>
                        <td></td>
                        <td className="p-2">
                           <FormattedInput name="interDesconto" value={currentData.values.interDesconto} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="p-2 text-right font-semibold">{formatCurrency(calculations.totalInterCalculado)}</td>
                    </tr>
                </tbody>
            </table>

            <table className="w-full border-collapse">
                 <thead>
                    <tr className="bg-gray-600 text-white">
                        <th className="p-0 text-left font-semibold">
                          <EditableLabel name="santanderTitle" value={currentData.labels.santanderTitle} onChange={(e) => handleInputChange(e, 'labels')} className="text-white placeholder-gray-300" isHeader/>
                        </th>
                         <th className="p-2 text-center w-1/4">Lançamentos</th>
                         <th className="p-2 text-center w-1/4">Total</th>
                         <th className="p-2 text-center w-1/4">Saldo</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border border-gray-300">
                        <td className="p-2 font-medium w-2/4">Total:</td>
                        <td className="p-2">
                           <NumberInput name="santanderLancamentos" value={currentData.values.santanderLancamentos} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="p-2">
                           <FormattedInput name="santanderTotal" value={currentData.values.santanderTotal} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                         <td className="p-2 text-right font-semibold">{formatCurrency(currentData.values.santanderTotal)}</td>
                    </tr>
                    <tr className="border border-gray-300 bg-yellow-50">
                        <td className="p-0 font-medium">
                           <EditableLabel name="santanderCartaoCreditoLabel" value={currentData.labels.santanderCartaoCreditoLabel} onChange={(e) => handleInputChange(e, 'labels')} />
                        </td>
                        <td></td>
                        <td className="p-2">
                            <FormattedInput name="santanderCartaoCredito" value={currentData.values.santanderCartaoCredito} onChange={(e) => handleInputChange(e, 'values')} />
                        </td>
                        <td className="p-2 text-right font-semibold">{formatCurrency(calculations.totalSantanderCalculado)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default AutorizacaoPagamento;