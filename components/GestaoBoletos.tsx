
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, DownloadIcon, EditIcon, UploadIcon, CheckIcon, CalendarClockIcon, SpinnerIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ArrowLeftIcon } from './icons';
import AutocompleteInput from './AutocompleteInput';
import DatePicker from './DatePicker';
import { useHideSidebarOnModal } from '../UIContext';

// Enum for status
enum StatusBoletoReceber {
  A_RECEBER = 'A Receber',
  VENCIDO = 'Vencido',
  RECEBIDO = 'Recebido',
}

// Data structure
interface BoletoReceber {
    id: string;
    credor: string; // Added field
    cliente: string;
    vencimento: string; // YYYY-MM-DD
    valor: number;
    recebido: boolean;
}

type BoletoErrors = Partial<Record<keyof Omit<BoletoReceber, 'id' | 'recebido'>, string>>;

// Helper functions
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

// ... (Rest of format functions same as original)
const formatDateToISO = (brDate: string): string => {
    if (!brDate || !/^\d{2}\/\d{2}\/\d{4}$/.test(brDate)) return '';
    const [day, month, year] = brDate.split('/');
    return `${year}-${month}-${day}`;
};

const isValidBRDate = (dateString: string): boolean => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false;
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

// Pagination Constants
const ITEMS_PER_PAGE = 20;

type SortConfig = { key: keyof BoletoReceber | 'dynamicStatus'; direction: 'asc' | 'desc' };

const BoletosAReceber: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const STORAGE_KEY = 'boletos_a_receber_data';

    const [boletos, setBoletos] = useState<BoletoReceber[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBoleto, setEditingBoleto] = useState<Partial<BoletoReceber> | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [errors, setErrors] = useState<BoletoErrors>({});
    
    const [searchTerm, setSearchTerm] = useState('');
    // CHANGE: Default status to 'Todos' to show data immediately
    const [statusFilter, setStatusFilter] = useState<StatusBoletoReceber | 'Todos'>('Todos');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);

    useHideSidebarOnModal(isModalOpen || isConfirmOpen);

    // --- Autocomplete Data Sources ---
    const uniqueCredores = useMemo(() => [...new Set(boletos.map(b => b.credor).filter(Boolean))].sort(), [boletos]);
    const uniqueClientes = useMemo(() => [...new Set(boletos.map(b => b.cliente).filter(Boolean))].sort(), [boletos]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(boletos));
    }, [boletos]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchTerm, dateRange, sortConfig]);

    const getDynamicStatus = useMemo(() => (boleto: BoletoReceber): StatusBoletoReceber => {
        if (boleto.recebido) return StatusBoletoReceber.RECEBIDO;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(boleto.vencimento + 'T00:00:00');
        return vencimento < hoje ? StatusBoletoReceber.VENCIDO : StatusBoletoReceber.A_RECEBER;
    }, []);

    const allBoletosWithStatus = useMemo(() => {
        return boletos.map(b => ({ ...b, dynamicStatus: getDynamicStatus(b) }));
    }, [boletos, getDynamicStatus]);

    const filteredBoletos = useMemo(() => {
        const filtered = allBoletosWithStatus.filter(boleto => {
            const statusMatch = statusFilter === 'Todos' || boleto.dynamicStatus === statusFilter;
            const searchMatch = !searchTerm || 
                                boleto.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (boleto.credor && boleto.credor.toLowerCase().includes(searchTerm.toLowerCase()));
            const startDateMatch = !dateRange.start || boleto.vencimento >= dateRange.start;
            const endDateMatch = !dateRange.end || boleto.vencimento <= dateRange.end;
            return statusMatch && searchMatch && startDateMatch && endDateMatch;
        });

        if (sortConfig) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'asc' 
                        ? aValue.localeCompare(bValue, undefined, { sensitivity: 'base' }) 
                        : bValue.localeCompare(aValue, undefined, { sensitivity: 'base' });
                }
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // Default sort by vencimento
            filtered.sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
        }

        return filtered;
    }, [allBoletosWithStatus, statusFilter, searchTerm, dateRange, sortConfig]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredBoletos.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedBoletos = filteredBoletos.slice(startIndex, startIndex + ITEMS_PER_PAGE);


    const totals = useMemo(() => {
        return allBoletosWithStatus.reduce((acc, boleto) => {
            const searchMatch = !searchTerm || 
                                boleto.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (boleto.credor && boleto.credor.toLowerCase().includes(searchTerm.toLowerCase()));
            const startDateMatch = !dateRange.start || boleto.vencimento >= dateRange.start;
            const endDateMatch = !dateRange.end || boleto.vencimento <= dateRange.end;
            
            if (searchMatch && startDateMatch && endDateMatch) {
                const status = boleto.dynamicStatus;
                if (!acc[status]) acc[status] = { count: 0, value: 0 };
                acc[status].count++;
                acc[status].value += boleto.valor;
            }
            return acc;
        }, {} as Record<StatusBoletoReceber, { count: number; value: number }>);
    }, [allBoletosWithStatus, searchTerm, dateRange]);

    const handleOpenAddModal = () => {
        setErrors({});
        setEditingBoleto({ vencimento: '', recebido: false, credor: '' });
        setIsModalOpen(true);
    };

    // Global Event Listener for Add Action
    useEffect(() => {
        const handleTrigger = () => handleOpenAddModal();
        window.addEventListener('trigger:add-boleto-receber', handleTrigger);
        return () => window.removeEventListener('trigger:add-boleto-receber', handleTrigger);
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === '+') {
                event.preventDefault();
                handleOpenAddModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleEditClick = (boleto: BoletoReceber) => {
        setErrors({});
        setEditingBoleto({ ...boleto });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        const action = () => setBoletos(prev => prev.filter(b => b.id !== id));
        setConfirmAction({ action, message: 'Tem certeza que deseja excluir este boleto?' });
        setIsConfirmOpen(true);
    };

    const handleResetTable = () => {
        const action = () => {
            setBoletos([]);
        };
        setConfirmAction({ 
            action, 
            message: 'ATENÇÃO: Tem certeza que deseja apagar TODOS os registros da tabela? Esta ação é irreversível e deve ser feita antes de importar uma nova lista.' 
        });
        setIsConfirmOpen(true);
    };

    const handleMarkAsReceived = (boleto: BoletoReceber) => {
        if (boleto.recebido) return;
        const action = () => setBoletos(prev => prev.map(b => b.id === boleto.id ? { ...b, recebido: true } : b));
        setConfirmAction({ action, message: `Confirmar recebimento do boleto de ${boleto.cliente}?` });
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingBoleto(null);
        setErrors({});
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingBoleto) return;
        const { name, value } = e.target;
        let finalValue: string | number | boolean = value;

        if (name === 'valor') {
            let numericValue = value.replace(/\D/g, '');
            if (numericValue === '') numericValue = '0';
            finalValue = Number(numericValue) / 100;
        }

        setEditingBoleto(prev => ({ ...prev, [name]: finalValue }));
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
        if (!editingBoleto.credor?.trim()) newErrors.credor = "Credor é obrigatório.";
        if (!editingBoleto.cliente?.trim()) newErrors.cliente = "Cliente é obrigatório.";
        if (!editingBoleto.vencimento) newErrors.vencimento = "Vencimento inválido.";
        if (!editingBoleto.valor || editingBoleto.valor <= 0) newErrors.valor = "Valor deve ser maior que zero.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveChanges = () => {
        if (!validate() || !editingBoleto) return;
        const boletoToSave = {
            ...editingBoleto,
        };
        const action = () => {
            if (boletoToSave.id) {
                setBoletos(prev => prev.map(b => b.id === boletoToSave.id ? (boletoToSave as BoletoReceber) : b));
            } else {
                setBoletos(prev => [...prev, { ...boletoToSave, id: `boleto-receber-${Date.now()}`, recebido: false } as BoletoReceber]);
            }
            handleCloseModal();
        };
        setConfirmAction({ action, message: `Deseja ${boletoToSave.id ? 'salvar as alterações' : 'adicionar este boleto'}?` });
        setIsConfirmOpen(true);
    };

    const handleConfirm = () => {
        confirmAction.action?.();
        setIsConfirmOpen(false);
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
                let updatedCount = 0;

                setBoletos(prevBoletos => {
                    // Create a map of existing boletos for quick lookup using a composite key
                    // Key: Credor|Cliente|Vencimento|Valor
                    const boletoMap = new Map<string, BoletoReceber>();
                    
                    prevBoletos.forEach(b => {
                        const key = `${b.credor.trim().toLowerCase()}|${b.cliente.trim().toLowerCase()}|${b.vencimento}|${b.valor.toFixed(2)}`;
                        boletoMap.set(key, b);
                    });

                    json.forEach((row, index) => {
                        // ... (Import logic preserved)
                        const credor = row['Credor'] || row['credor'] || row['CREDOR'] || 
                                       row['Cedente'] || row['cedente'] || row['CEDENTE'] ||
                                       row['Empresa'] || row['EMPRESA'];

                        const cliente = row['Cliente'] || row['cliente'] || row['CLIENTE'] || 
                                        row['Sacado'] || row['sacado'] || row['SACADO'] ||
                                        row['Pagador'] || row['Nome'] || row['Nome Fantasia'];

                        const vencimentoRaw = row['Vencimento'] || row['vencimento'] || row['VENCIMENTO'] || 
                                              row['Data Vencimento'] || row['Dt Venc'] || row['Data'];

                        const valorRaw = row['Valor'] || row['valor'] || row['VALOR'] || 
                                         row['Valor Título'] || row['Valor Original'] || row['Valor Liquido'];

                        const status = row['Status'] || row['status'];

                        if (cliente && vencimentoRaw && valorRaw !== undefined) {
                             const vencimentoISO = parseImportedDate(vencimentoRaw);
                             let valorNum = 0;
                             
                             if (typeof valorRaw === 'number') {
                                 valorNum = valorRaw;
                             } else {
                                 const cleanedValor = String(valorRaw).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.').trim();
                                 valorNum = parseFloat(cleanedValor);
                             }

                             if (vencimentoISO && !isNaN(valorNum)) {
                                 const credorStr = String(credor || 'Desconhecido').trim();
                                 const clienteStr = String(cliente).trim();
                                 const isRecebido = String(status).toLowerCase() === 'recebido' || String(status).toLowerCase() === 'pago' || String(status).toLowerCase() === 'liquidado';

                                 // Generate composite key to check for duplicates
                                 const importKey = `${credorStr.toLowerCase()}|${clienteStr.toLowerCase()}|${vencimentoISO}|${valorNum.toFixed(2)}`;

                                 if (boletoMap.has(importKey)) {
                                     // Update existing record
                                     const existingBoleto = boletoMap.get(importKey)!;
                                     // Update status to received if imported file says so, even if previously it wasn't
                                     if (isRecebido && !existingBoleto.recebido) {
                                         boletoMap.set(importKey, {
                                             ...existingBoleto,
                                             recebido: true
                                         });
                                         updatedCount++;
                                     }
                                 } else {
                                     // Insert new record
                                     const newBoleto: BoletoReceber = {
                                         id: `boleto-import-${Date.now()}-${index}`,
                                         credor: credorStr,
                                         cliente: clienteStr,
                                         vencimento: vencimentoISO,
                                         valor: valorNum,
                                         recebido: isRecebido
                                     };
                                     boletoMap.set(importKey, newBoleto);
                                     importedCount++;
                                 }
                             }
                        }
                    });

                    return Array.from(boletoMap.values());
                });

                if (importedCount > 0 || updatedCount > 0) {
                    alert(`Processamento concluído!\n\n- Novos boletos importados: ${importedCount}\n- Boletos atualizados: ${updatedCount}`);
                } else {
                    alert('Nenhum dado novo ou atualizado foi encontrado no arquivo.');
                }

            } catch (error) {
                console.error("Erro na importação:", error);
                alert("Erro ao importar arquivo. Verifique se é um arquivo Excel válido (.xlsx, .xls).");
            } finally {
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExportXLSX = () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) { alert("Biblioteca XLSX não disponível."); return; }
        
        const dataToExport = filteredBoletos.map(b => ({
            'Credor': b.credor,
            'Cliente': b.cliente,
            'Vencimento': formatDateToBR(b.vencimento),
            'Valor': b.valor,
            'Status': b.dynamicStatus
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Boletos a Receber');
        XLSX.writeFile(workbook, `boletos_a_receber_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const requestSort = (key: keyof BoletoReceber | 'dynamicStatus') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (key: keyof BoletoReceber | 'dynamicStatus') => {
        if (sortConfig?.key === key) {
            return <ChevronDownIcon className={`h-3 w-3 inline-block ml-1 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />;
        }
        return null;
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full max-w-[1600px] mx-auto">
            {/* ... (Header and filters logic remains unchanged, actions map to handlers above) ... */}
            <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls" />
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    {onBack && (
                      <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold transition-colors h-10 text-sm shadow-sm">
                          <ArrowLeftIcon className="h-4 w-4" />
                          Voltar
                      </button>
                    )}
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Boletos a Receber</h2>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                    <button onClick={handleResetTable} className="flex items-center gap-2 bg-white border border-red-200 text-red-700 font-medium py-2 px-4 rounded-full hover:bg-red-50 text-sm h-10 transition-colors shadow-sm" title="Apagar todos os registros">
                        <TrashIcon className="h-4 w-4" /> Resetar Tabela
                    </button>
                    <button onClick={handleExportXLSX} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-full hover:bg-gray-50 text-sm h-10 transition-colors shadow-sm">
                        <DownloadIcon className="h-4 w-4" /> Exportar
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-full hover:bg-gray-50 text-sm h-10 transition-colors shadow-sm">
                        <UploadIcon className="h-4 w-4" /> Importar
                    </button>
                    <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-white border border-gray-200 text-primary font-medium py-2 px-4 rounded-full hover:bg-orange-50 hover:border-orange-200 text-sm h-10 shadow-sm transition-colors">
                        <PlusIcon className="h-4 w-4" /> Novo Boleto
                    </button>
                </div>
            </div>

            {/* ... (Cards and Table rendering) ... */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(Object.values(StatusBoletoReceber) as StatusBoletoReceber[]).map(status => {
                    const total = totals[status] || { count: 0, value: 0 };
                    let bgClass = 'bg-white hover:border-orange-200';
                    let ringClass = '';
                    let textClass = 'text-primary';

                    if (statusFilter === status) {
                        bgClass = 'bg-orange-50 border-primary';
                        ringClass = 'ring-1 ring-primary';
                    }
                    if (status === StatusBoletoReceber.VENCIDO) {
                        textClass = 'text-danger';
                        if (statusFilter === status) { bgClass = 'bg-red-50 border-danger'; ringClass = 'ring-1 ring-danger'; }
                    } else if (status === StatusBoletoReceber.RECEBIDO) {
                        textClass = 'text-success';
                        if (statusFilter === status) { bgClass = 'bg-green-50 border-success'; ringClass = 'ring-1 ring-success'; }
                    }

                    return (
                        <div 
                            key={status} 
                            onClick={() => setStatusFilter(status === statusFilter ? 'Todos' : status)} 
                            className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${bgClass} ${ringClass} border-gray-200`}
                        >
                            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">{status}</p>
                            <p className={`text-xl font-bold ${textClass}`}>
                                {formatCurrency(total.value)}
                            </p>
                            <p className="text-xs text-text-secondary mt-1">{total.count} boletos</p>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 bg-white p-3 rounded-2xl border border-border shadow-sm">
                <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                    <input 
                        type="text" 
                        placeholder="Buscar Credor ou Cliente..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full sm:w-80 pl-10 pr-3 bg-secondary border-transparent rounded-xl text-sm text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-10"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-4 w-4 text-text-secondary"/></div>
                </div>
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                    <div className="flex items-center gap-2 bg-secondary rounded-lg p-1">
                        <DatePicker 
                            value={dateRange.start} 
                            onChange={(val) => setDateRange(prev => ({ ...prev, start: val }))} 
                            placeholder="Início"
                            className="w-28 h-9"
                        />
                        <span className="text-xs text-text-secondary font-medium">até</span>
                        <DatePicker 
                            value={dateRange.end} 
                            onChange={(val) => setDateRange(prev => ({ ...prev, end: val }))} 
                            placeholder="Fim"
                            className="w-28 h-9"
                        />
                    </div>
                    <button onClick={() => { setSearchTerm(''); setStatusFilter('Todos'); setDateRange({start: '', end: ''}); setSortConfig(null); }} className="px-4 py-2 rounded-lg bg-secondary hover:bg-border text-text-primary font-medium text-sm transition-colors">Limpar</button>
                </div>
            </div>

            <div className="bg-white border border-border rounded-2xl overflow-hidden flex-grow shadow-sm flex flex-col">
                <div className="overflow-x-auto overflow-y-auto flex-grow custom-scrollbar">
                    <table className="min-w-full divide-y divide-border text-sm text-left">
                        <thead className="bg-gray-50 text-text-secondary font-semibold uppercase text-xs tracking-wider sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => requestSort('dynamicStatus')}>Status {renderSortIcon('dynamicStatus')}</th>
                                <th className="px-6 py-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => requestSort('credor')}>Credor {renderSortIcon('credor')}</th>
                                <th className="px-6 py-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => requestSort('cliente')}>Cliente {renderSortIcon('cliente')}</th>
                                <th className="px-6 py-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => requestSort('vencimento')}>Vencimento {renderSortIcon('vencimento')}</th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:text-primary transition-colors select-none" onClick={() => requestSort('valor')}>Valor {renderSortIcon('valor')}</th>
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                            {paginatedBoletos.length > 0 ? paginatedBoletos.map(boleto => (
                                <tr key={boleto.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-3 text-center w-32">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border inline-block w-24 ${
                                            boleto.dynamicStatus === StatusBoletoReceber.VENCIDO ? 'bg-red-50 text-red-700 border-red-100' :
                                            boleto.dynamicStatus === StatusBoletoReceber.RECEBIDO ? 'bg-green-50 text-green-700 border-green-100' :
                                            'bg-orange-50 text-orange-700 border-orange-100'
                                        }`}>
                                            {boleto.dynamicStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 font-medium text-text-primary whitespace-nowrap">{boleto.credor || '-'}</td>
                                    <td className="px-6 py-3 text-text-secondary whitespace-nowrap">{boleto.cliente}</td>
                                    <td className="px-6 py-3 text-text-secondary whitespace-nowrap tabular-nums">{formatDateToBR(boleto.vencimento)}</td>
                                    <td className="px-6 py-3 text-right font-semibold text-text-primary whitespace-nowrap tabular-nums">{formatCurrency(boleto.valor)}</td>
                                    <td className="px-6 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {!boleto.recebido && (
                                                <button onClick={() => handleMarkAsReceived(boleto)} title="Receber" className="text-success p-1.5 rounded-md hover:bg-success/10 transition-colors">
                                                    <CheckIcon className="h-4 w-4"/>
                                                </button>
                                            )}
                                            <button onClick={() => handleEditClick(boleto)} title="Editar" className="text-primary p-1.5 rounded-md hover:bg-primary/10 transition-colors">
                                                <EditIcon className="h-4 w-4"/>
                                            </button>
                                            <button onClick={() => handleDeleteClick(boleto.id)} title="Excluir" className="text-danger p-1.5 rounded-md hover:bg-danger/10 transition-colors">
                                                <TrashIcon className="h-4 w-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-16">
                                        <div className="flex flex-col items-center text-text-secondary opacity-60">
                                            <SearchIcon className="w-10 h-10 mb-3 text-gray-300"/>
                                            <h3 className="text-lg font-medium text-text-primary">Nenhum Boleto Encontrado</h3>
                                            <p className="text-sm">Tente ajustar os filtros ou adicione um novo boleto.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Footer */}
                <div className="flex justify-between items-center p-4 border-t border-border bg-gray-50 text-xs text-text-secondary">
                    <div>
                        Exibindo {filteredBoletos.length > 0 ? startIndex + 1 : 0} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredBoletos.length)} de {filteredBoletos.length} registros
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Página Anterior"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </button>
                        <span className="font-medium">Página {currentPage} de {Math.max(1, totalPages)}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Próxima Página"
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {isModalOpen && editingBoleto && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="shrink-0 p-6 pb-4 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-text-primary text-center">{editingBoleto.id ? 'Editar Boleto' : 'Novo Boleto a Receber'}</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Credor (Cedente)</label>
                                <AutocompleteInput
                                    name="credor"
                                    value={editingBoleto.credor || ''}
                                    onChange={handleInputChange}
                                    suggestions={uniqueCredores}
                                    className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.credor ? 'border-danger' : ''}`}
                                    placeholder="Nome do Credor"
                                />
                                {errors.credor && <p className="text-danger text-xs mt-1 ml-1">{errors.credor}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Cliente (Sacado)</label>
                                <AutocompleteInput
                                    name="cliente"
                                    value={editingBoleto.cliente || ''}
                                    onChange={handleInputChange}
                                    suggestions={uniqueClientes}
                                    className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.cliente ? 'border-danger' : ''}`}
                                    placeholder="Nome do Cliente"
                                />
                                {errors.cliente && <p className="text-danger text-xs mt-1 ml-1">{errors.cliente}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <DatePicker 
                                        label="Vencimento"
                                        value={editingBoleto.vencimento || ''} 
                                        onChange={(val) => setEditingBoleto(prev => ({...prev, vencimento: val}))} 
                                        placeholder="Selecione"
                                    />
                                    {errors.vencimento && <p className="text-danger text-xs mt-1 ml-1">{errors.vencimento}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Valor</label>
                                    <input name="valor" value={formatCurrency(editingBoleto.valor || 0)} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.valor ? 'border-danger' : ''}`} />
                                    {errors.valor && <p className="text-danger text-xs mt-1 ml-1">{errors.valor}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="shrink-0 p-6 pt-4 border-t border-gray-100 flex justify-center gap-3 bg-gray-50">
                            <button onClick={handleCloseModal} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-text-primary font-semibold hover:bg-gray-50 transition-colors shadow-sm">Cancelar</button>
                            <button onClick={handleSaveChanges} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-primary font-bold shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {isConfirmOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
                        <h3 className="text-xl font-bold mb-4 text-text-primary">Confirmar</h3>
                        <p className="text-text-secondary mb-8">{confirmAction.message}</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setIsConfirmOpen(false)} className="px-6 py-2.5 rounded-full bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleConfirm} className="px-6 py-2.5 rounded-full bg-white border border-gray-200 text-primary font-bold shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BoletosAReceber;
