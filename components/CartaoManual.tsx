import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, EditIcon, SearchIcon, CalendarIcon, DownloadIcon, ArrowLeftIcon } from './icons';

// Data structure
interface ManualTransaction {
  id: string;
  dataTransacao: string; // YYYY-MM-DD
  mesReferencia: string;
  transacao: string;
  categoria: string;
  valor: number;
}

// Date helpers
const formatDateToBR = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
};

const formatDateToISO = (brDate: string): string => {
    if (!brDate || !/^\d{2}\/\d{2}\/\d{4}$/.test(brDate)) return '';
    const [day, month, year] = brDate.split('/');
    return `${year}-${month}-${day}`;
};

const applyDateMask = (value: string): string => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1/$2')
        .replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3')
        .replace(/(\/\d{4})\d+?$/, '$1');
};

const isValidBRDate = (dateString: string): boolean => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false;
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

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


type TransactionErrors = Partial<Record<keyof Omit<ManualTransaction, 'id'>, string>>;

const newTransactionTemplate: Omit<ManualTransaction, 'id'> = {
    dataTransacao: new Date().toISOString().split('T')[0],
    mesReferencia: '',
    transacao: '',
    categoria: '',
    valor: 0,
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CartaoManualProps {
  title: string;
  storageKey: string;
  onBack: () => void;
}

const CartaoManual: React.FC<CartaoManualProps> = ({ title, storageKey, onBack }) => {
    const [transactions, setTransactions] = useState<ManualTransaction[]>(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Partial<ManualTransaction> & { dataTransacao_br?: string } | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [errors, setErrors] = useState<TransactionErrors>({});
    const [mesReferenciaFilter, setMesReferenciaFilter] = useState('');

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(transactions));
    }, [transactions, storageKey]);

    const filteredTransactions = useMemo(() => {
        if (!mesReferenciaFilter) return transactions;
        const lowercasedFilter = mesReferenciaFilter.toLowerCase();
        return transactions.filter(t => t.mesReferencia.toLowerCase().includes(lowercasedFilter));
    }, [transactions, mesReferenciaFilter]);

    const totals = useMemo(() => {
        const source = filteredTransactions;
        const totalValue = source.reduce((acc, item) => acc + item.valor, 0);
        const transactionCount = source.length;
        return { totalValue, transactionCount };
    }, [filteredTransactions]);

    const handleOpenAddModal = () => {
        setErrors({});
        setEditingTransaction({ ...newTransactionTemplate, dataTransacao_br: formatDateToBR(newTransactionTemplate.dataTransacao) });
        setIsModalOpen(true);
    };

    const handleEditClick = (transaction: ManualTransaction) => {
        setErrors({});
        setEditingTransaction({ ...transaction, dataTransacao_br: formatDateToBR(transaction.dataTransacao) });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        const action = () => setTransactions(transactions.filter(t => t.id !== id));
        setConfirmAction({ action, message: 'Você tem certeza que deseja excluir esta transação?' });
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTransaction(null);
        setErrors({});
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (editingTransaction) {
            const { name, value } = e.target;
            let finalValue: string | number = value;

            if (name === 'valor') {
                let numericValue = value.replace(/\D/g, '');
                if (numericValue === '') numericValue = '0';
                finalValue = Number(numericValue) / 100;
            } else if (name === 'dataTransacao_br') {
                finalValue = applyDateMask(value);
            } else if (name === 'mesReferencia') {
                finalValue = applyMonthYearMask(value);
            }
            
            setEditingTransaction({ ...editingTransaction, [name]: finalValue });

            // Clear error on change
            const fieldName = name === 'dataTransacao_br' ? 'dataTransacao' : name;
            if (errors[fieldName as keyof TransactionErrors]) {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[fieldName as keyof TransactionErrors];
                    return newErrors;
                });
            }
        }
    };

    const validateField = (name: keyof TransactionErrors, value: any): string | undefined => {
        switch(name) {
            case 'dataTransacao':
                if (!value) return 'Data da transação é obrigatória.';
                if (!isValidBRDate(value)) return 'Data inválida. Use DD/MM/AAAA.';
                return undefined;
            case 'mesReferencia':
                if (!value?.trim()) return 'Mês de referência é obrigatório.';
                if (!isValidMonthYear(value.trim())) return 'Formato inválido. Use MM/AAAA.';
                return undefined;
            case 'transacao':
                return !value?.trim() ? 'Descrição da transação é obrigatória.' : undefined;
            case 'categoria':
                return !value?.trim() ? 'Categoria é obrigatória.' : undefined;
            case 'valor':
                return !value || value <= 0 ? 'O Valor deve ser maior que zero.' : undefined;
            default:
                return undefined;
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (editingTransaction) {
            const { name, value } = e.target as { name: keyof TransactionErrors | 'dataTransacao_br'; value: any };
            const fieldName = name === 'dataTransacao_br' ? 'dataTransacao' : name;
            const error = validateField(fieldName, value);
            if (error) {
                setErrors(prev => ({ ...prev, [fieldName]: error }));
            }
        }
    };
    
    const validate = (): boolean => {
        if (!editingTransaction) return false;
        const newErrors: TransactionErrors = {};
        
        const fields: { name: keyof TransactionErrors, value: any }[] = [
            { name: 'dataTransacao', value: editingTransaction.dataTransacao_br },
            { name: 'mesReferencia', value: editingTransaction.mesReferencia },
            { name: 'transacao', value: editingTransaction.transacao },
            { name: 'categoria', value: editingTransaction.categoria },
            { name: 'valor', value: editingTransaction.valor },
        ];

        fields.forEach(({name, value}) => {
            const error = validateField(name, value);
            if (error) {
                newErrors[name] = error;
            }
        });
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveChanges = () => {
        if (!validate()) return;
        if (!editingTransaction || !editingTransaction.dataTransacao_br) return;
        
        const transactionToSave = {
            ...editingTransaction,
            dataTransacao: formatDateToISO(editingTransaction.dataTransacao_br),
        };
        delete transactionToSave.dataTransacao_br;

        const action = () => {
            if (transactionToSave.id) { // Edit
                setTransactions(transactions.map(t => t.id === transactionToSave.id ? transactionToSave as ManualTransaction : t));
            } else { // Add
                const newId = `manual-${storageKey}-${Date.now()}`;
                setTransactions([...transactions, { ...newTransactionTemplate, ...transactionToSave, id: newId }]);
            }
            handleCloseModal();
        };

        setConfirmAction({
            action,
            message: editingTransaction.id ? 'Deseja salvar as alterações?' : 'Deseja adicionar esta nova transação?'
        });
        setIsConfirmOpen(true);
    };

    const handleConfirm = () => {
        if (confirmAction.action) confirmAction.action();
        setIsConfirmOpen(false);
    };

    const handleCancelConfirm = () => setIsConfirmOpen(false);
    
    const handleExportXLSX = () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
            alert("Erro: A biblioteca de exportação não foi carregada.");
            return;
        }

        const dataToExport = filteredTransactions.map(t => ({
            'Data da Transação': formatDateToBR(t.dataTransacao),
            'Mês Referência': t.mesReferencia,
            'Transação': t.transacao,
            'Categoria': t.categoria,
            'Valor': t.valor,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);

        const totalRow = [
            null,
            null,
            null,
            `Total Lançamentos: ${totals.transactionCount}`,
            totals.totalValue,
        ];
        XLSX.utils.sheet_add_aoa(worksheet, [totalRow], { origin: -1 });

        const range = XLSX.utils.decode_range(worksheet['!ref']);
        const valorColIndex = 4; // Column E
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            const cell_address = { c: valorColIndex, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (worksheet[cell_ref]) {
                worksheet[cell_ref].t = 'n';
                worksheet[cell_ref].z = 'R$ #,##0.00';
            }
        }
        
        worksheet['!cols'] = [
            { wch: 20 }, { wch: 20 }, { wch: 40 }, { wch: 25 }, { wch: 15 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, title);
        XLSX.writeFile(workbook, `fatura_${storageKey}_${mesReferenciaFilter || 'geral'}_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    return (
        <div className="animate-fade-in">
             <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10">
                    <ArrowLeftIcon className="h-5 w-5" />
                    Voltar
                </button>
                <h3 className="text-xl md:text-2xl font-bold text-text-primary">{title}</h3>
            </div>
             <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="flex items-center gap-4 bg-secondary p-3 rounded-2xl">
                    <div className="text-center">
                        <p className="text-sm text-text-secondary font-semibold">VALOR TOTAL</p>
                        <p className="text-xl font-bold text-primary">{formatCurrency(totals.totalValue)}</p>
                    </div>
                    <div className="border-l border-border h-10"></div>
                    <div className="text-center">
                        <p className="text-sm text-text-secondary font-semibold">LANÇAMENTOS</p>
                        <p className="text-xl font-bold text-primary">{totals.transactionCount}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     <div className="relative w-full sm:w-auto">
                        <input
                            type="text"
                            placeholder="Filtrar por Mês Referência..."
                            value={mesReferenciaFilter}
                            onChange={(e) => setMesReferenciaFilter(e.target.value)}
                            className="bg-background border border-border rounded-xl px-3 py-2 pl-10 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10 w-full sm:w-64"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-text-secondary" />
                        </div>
                    </div>
                    <button onClick={() => setMesReferenciaFilter('')} className="py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10">Limpar</button>
                    <button
                        onClick={handleExportXLSX}
                        className="flex items-center gap-2 bg-success text-white font-semibold py-2 px-4 rounded-full hover:bg-green-700 transition-colors duration-300 h-10"
                    >
                        <DownloadIcon className="h-5 w-5" /> Emitir Fatura
                    </button>
                    <button
                        onClick={handleOpenAddModal}
                        className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors duration-300 h-10"
                    >
                        <PlusIcon className="h-5 w-5" /> Incluir Transação
                    </button>
                </div>
            </div>
            
             <div className="bg-card shadow-md rounded-2xl overflow-x-auto">
                <table className="w-full text-base text-left text-text-secondary">
                    <thead className="text-sm text-text-primary uppercase bg-secondary">
                        <tr>
                            <th scope="col" className="px-6 py-3">Data da Transação</th>
                            <th scope="col" className="px-6 py-3">Mês Referência</th>
                            <th scope="col" className="px-6 py-3">Transação</th>
                            <th scope="col" className="px-6 py-3">Categoria</th>
                            <th scope="col" className="px-6 py-3 text-right">Valor</th>
                            <th scope="col" className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                         {filteredTransactions.length > 0 ? (
                            filteredTransactions.map(item => (
                                <tr key={item.id} className="bg-card border-b border-border">
                                    <td className="px-6 py-4 font-medium">{formatDateToBR(item.dataTransacao)}</td>
                                    <td className="px-6 py-4">{item.mesReferencia}</td>
                                    <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{item.transacao}</td>
                                    <td className="px-6 py-4">{item.categoria}</td>
                                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(item.valor)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleEditClick(item)} className="text-primary hover:text-primary/80 p-2 rounded-full hover:bg-primary/10 transition-colors" aria-label="Editar transação">
                                                <EditIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => handleDeleteClick(item.id)} className="text-danger hover:text-danger/80 p-2 rounded-full hover:bg-danger/10 transition-colors" aria-label="Excluir transação">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center py-16">
                                     <div className="flex flex-col items-center justify-center text-text-secondary">
                                        <SearchIcon className="w-12 h-12 mb-4 text-gray-300" />
                                        <h3 className="text-xl font-semibold text-text-primary">Nenhuma Transação Encontrada</h3>
                                        <p className="mt-1">{mesReferenciaFilter ? 'Tente ajustar seu filtro.' : 'Clique em "Incluir Transação" para começar.'}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>

             {isModalOpen && editingTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-card rounded-2xl shadow-xl p-8 w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-6 text-text-primary">{editingTransaction.id ? 'Editar Transação' : 'Incluir Nova Transação'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="dataTransacao" className="block text-sm font-medium text-text-secondary mb-1">Data da Transação <span className="text-danger">*</span></label>
                                <input id="dataTransacao" type="text" name="dataTransacao_br" value={editingTransaction.dataTransacao_br || ''} onChange={handleInputChange} onBlur={handleBlur} placeholder="DD/MM/AAAA" maxLength={10} className={`w-full bg-background border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.dataTransacao ? 'border-danger focus:ring-danger focus:border-danger' : 'border-border focus:ring-primary'}`} />
                                {errors.dataTransacao && <p className="text-danger text-xs mt-1">{errors.dataTransacao}</p>}
                            </div>
                            <div>
                                <label htmlFor="mesReferencia" className="block text-sm font-medium text-text-secondary mb-1">Mês Referência <span className="text-danger">*</span></label>
                                <input id="mesReferencia" type="text" name="mesReferencia" placeholder="MM/AAAA" maxLength={7} value={editingTransaction.mesReferencia || ''} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-background border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.mesReferencia ? 'border-danger focus:ring-danger focus:border-danger' : 'border-border focus:ring-primary'}`} />
                                {errors.mesReferencia && <p className="text-danger text-xs mt-1">{errors.mesReferencia}</p>}
                            </div>
                             <div>
                                <label htmlFor="transacao" className="block text-sm font-medium text-text-secondary mb-1">Transação <span className="text-danger">*</span></label>
                                <input id="transacao" type="text" name="transacao" placeholder="Ex: Compra de material" value={editingTransaction.transacao || ''} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-background border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.transacao ? 'border-danger focus:ring-danger focus:border-danger' : 'border-border focus:ring-primary'}`} />
                                {errors.transacao && <p className="text-danger text-xs mt-1">{errors.transacao}</p>}
                            </div>
                            <div>
                                <label htmlFor="categoria" className="block text-sm font-medium text-text-secondary mb-1">Categoria <span className="text-danger">*</span></label>
                                <input id="categoria" type="text" name="categoria" placeholder="Ex: Suprimentos" value={editingTransaction.categoria || ''} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-background border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.categoria ? 'border-danger focus:ring-danger focus:border-danger' : 'border-border focus:ring-primary'}`} />
                                {errors.categoria && <p className="text-danger text-xs mt-1">{errors.categoria}</p>}
                            </div>
                            <div>
                                <label htmlFor="valor" className="block text-sm font-medium text-text-secondary mb-1">Valor <span className="text-danger">*</span></label>
                                <input id="valor" type="text" name="valor" value={formatCurrency(editingTransaction.valor || 0)} onChange={handleInputChange} onBlur={handleBlur} className={`w-full bg-background border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.valor ? 'border-danger focus:ring-danger focus:border-danger' : 'border-border focus:ring-primary'}`} />
                                {errors.valor && <p className="text-danger text-xs mt-1">{errors.valor}</p>}
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-4">
                            <button onClick={handleCloseModal} className="py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button>
                            <button onClick={handleSaveChanges} className="py-2 px-4 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">
                                {editingTransaction.id ? 'Salvar Alterações' : 'Incluir Transação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-card rounded-2xl shadow-xl p-8 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4 text-text-primary">Confirmar Ação</h3>
                        <p className="text-text-secondary mb-6">{confirmAction.message}</p>
                        <div className="flex justify-end gap-4">
                            <button onClick={handleCancelConfirm} className="py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button>
                            {confirmAction.action && (
                                <button onClick={handleConfirm} className="py-2 px-4 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Confirmar</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartaoManual;