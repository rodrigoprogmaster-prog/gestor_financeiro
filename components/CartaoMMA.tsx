
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UploadIcon, SearchIcon, DownloadIcon, ArrowLeftIcon } from './icons';
import CustomSelect from './CustomSelect';

// Data structure
interface MmaTransaction {
  id: string;
  'Data da Transação': string;
  'Extrato da conta': string;
  'Transação': string;
  'Valor original': number;
  'Categoria da Compra': string;
  'Status': string;
}

const STORAGE_KEY_MMA = 'cartao_mma_data';

const createTransactionKey = (transaction: Omit<MmaTransaction, 'id' | 'Status'>): string => {
    const date = transaction['Data da Transação']?.trim() || '';
    const extract = transaction['Extrato da conta']?.trim() || '';
    const description = transaction['Transação']?.trim() || '';
    const value = (transaction['Valor original'] || 0).toFixed(2);
    return `${date}|${extract}|${description}|${value}`;
};

const normalizeHeader = (str: string): string => {
    if (!str) return '';
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .toLowerCase()
        .trim();
};

const parseCurrencyValue = (value: string): number => {
    if (typeof value !== 'string' || value.trim() === '') {
        return 0;
    }
    let numberString = value.replace(/R\$|\s/g, '');
    const lastCommaIndex = numberString.lastIndexOf(',');
    const lastDotIndex = numberString.lastIndexOf('.');

    if (lastCommaIndex > lastDotIndex) {
        numberString = numberString.replace(/\./g, '').replace(',', '.');
    } else {
        numberString = numberString.replace(/,/g, '');
    }

    const parsed = parseFloat(numberString);
    return isNaN(parsed) ? 0 : parsed;
};

const formatDateToBR = (dateString: string): string => {
    if (!dateString) return '';
    let date;
     if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if(parts.length === 3) {
            date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    } else {
        date = new Date(dateString + 'T00:00:00');
    }

    if (date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }
    return dateString;
};


const parseCsvData = (csvText: string, headersToKeep: string[]): Omit<MmaTransaction, 'id' | 'Status'>[] => {
    const rows = csvText.split('\n').map(row => row.trim()).filter(Boolean);
    if (rows.length < 2) return [];

    const delimiter = rows[0].includes(';') ? ';' : ',';
    const fileHeaders = rows[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
    
    const normalizedFileHeaders = fileHeaders.map(normalizeHeader);
    const headerMapping: Record<string, number> = {};

    headersToKeep.forEach(requiredHeader => {
        const normalizedRequired = normalizeHeader(requiredHeader);
        const fileIndex = normalizedFileHeaders.indexOf(normalizedRequired);
        if (fileIndex !== -1) {
            headerMapping[requiredHeader] = fileIndex;
        }
    });
    
    const foundHeaders = Object.keys(headerMapping);
    if (foundHeaders.length < headersToKeep.length) {
        const missingHeaders = headersToKeep.filter(h => !foundHeaders.includes(h));
        throw new Error(`Alguns cabeçalhos obrigatórios não foram encontrados no arquivo. Colunas faltando: ${missingHeaders.join(', ')}`);
    }

    const data = rows.slice(1).map(row => {
        const values = row.split(delimiter).map(v => v.trim().replace(/"/g, ''));
        const transaction: any = {};
        for (const header of headersToKeep) {
            const index = headerMapping[header];
            const value = values[index] || '';
            if (header === 'Valor original') {
                transaction[header] = parseCurrencyValue(value);
            } else {
                transaction[header] = value;
            }
        }
        return transaction as Omit<MmaTransaction, 'id' | 'Status'>;
    });

    return data;
};

interface CartaoMmaProps {
  onBack: () => void;
}

const CartaoMMA: React.FC<CartaoMmaProps> = ({ onBack }) => {
    const [data, setData] = useState<MmaTransaction[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY_MMA);
        return saved ? JSON.parse(saved) : [];
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [monthFilter, setMonthFilter] = useState('');

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_MMA, JSON.stringify(data));
    }, [data]);

    // Lógica inteligente para definir o mês padrão
    useEffect(() => {
        const now = new Date();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
        const currentYear = now.getFullYear();
        const currentMonthKey = `${currentMonth}/${currentYear}`;

        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonthKey = `${(nextMonthDate.getMonth() + 1).toString().padStart(2, '0')}/${nextMonthDate.getFullYear()}`;

        // Filtrar itens do mês atual
        const currentMonthItems = data.filter(item => {
            const dateStr = item['Data da Transação'];
            if (!dateStr) return false;
            let date;
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                }
            } else {
                date = new Date(dateStr);
            }
            if (date && !isNaN(date.getTime())) {
                const itemMonthYear = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                return itemMonthYear === currentMonthKey;
            }
            return false;
        });

        // Se houver itens no mês atual e TODOS estiverem lançados, vai para o próximo mês.
        // Caso contrário (vazio ou algum pendente), fica no mês atual.
        if (currentMonthItems.length > 0 && currentMonthItems.every(item => item.Status === 'Lançado')) {
            setMonthFilter(nextMonthKey);
        } else {
            setMonthFilter(currentMonthKey);
        }
    }, [data]); // Dependência em data garante que recalcula se importar arquivo novo

    const uniqueMonths = useMemo(() => {
        const months = new Set<string>();
        data.forEach(item => {
            const dateStr = item['Data da Transação'];
            if (!dateStr) return;
            let date;
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if(parts.length === 3) {
                   date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                }
            } else {
                 date = new Date(dateStr);
            }
            if (date && !isNaN(date.getTime())) {
                const monthYear = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                months.add(monthYear);
            }
        });
        return Array.from(months).sort((a, b) => {
            const [monthA, yearA] = a.split('/').map(Number);
            const [monthB, yearB] = b.split('/').map(Number);
            if (yearA !== yearB) return yearB - yearA;
            return monthB - monthA;
        });
    }, [data]);
    
    const filteredData = useMemo(() => {
        if (!monthFilter) return data;
        return data.filter(item => {
            const dateStr = item['Data da Transação'];
             if (!dateStr) return false;
            let date;
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if(parts.length === 3) {
                   date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                }
            } else {
                 date = new Date(dateStr);
            }
             if (date && !isNaN(date.getTime())) {
                const monthYear = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                return monthYear === monthFilter;
            }
            return false;
        });
    }, [data, monthFilter]);

    const totals = useMemo(() => {
        const source = filteredData;
        const totalValue = source.reduce((acc, item) => acc + item['Valor original'], 0);
        const transactionCount = source.length;
        return { totalValue, transactionCount };
    }, [filteredData]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target?.result as string;
                const headersToKeep = ['Data da Transação', 'Extrato da conta', 'Transação', 'Valor original'];
                let parsedData = parseCsvData(csvText, headersToKeep);
                
                const dataWithDefaultCategory = parsedData.map(item => ({
                    ...item,
                    'Categoria da Compra': 'Outros',
                }));
                
                const existingStatusMap = new Map<string, string>();
                data.forEach(transaction => {
                    const key = createTransactionKey(transaction);
                    if (transaction.Status) existingStatusMap.set(key, transaction.Status);
                });

                const newData: MmaTransaction[] = dataWithDefaultCategory.map((item) => {
                    const key = createTransactionKey(item);
                    const savedStatus = existingStatusMap.get(key) || '';
                    return { ...item, id: key, Status: savedStatus };
                });

                setData(newData);
            } catch (error: any) {
                alert(`Erro ao processar o arquivo: ${error.message}`);
            } finally {
                 if (event.target) event.target.value = '';
            }
        };
        reader.readAsText(file, 'windows-1252');
    };
    
    const handleStatusToggle = (transactionId: string) => {
        setData(prevData =>
            prevData.map(transaction => {
                if (transaction.id === transactionId && transaction.Status !== 'Lançado') {
                    return { ...transaction, Status: 'Lançado' };
                }
                return transaction;
            })
        );
    };

    const handleExportXLSX = () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
            alert("Erro: A biblioteca de exportação não foi carregada.");
            return;
        }

        const dataToExport = filteredData.map(t => ({
            'Data da Transação': formatDateToBR(t['Data da Transação']),
            'Extrato da conta': t['Extrato da conta'],
            'Transação': t['Transação'],
            'Valor original': t['Valor original'],
            'Categoria da Compra': t['Categoria da Compra'],
            'Status': t.Status,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);

        XLSX.utils.sheet_add_aoa(worksheet, [[null, null, 'Total Lançamentos:', totals.transactionCount, 'Valor Total:', totals.totalValue]], { origin: -1 });
        
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let R = 1; R < range.e.r; ++R) {
            const cell_ref = XLSX.utils.encode_cell({c: 3, r: R}); // Column D (Valor original)
            if(worksheet[cell_ref]) {
                worksheet[cell_ref].t = 'n';
                worksheet[cell_ref].z = 'R$ #,##0.00';
            }
        }
        const totalCellRef = XLSX.utils.encode_cell({c: 5, r: range.e.r});
        if(worksheet[totalCellRef]) {
            worksheet[totalCellRef].t = 'n';
            worksheet[totalCellRef].z = 'R$ #,##0.00';
        }

        worksheet['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 30 }, { wch: 15 }];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Fatura MMA');
        XLSX.writeFile(workbook, `fatura_mma_${monthFilter || 'geral'}_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    return (
        <div className="animate-fade-in flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Voltar
                    </button>
                    <h3 className="text-xl md:text-2xl font-bold text-text-primary">Cartão MMA</h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-48">
                        <CustomSelect
                            options={[
                                { label: 'Todos os Meses', value: '' },
                                ...uniqueMonths.map(month => ({ label: month, value: month }))
                            ]}
                            value={monthFilter}
                            onChange={(val) => setMonthFilter(val)}
                            placeholder="Filtrar Mês"
                        />
                    </div>
                     <button
                        onClick={() => setMonthFilter('')}
                        className="py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10"
                    >
                        Limpar
                    </button>
                     <button
                        onClick={handleExportXLSX}
                        className="flex items-center gap-2 bg-success text-white font-semibold py-2 px-4 rounded-full hover:bg-green-700 transition-colors duration-300 h-10"
                    >
                        <DownloadIcon className="h-5 w-5" /> Emitir Fatura
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors duration-300 h-10"
                    >
                        <UploadIcon className="h-5 w-5" />
                        Subir Arquivo CSV
                    </button>
                </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />
            
            {/* Unified Summary Strip */}
            <div className="bg-white p-3 rounded-2xl border border-border shadow-sm mb-4 flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border shrink-0">
                <div className="px-6 py-2 flex-1 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Valor Total</p>
                    <p className="text-xl font-bold text-primary">{totals.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="px-6 py-2 flex-1 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Lançamentos</p>
                    <p className="text-xl font-bold text-text-primary">{totals.transactionCount}</p>
                </div>
            </div>

            <div className="bg-card shadow-md rounded-2xl overflow-hidden flex flex-col flex-grow border border-border">
                <div className="overflow-x-auto overflow-y-auto flex-grow">
                    <table className="min-w-full divide-y divide-border text-sm text-left">
                        <thead className="bg-secondary text-text-primary uppercase text-xs font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                {['Data da Transação', 'Extrato da conta', 'Transação', 'Valor original', 'Categoria da Compra', 'Status'].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 whitespace-nowrap">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                            {filteredData.length > 0 ? (
                                filteredData.map(item => (
                                    <tr key={item.id} onClick={() => handleStatusToggle(item.id)} className="bg-card border-b border-border hover:bg-secondary cursor-pointer transition-colors duration-200">
                                        <td className="px-6 py-2.5 whitespace-nowrap text-text-secondary">{formatDateToBR(item['Data da Transação'])}</td>
                                        <td className="px-6 py-2.5 whitespace-nowrap text-text-primary font-medium">{item['Extrato da conta']}</td>
                                        <td className="px-6 py-2.5 whitespace-nowrap text-text-secondary">{item['Transação']}</td>
                                        <td className="px-6 py-2.5 text-right whitespace-nowrap font-semibold text-text-primary">{item['Valor original'].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="px-6 py-2.5 whitespace-nowrap text-text-secondary">{item['Categoria da Compra']}</td>
                                        <td className="px-6 py-2.5 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${item.Status === 'Lançado' ? 'bg-success/10 text-success border border-success/20' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                                {item.Status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-12">
                                         <div className="flex flex-col items-center justify-center text-text-secondary opacity-60">
                                            <SearchIcon className="w-10 h-10 mb-3 text-gray-300" />
                                            <h3 className="text-base font-semibold text-text-primary">Nenhuma Transação</h3>
                                            <p className="text-sm mt-1">{monthFilter ? 'Nenhum dado para o mês selecionado.' : 'Use o botão "Subir Arquivo CSV" para começar.'}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CartaoMMA;
