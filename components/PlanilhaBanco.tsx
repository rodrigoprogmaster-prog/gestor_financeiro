import React, { useState, useEffect, useMemo } from 'react';

const NUM_ROWS = 30;
const NUM_COLS = 4;

interface PlanilhaBancoProps {
    storageKeySuffix?: string;
}

const PlanilhaBanco: React.FC<PlanilhaBancoProps> = ({ storageKeySuffix = '' }) => {
    const LOCAL_STORAGE_DATA_KEY = `planilha_banco_data${storageKeySuffix}`;
    const LOCAL_STORAGE_HEADERS_KEY = `planilha_banco_headers${storageKeySuffix}`;

    const [headers, setHeaders] = useState<string[]>(() => {
        const savedHeaders = localStorage.getItem(LOCAL_STORAGE_HEADERS_KEY);
        return savedHeaders ? JSON.parse(savedHeaders) : Array.from({ length: NUM_COLS }, (_, i) => `Coluna ${String.fromCharCode(65 + i)}`);
    });

    const [gridData, setGridData] = useState<string[][]>(() => {
        const savedData = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
        return savedData ? JSON.parse(savedData) : Array(NUM_ROWS).fill(Array(NUM_COLS).fill(''));
    });

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_HEADERS_KEY, JSON.stringify(headers));
    }, [headers, LOCAL_STORAGE_HEADERS_KEY]);

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(gridData));
    }, [gridData, LOCAL_STORAGE_DATA_KEY]);

    const handleHeaderChange = (colIndex: number, value: string) => {
        const newHeaders = [...headers];
        newHeaders[colIndex] = value;
        setHeaders(newHeaders);
    };

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newGridData = gridData.map((row, rIdx) => {
            if (rIdx === rowIndex) {
                const newRow = [...row];
                newRow[colIndex] = value;
                return newRow;
            }
            return row;
        });
        setGridData(newGridData);
    };

    const columnTotals = useMemo(() => {
        const totals = Array(NUM_COLS).fill(0);
        for (let col = 0; col < NUM_COLS; col++) {
            for (let row = 0; row < NUM_ROWS; row++) {
                const value = parseFloat(gridData[row][col].replace(',', '.'));
                if (!isNaN(value)) {
                    totals[col] += value;
                }
            }
        }
        return totals;
    }, [gridData]);

    return (
        <div className="animate-fade-in">
            <p className="text-text-secondary mb-4">
                Insira os dados diretamente na planilha. Os cabeçalhos são editáveis e os totais são calculados automaticamente. Seus dados são salvos no navegador.
            </p>
            <div className="bg-card shadow-md rounded-lg overflow-auto max-h-[70vh]">
                <table className="w-full text-base text-left text-text-secondary border-collapse">
                    <thead className="text-sm text-text-primary uppercase bg-secondary sticky top-0 z-10">
                        <tr>
                            {headers.map((header, colIndex) => (
                                <th key={colIndex} scope="col" className="border border-border p-0">
                                    <input
                                        type="text"
                                        value={header}
                                        onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                                        className="w-full h-full px-4 py-3 bg-transparent font-semibold text-center focus:outline-none focus:bg-blue-100"
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {gridData.map((row, rowIndex) => (
                            <tr key={rowIndex} className="bg-card hover:bg-secondary/50 transition-colors duration-150">
                                {row.map((cell, colIndex) => (
                                    <td key={colIndex} className="border border-border p-0">
                                        <input
                                            type="text"
                                            value={cell}
                                            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                            className="w-full h-full px-4 py-2 bg-transparent focus:outline-none focus:bg-blue-100"
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
    
                    </tbody>
                    <tfoot className="font-bold text-text-primary bg-secondary/80 sticky bottom-0 z-10">
                        <tr>
                            {columnTotals.map((total, colIndex) => (
                                <td key={colIndex} className="px-4 py-3 text-right border border-border">
                                    {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default PlanilhaBanco;