import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, DownloadIcon, EditIcon, UploadIcon, CheckIcon, ArrowLeftIcon } from './icons';

enum StatusBoleto {
  A_VENCER = 'A Vencer',
  VENCIDO = 'Vencido',
  PAGO = 'Pago',
}

interface Boleto {
  id: string;
  fornecedor: string;
  pagador: string;
  vencimento: string; // YYYY-MM-DD
  valor: number;
  pago: boolean;
}

type BoletoErrors = Partial<Record<keyof Omit<Boleto, 'id' | 'pago'>, string>>;

const formatDateToBR = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const [year, month, day] = isoDate.split('-');
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateToISO = (brDate: string): string => {
    if (!brDate || !/^\d{2}\/\d{2}\/\d{4}$/.test(brDate)) return '';
    const [day, month, year] = brDate.split('/');
    return `${year}-${month}-${day}`;
};

const applyDateMask = (value: string): string => value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3').replace(/(\/\d{4})\d+?$/, '$1');
const isValidBRDate = (dateString: string): boolean => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false;
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const getDayOfWeek = (dateString: string): string => {
  if (!dateString) return '';
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const date = new Date(`${dateString}T00:00:00`);
  return days[date.getUTCDay()];
};

const parseImportedDate = (dateValue: any): string => {
    if (dateValue === null || dateValue === undefined || String(dateValue).trim() === '') return '';

    // Case 1: Excel serial number (most reliable)
    if (typeof dateValue === 'number' && dateValue > 1) {
        try {
            // The xlsx library is loaded from a CDN in index.html
            const date = (window as any).XLSX.SSF.parse_date_code(dateValue);
            if (date && date.y && date.m && date.d) {
                const year = date.y;
                const month = String(date.m).padStart(2, '0');
                const day = String(date.d).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        } catch(e) {
            console.error("Could not parse excel date serial number:", dateValue, e);
        }
    }
    
    // Case 2: String in DD/MM/YYYY format
    if (typeof dateValue === 'string') {
        const trimmedValue = dateValue.trim();
        const parts = trimmedValue.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
        if (parts) {
            const day = parts[1].padStart(2, '0');
            const month = parts[2].padStart(2, '0');
            let year = parts[3];
            if (year.length === 2) {
                year = (parseInt(year, 10) > 50 ? '19' : '20') + year;
            }
            return `${year}-${month}-${day}`;
        }
        // Handle if it's already ISO
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmedValue)) {
            return trimmedValue.split('T')[0];
        }
    }
    
    // Case 3: JS Date object (fallback)
    if (dateValue instanceof Date) {
        // This path is less likely now but kept for safety.
        // We use UTC methods to avoid timezone shift during formatting.
        const year = dateValue.getUTCFullYear();
        const month = String(dateValue.getUTCMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return ''; // Return empty if format is not recognized
};


const BoletosAPagar: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const STORAGE_KEY = 'boletos_a_pagar_data';
    const [boletos, setBoletos] = useState<Boleto[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBoleto, setEditingBoleto] = useState<Partial<Boleto> & { vencimento_br?: string } | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [errors, setErrors] = useState<BoletoErrors>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusBoleto | 'Todos'>('Todos');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(boletos));
    }, [boletos]);

    const getDynamicStatus = (boleto: Boleto): StatusBoleto => {
        if (boleto.pago) return StatusBoleto.PAGO;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(boleto.vencimento + 'T00:00:00');
        return vencimento < hoje ? StatusBoleto.VENCIDO : StatusBoleto.A_VENCER;
    };
    
    const allBoletosWithStatus = useMemo(() => boletos.map(b => ({ ...b, dynamicStatus: getDynamicStatus(b) })), [boletos]);

    const filteredBoletos = useMemo(() => {
        return allBoletosWithStatus.filter(boleto => {
            const statusMatch = statusFilter === 'Todos' || boleto.dynamicStatus === statusFilter;
            const searchMatch = !searchTerm || boleto.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) || boleto.pagador.toLowerCase().includes(searchTerm.toLowerCase());
            const startDateMatch = !dateRange.start || boleto.vencimento >= dateRange.start;
            const endDateMatch = !dateRange.end || boleto.vencimento <= dateRange.end;
            return statusMatch && searchMatch && startDateMatch && endDateMatch;
        }).sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
    }, [allBoletosWithStatus, statusFilter, searchTerm, dateRange]);

    const totals = useMemo(() => {
        const boletosForTotals = allBoletosWithStatus.filter(boleto => {
            const searchMatch = !searchTerm || boleto.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) || boleto.pagador.toLowerCase().includes(searchTerm.toLowerCase());
            const startDateMatch = !dateRange.start || boleto.vencimento >= dateRange.start;
            const endDateMatch = !dateRange.end || boleto.vencimento <= dateRange.end;
            return searchMatch && startDateMatch && endDateMatch;
        });

        return boletosForTotals.reduce((acc, boleto) => {
            const status = boleto.dynamicStatus;
            if (!acc[status]) acc[status] = { count: 0, value: 0 };
            acc[status].count++;
            acc[status].value += boleto.valor;
            return acc;
        }, {} as Record<StatusBoleto, { count: number; value: number }>);
    }, [allBoletosWithStatus, searchTerm, dateRange]);

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('Todos');
        setDateRange({ start: '', end: '' });
    };
    
    const handleOpenAddModal = () => {
        setErrors({});
        setEditingBoleto({ vencimento_br: '', pago: false });
        setIsModalOpen(true);
    };

    const handleEditClick = (boleto: Boleto) => {
        setErrors({});
        setEditingBoleto({ ...boleto, vencimento_br: formatDateToBR(boleto.vencimento) });
        setIsModalOpen(true);
    };
    
    const handleDeleteClick = (id: string) => {
        const action = () => setBoletos(boletos.filter(b => b.id !== id));
        setConfirmAction({ action, message: 'Deseja excluir este boleto?' });
        setIsConfirmOpen(true);
    };

    const handleMarkAsPaid = (boleto: Boleto) => {
        if (boleto.pago) return;
        const action = () => setBoletos(boletos.map(b => b.id === boleto.id ? { ...b, pago: true } : b));
        setConfirmAction({ action, message: 'Deseja marcar este boleto como pago?' });
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingBoleto(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingBoleto) return;
        const { name, value } = e.target;
        let finalValue: string | number = value;
        if (name === 'valor') finalValue = Number(value.replace(/\D/g, '')) / 100;
        else if (name === 'vencimento_br') finalValue = applyDateMask(value);
        setEditingBoleto(prev => ({ ...prev, [name]: finalValue }));
    };

    const validate = (): boolean => {
        if (!editingBoleto) return false;
        const newErrors: BoletoErrors = {};
        if (!editingBoleto.fornecedor?.trim()) newErrors.fornecedor = "Fornecedor é obrigatório.";
        if (!editingBoleto.pagador?.trim()) newErrors.pagador = "Pagador é obrigatório.";
        if (!editingBoleto.vencimento_br || !isValidBRDate(editingBoleto.vencimento_br)) newErrors.vencimento = "Vencimento inválido.";
        if (!editingBoleto.valor || editingBoleto.valor <= 0) newErrors.valor = "Valor deve ser maior que zero.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveChanges = () => {
        if (!validate() || !editingBoleto) return;
        const boletoToSave = { ...editingBoleto, vencimento: formatDateToISO(editingBoleto.vencimento_br!) };
        const action = () => {
            if (boletoToSave.id) setBoletos(boletos.map(b => b.id === boletoToSave.id ? (boletoToSave as Boleto) : b));
            else setBoletos([...boletos, { ...boletoToSave, id: `boleto-${Date.now()}` } as Boleto]);
            handleCloseModal();
        };
        setConfirmAction({ action, message: `Deseja ${editingBoleto.id ? 'salvar as alterações' : 'adicionar este boleto'}?` });
        setIsConfirmOpen(true);
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = (window as any).XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = (window as any).XLSX.utils.sheet_to_json(worksheet, { raw: true });

                let importedCount = 0;
                let duplicateCount = 0;
                let invalidCount = 0;

                const existingKeys = new Set(boletos.map(b => `${b.fornecedor}|${b.pagador}|${b.vencimento}|${b.valor.toFixed(2)}`));
                const newBoletos: Boleto[] = [];

                for (const [index, row] of json.entries()) {
                    const fornecedor = row['fornecedor'] || row['Fornecedor'];
                    const pagador = row['pagador'] || row['Pagador'];
                    const vencimentoRaw = row['vencimento'] || row['Vencimento'];
                    const valorRaw = row['valor'] || row['Valor'];

                    if (!fornecedor || !pagador || !vencimentoRaw || valorRaw === undefined) {
                        invalidCount++;
                        continue;
                    }
                    
                    const vencimentoISO = parseImportedDate(vencimentoRaw);
                    const valorStr = String(valorRaw).replace(',', '.');
                    const valorNum = parseFloat(valorStr);

                    if (!vencimentoISO || isNaN(valorNum) || valorNum <= 0) {
                        invalidCount++;
                        continue;
                    }

                    const newBoletoData = {
                        fornecedor: String(fornecedor).trim(),
                        pagador: String(pagador).trim(),
                        vencimento: vencimentoISO,
                        valor: valorNum,
                    };
                    
                    const duplicateKey = `${newBoletoData.fornecedor}|${newBoletoData.pagador}|${newBoletoData.vencimento}|${newBoletoData.valor.toFixed(2)}`;
                    if (existingKeys.has(duplicateKey)) {
                        duplicateCount++;
                        continue;
                    }

                    newBoletos.push({
                        ...newBoletoData,
                        id: `import-${Date.now()}-${index}`,
                        pago: false,
                    });
                    existingKeys.add(duplicateKey);
                    importedCount++;
                }

                if (newBoletos.length > 0) {
                    setBoletos(prev => [...prev, ...newBoletos]);
                }

                let feedback = `${importedCount} boletos importados com sucesso.\n`;
                if (duplicateCount > 0) feedback += `${duplicateCount} boletos duplicados foram ignorados.\n`;
                if (invalidCount > 0) feedback += `${invalidCount} linhas foram ignoradas por dados inválidos ou faltando (verifique fornecedor, pagador, vencimento, valor).\n`;
                alert(feedback);

            } catch (err) {
                console.error("Erro ao processar arquivo XLSX:", err);
                alert('Ocorreu um erro ao ler o arquivo. Verifique se o formato está correto e se as colunas obrigatórias (fornecedor, pagador, vencimento, valor) existem.');
            } finally {
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExportXLSX = () => {
        const XLSX = (window as any).XLSX;
        const dataToExport = filteredBoletos.map(b => ({
            'Fornecedor': b.fornecedor,
            'Pagador': b.pagador,
            'Vencimento': formatDateToBR(b.vencimento),
            'Dia da Semana': getDayOfWeek(b.vencimento),
            'Valor': b.valor,
            'Status': b.dynamicStatus,
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Boletos a Pagar');
        XLSX.writeFile(workbook, `boletos_a_pagar_${new Date().toISOString().slice(0,10)}.xlsx`);
    };
    
    const handleConfirm = () => { confirmAction.action?.(); setIsConfirmOpen(false); };

    return (
    <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
        <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls" />
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-4">
                {onBack && (
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Voltar
                    </button>
                )}
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Boletos a Pagar</h2>
            </div>
            <div className="flex items-center flex-wrap gap-2">
                <button onClick={handleExportXLSX} className="flex items-center gap-2 bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 h-10"><DownloadIcon className="h-5 w-5"/>Exportar</button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-secondary text-text-primary font-semibold py-2 px-4 rounded-lg hover:bg-border h-10"><UploadIcon className="h-5 w-5"/>Importar</button>
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-hover h-10"><PlusIcon className="h-5 w-5"/>Incluir</button>
            </div>
        </div>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(StatusBoleto).map(status => {
                const total = totals[status] || { count: 0, value: 0 };
                const colors = { [StatusBoleto.A_VENCER]: 'primary', [StatusBoleto.VENCIDO]: 'danger', [StatusBoleto.PAGO]: 'success' };
                const color = colors[status] as 'primary' | 'danger' | 'success';
                return (
                    <div key={status} onClick={() => setStatusFilter(status)} className={`p-4 rounded-lg shadow-md text-center cursor-pointer transition-all ${statusFilter === status ? `ring-2 ring-${color}` : 'border border-border'}`}>
                        <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{status}</p>
                        <p className={`text-2xl font-bold text-${color}`}>{formatCurrency(total.value)}</p>
                        <p className="text-sm text-text-secondary">{total.count} boletos</p>
                    </div>
                );
            })}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0"><input type="text" placeholder="Buscar por Fornecedor ou Pagador..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 pl-10 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10 w-full sm:w-80"/><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-text-secondary"/></div></div>
            <div className="flex items-center gap-2 flex-wrap">
                <label className="text-sm font-medium">Vencimento:</label>
                <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10"/>
                <span className="text-text-secondary">até</span>
                <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10"/>
                <button onClick={handleClearFilters} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">Limpar</button>
            </div>
        </div>

        <div className="bg-card shadow-md rounded-lg overflow-x-auto flex-grow">
            <table className="w-full text-sm text-left text-text-secondary">
                <thead className="text-xs text-text-primary uppercase bg-secondary sticky top-0"><tr><th className="px-6 py-3">Fornecedor</th><th className="px-6 py-3">Pagador</th><th className="px-6 py-3">Vencimento</th><th className="px-6 py-3">Dia da Semana</th><th className="px-6 py-3">Valor</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-center">Ações</th></tr></thead>
                <tbody>
                    {filteredBoletos.length > 0 ? filteredBoletos.map(boleto => (
                        <tr key={boleto.id} className="bg-card border-b border-border hover:bg-secondary">
                            <td className="px-6 py-4 font-medium text-text-primary">{boleto.fornecedor}</td>
                            <td className="px-6 py-4">{boleto.pagador}</td>
                            <td className="px-6 py-4">{formatDateToBR(boleto.vencimento)}</td>
                            <td className="px-6 py-4">{getDayOfWeek(boleto.vencimento)}</td>
                            <td className="px-6 py-4 font-semibold">{formatCurrency(boleto.valor)}</td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${boleto.dynamicStatus === StatusBoleto.VENCIDO ? 'bg-danger/20 text-danger' : boleto.dynamicStatus === StatusBoleto.PAGO ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'}`}>{boleto.dynamicStatus}</span></td>
                            <td className="px-6 py-4"><div className="flex items-center justify-center gap-1">
                                {!boleto.pago && <button onClick={() => handleMarkAsPaid(boleto)} className="text-success p-2 rounded-full hover:bg-success/10"><CheckIcon className="h-5 w-5"/></button>}
                                <button onClick={() => handleEditClick(boleto)} className="text-primary p-2 rounded-full hover:bg-primary/10"><EditIcon className="h-5 w-5"/></button>
                                <button onClick={() => handleDeleteClick(boleto.id)} className="text-danger p-2 rounded-full hover:bg-danger/10"><TrashIcon className="h-5 w-5"/></button>
                            </div></td>
                        </tr>
                    )) : <tr><td colSpan={7} className="text-center py-16"><div className="flex flex-col items-center text-text-secondary"><SearchIcon className="w-12 h-12 mb-4 text-gray-300"/><h3 className="text-xl font-semibold text-text-primary">Nenhum Boleto Encontrado</h3><p>Tente ajustar os filtros ou inclua um novo boleto.</p></div></td></tr>}
                </tbody>
            </table>
        </div>

        {isModalOpen && editingBoleto && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-lg">
                    <h3 className="text-xl font-bold mb-6 text-text-primary">{editingBoleto.id ? 'Editar Boleto' : 'Incluir Novo Boleto'}</h3>
                    <div className="space-y-4">
                        <input name="fornecedor" value={editingBoleto.fornecedor || ''} onChange={handleInputChange} placeholder="Fornecedor" className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.fornecedor ? 'border-danger focus:ring-danger' : 'border-border focus:ring-primary'}`} />{errors.fornecedor && <p className="text-danger text-xs">{errors.fornecedor}</p>}
                        <input name="pagador" value={editingBoleto.pagador || ''} onChange={handleInputChange} placeholder="Pagador" className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.pagador ? 'border-danger focus:ring-danger' : 'border-border focus:ring-primary'}`} />{errors.pagador && <p className="text-danger text-xs">{errors.pagador}</p>}
                        <input name="vencimento_br" value={editingBoleto.vencimento_br || ''} onChange={handleInputChange} placeholder="Vencimento (DD/MM/AAAA)" className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.vencimento ? 'border-danger focus:ring-danger' : 'border-border focus:ring-primary'}`} />{errors.vencimento && <p className="text-danger text-xs">{errors.vencimento}</p>}
                        <input name="valor" value={formatCurrency(editingBoleto.valor || 0)} onChange={handleInputChange} placeholder="Valor" className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.valor ? 'border-danger focus:ring-danger' : 'border-border focus:ring-primary'}`} />{errors.valor && <p className="text-danger text-xs">{errors.valor}</p>}
                    </div>
                    <div className="mt-8 flex justify-end gap-4"><button onClick={handleCloseModal} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold">Cancelar</button><button onClick={handleSaveChanges} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold">Salvar</button></div>
                </div>
            </div>
        )}

        {isConfirmOpen && <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"><div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-sm"><h3 className="text-lg font-bold mb-4 text-text-primary">Confirmar</h3><p className="text-text-secondary mb-6">{confirmAction.message}</p><div className="flex justify-end gap-4"><button onClick={() => setIsConfirmOpen(false)} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold">Cancelar</button><button onClick={handleConfirm} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold">Confirmar</button></div></div></div>}
    </div>
    );
};

export default BoletosAPagar;