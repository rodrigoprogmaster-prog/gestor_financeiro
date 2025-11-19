import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, DownloadIcon, EditIcon, UploadIcon, CheckIcon, ArrowLeftIcon, SpinnerIcon } from './icons';

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
    if (typeof dateValue === 'number' && dateValue > 1) {
        try {
            const date = (window as any).XLSX.SSF.parse_date_code(dateValue);
            if (date && date.y && date.m && date.d) {
                return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
            }
        } catch(e) { console.error("Could not parse excel date serial number:", dateValue, e); }
    }
    if (typeof dateValue === 'string') {
        const trimmed = dateValue.trim();
        const parts = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
        if (parts) {
            let year = parts[3];
            if (year.length === 2) year = (parseInt(year, 10) > 50 ? '19' : '20') + year;
            return `${year}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.split('T')[0];
    }
    if (dateValue instanceof Date) {
        return `${dateValue.getUTCFullYear()}-${String(dateValue.getUTCMonth() + 1).padStart(2, '0')}-${String(dateValue.getUTCDate()).padStart(2, '0')}`;
    }
    return '';
};

const ITEMS_PER_LOAD = 20;
const SCROLL_THRESHOLD = 100; // pixels from the bottom to trigger loading

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
    const [statusFilter, setStatusFilter] = useState<StatusBoleto | 'Todos'>(StatusBoleto.VENCIDO); // Default to 'Vencido'
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Infinite scroll states
    const scrollRef = useRef<HTMLDivElement>(null);
    const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

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
        setDisplayCount(ITEMS_PER_LOAD); // Reset display count on filter change
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
        setErrors({}); // Clear errors on modal close
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingBoleto) return;
        const { name, value } = e.target;
        let finalValue: string | number = value;
        if (name === 'valor') {
            finalValue = Number(value.replace(/\D/g, '')) / 100;
        } else if (name === 'vencimento_br') {
            finalValue = applyDateMask(value);
        }
        setEditingBoleto(prev => ({ ...prev, [name]: finalValue }));

        // Clear error on change
        if (errors[name as keyof BoletoErrors]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name as keyof BoletoErrors];
                return newErrors;
            });
        }
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
        setConfirmAction({ action, message: `Deseja ${boletoToSave.id ? 'salvar as alterações' : 'adicionar este boleto'}?` });
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

                let importedCount = 0, duplicateCount = 0, invalidCount = 0;
                const existingKeys = new Set(boletos.map(b => `${b.fornecedor}|${b.pagador}|${b.vencimento}|${b.valor.toFixed(2)}`));
                const newBoletos: Boleto[] = [];

                for (const [index, row] of json.entries()) {
                    const fornecedor = row['fornecedor'] || row['Fornecedor'];
                    const pagador = row['pagador'] || row['Pagador'];
                    const vencimentoRaw = row['vencimento'] || row['Vencimento'];
                    const valorRaw = row['valor'] || row['Valor'];

                    if (!fornecedor || !pagador || !vencimentoRaw || valorRaw === undefined) { invalidCount++; continue; }
                    
                    const vencimentoISO = parseImportedDate(vencimentoRaw);
                    const valorNum = parseFloat(String(valorRaw).replace(',', '.'));

                    if (!vencimentoISO || isNaN(valorNum) || valorNum <= 0) { invalidCount++; continue; }

                    const newBoletoData = { fornecedor: String(fornecedor).trim(), pagador: String(pagador).trim(), vencimento: vencimentoISO, valor: valorNum };
                    const duplicateKey = `${newBoletoData.fornecedor}|${newBoletoData.pagador}|${newBoletoData.vencimento}|${newBoletoData.valor.toFixed(2)}`;
                    
                    if (existingKeys.has(duplicateKey)) { duplicateCount++; continue; }

                    newBoletos.push({ ...newBoletoData, id: `import-${Date.now()}-${index}`, pago: false });
                    existingKeys.add(duplicateKey);
                    importedCount++;
                }

                if (newBoletos.length > 0) setBoletos(prev => [...prev, ...newBoletos]);

                let feedback = `${importedCount} boletos importados.\n`;
                if (duplicateCount > 0) feedback += `${duplicateCount} duplicados ignorados.\n`;
                if (invalidCount > 0) feedback += `${invalidCount} linhas inválidas ignoradas.\n`;
                alert(feedback);

            } catch (err) {
                console.error("Erro ao processar XLSX:", err);
                alert('Erro ao ler o arquivo. Verifique as colunas (Fornecedor, Pagador, Vencimento, Valor).');
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

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, clientHeight, scrollHeight } = scrollRef.current;
            if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD && !isLoadingMore && displayCount < filteredBoletos.length) {
                setIsLoadingMore(true);
                setTimeout(() => {
                    setDisplayCount(prevCount => Math.min(prevCount + ITEMS_PER_LOAD, filteredBoletos.length));
                    setIsLoadingMore(false);
                }, 300); // Simulate network delay
            }
        }
    };

    return (
    <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
        <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls" />
        
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-4">
                
                <h2 className="text-2xl font-bold text-text-primary tracking-tight">Boletos a Pagar</h2>
            </div>
            <div className="flex items-center flex-wrap gap-2">
                <button onClick={handleExportXLSX} className="flex items-center gap-2 bg-white border border-border text-text-primary font-medium py-2 px-4 rounded-md hover:bg-secondary text-sm h-9"><DownloadIcon className="h-4 w-4"/>Exportar</button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-white border border-border text-text-primary font-medium py-2 px-4 rounded-md hover:bg-secondary text-sm h-9"><UploadIcon className="h-4 w-4"/>Importar</button>
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-medium py-2 px-4 rounded-md hover:bg-primary-hover text-sm h-9 shadow-sm"><PlusIcon className="h-4 w-4"/>Incluir</button>
            </div>
        </div>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.values(StatusBoleto) as StatusBoleto[]).map(status => {
                const total = totals[status] || { count: 0, value: 0 };
                const isActive = statusFilter === status;
                return (
                     <div key={status} onClick={() => setStatusFilter(status)} className={`p-4 rounded-lg border cursor-pointer transition-all ${isActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-gray-300'}`}>
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">{status}</p>
                        <p className={`text-xl font-bold ${status === StatusBoleto.VENCIDO ? 'text-danger' : status === StatusBoleto.PAGO ? 'text-success' : 'text-primary'}`}>{formatCurrency(total.value)}</p>
                        <p className="text-xs text-text-secondary mt-1">{total.count} boletos</p>
                    </div>
                );
            })}
        </div>

         <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 bg-white p-3 rounded-lg border border-border">
            <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                <input type="text" placeholder="Buscar por Fornecedor ou Pagador..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full sm:w-80 pl-10 pr-3 py-2 bg-white border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors h-9"/>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-4 w-4 text-text-secondary"/></div>
            </div>
             <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-secondary">Vencimento:</span>
                    <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-white border border-border rounded-md px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"/>
                    <span className="text-xs text-text-secondary">até</span>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-white border border-border rounded-md px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"/>
                </div>
                <button onClick={handleClearFilters} className="px-3 py-1.5 rounded-md bg-secondary hover:bg-gray-200 text-text-primary font-medium text-sm h-9 transition-colors">Limpar</button>
            </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden flex-grow shadow-sm">
            <div ref={scrollRef} onScroll={handleScroll} className="overflow-x-auto overflow-y-auto h-full"> {/* Make scroll container fill height */}
                 <table className="min-w-full divide-y divide-border text-sm text-left">
                    <thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider sticky top-0">
                        <tr>
                            <th className="px-6 py-3">Fornecedor</th>
                            <th className="px-6 py-3">Pagador</th>
                            <th className="px-6 py-3">Vencimento</th>
                            <th className="px-6 py-3">Dia</th>
                            <th className="px-6 py-3 text-right">Valor</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                        {filteredBoletos.length > 0 ? filteredBoletos.slice(0, displayCount).map(boleto => (
                            <tr key={boleto.id} className="hover:bg-secondary transition-colors">
                                <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{boleto.fornecedor}</td>
                                <td className="px-6 py-4 text-text-secondary whitespace-nowrap">{boleto.pagador}</td>
                                <td className="px-6 py-4 text-text-secondary whitespace-nowrap">{formatDateToBR(boleto.vencimento)}</td>
                                <td className="px-6 py-4 text-text-secondary">{getDayOfWeek(boleto.vencimento)}</td>
                                <td className="px-6 py-4 font-semibold text-text-primary text-right whitespace-nowrap">{formatCurrency(boleto.valor)}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${
                                        boleto.dynamicStatus === StatusBoleto.VENCIDO 
                                        ? 'bg-danger/20 text-danger border-danger/30' 
                                        : boleto.dynamicStatus === StatusBoleto.PAGO 
                                        ? 'bg-success/20 text-success border-success/30' 
                                        : 'bg-primary/20 text-primary border-primary/30'
                                    }`}>
                                        {boleto.dynamicStatus}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {!boleto.pago && <button onClick={() => handleMarkAsPaid(boleto)} title="Pagar" className="text-success p-1.5 rounded-md hover:bg-success/10 transition-colors"><CheckIcon className="h-4 w-4"/></button>}
                                        <button onClick={() => handleEditClick(boleto)} title="Editar" className="text-primary p-1.5 rounded-md hover:bg-primary/10 transition-colors"><EditIcon className="h-4 w-4"/></button>
                                        <button onClick={() => handleDeleteClick(boleto.id)} title="Excluir" className="text-danger p-1.5 rounded-md hover:bg-danger/10 transition-colors"><TrashIcon className="h-4 w-4"/></button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={7} className="text-center py-16">
                                    <div className="flex flex-col items-center text-text-secondary">
                                        <SearchIcon className="w-10 h-10 mb-3 text-gray-300"/>
                                        <h3 className="text-lg font-medium text-text-primary">Nenhum Boleto Encontrado</h3>
                                        <p className="text-sm">Tente ajustar os filtros ou inclua um novo boleto.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {isLoadingMore && (
                            <tr>
                                <td colSpan={7} className="text-center py-4 text-primary">
                                    <SpinnerIcon className="h-5 w-5 animate-spin mx-auto" />
                                    Carregando mais...
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {isModalOpen && editingBoleto && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                 <div className="bg-card rounded-lg shadow-lg border border-border w-full max-w-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-secondary/30">
                        <h3 className="text-lg font-bold text-text-primary">{editingBoleto.id ? 'Editar Boleto' : 'Novo Boleto'}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                             <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Fornecedor</label>
                            <input name="fornecedor" value={editingBoleto.fornecedor || ''} onChange={handleInputChange} className={`w-full bg-white border rounded-md px-3 py-2 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9 ${errors.fornecedor ? 'border-danger' : 'border-border'}`} />
                            {errors.fornecedor && <p className="text-danger text-xs mt-1">{errors.fornecedor}</p>}
                        </div>
                         <div>
                             <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Pagador</label>
                            <input name="pagador" value={editingBoleto.pagador || ''} onChange={handleInputChange} className={`w-full bg-white border rounded-md px-3 py-2 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9 ${errors.pagador ? 'border-danger' : 'border-border'}`} />
                            {errors.pagador && <p className="text-danger text-xs mt-1">{errors.pagador}</p>}
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Vencimento</label>
                                <input name="vencimento_br" value={editingBoleto.vencimento_br || ''} onChange={handleInputChange} placeholder="DD/MM/AAAA" className={`w-full bg-white border rounded-md px-3 py-2 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9 ${errors.vencimento ? 'border-danger' : 'border-border'}`} />
                                {errors.vencimento && <p className="text-danger text-xs mt-1">{errors.vencimento}</p>}
                            </div>
                            <div>
                                 <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">Valor</label>
                                <input name="valor" value={formatCurrency(editingBoleto.valor || 0)} onChange={handleInputChange} className={`w-full bg-white border rounded-md px-3 py-2 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none h-9 ${errors.valor ? 'border-danger' : 'border-border'}`} />
                                {errors.valor && <p className="text-danger text-xs mt-1">{errors.valor}</p>}
                            </div>
                        </div>
                    </div>
                     <div className="px-6 py-4 border-t border-border bg-secondary/30 flex justify-end gap-3">
                        <button onClick={handleCloseModal} className="px-4 py-2 rounded-md bg-white border border-border text-text-primary text-sm font-medium hover:bg-secondary transition-colors">Cancelar</button>
                        <button onClick={handleSaveChanges} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-colors">Salvar</button>
                    </div>
                </div>
            </div>
        )}

        {isConfirmOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-sm p-6">
                    <h3 className="text-lg font-bold mb-2 text-text-primary">Confirmar</h3>
                    <p className="text-sm text-text-secondary mb-6">{confirmAction.message}</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsConfirmOpen(false)} className="px-4 py-2 rounded-md bg-white border border-border text-text-primary text-sm font-medium hover:bg-secondary transition-colors">Cancelar</button>
                        <button onClick={handleConfirm} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover shadow-sm transition-colors">Confirmar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
    );
};

export default BoletosAPagar;