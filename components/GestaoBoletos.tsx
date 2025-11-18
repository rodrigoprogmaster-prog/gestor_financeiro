import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, DownloadIcon, EditIcon, UploadIcon, CheckIcon, CalendarClockIcon, ArrowLeftIcon } from './icons';
import { ArrowDownCircleIcon, ArrowUpCircleIcon } from './icons'; // Reusing icons

// Enum for status
enum StatusCheque {
  A_DEPOSITAR = 'A Depositar',
  COMPENSADO = 'Compensado',
  DEVOLVIDO = 'Devolvido',
}

// Data structure
interface Cheque {
  id: string;
  emitente: string;
  numero: string;
  valor: number;
  dataVencimento: string; // Vencimento
  loja: string;
  contaDeposito: string;
  dataDeposito: string; // Data Depósito
  status: StatusCheque;
}

const statusOrder: Record<string, number> = {
    'Vencido': 1,
    [StatusCheque.A_DEPOSITAR]: 2,
    [StatusCheque.DEVOLVIDO]: 3,
    [StatusCheque.COMPENSADO]: 4,
};


// Helper functions for date manipulation
const formatDateToBR = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const [year, month, day] = isoDate.split('-');
    // Create a UTC date to avoid timezone issues
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.toLocaleDateString('pt-BR', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
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
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


type ChequeErrors = Partial<Record<keyof Omit<Cheque, 'id' | 'status'>, string>>;

const newChequeTemplate: Omit<Cheque, 'id'> = {
  emitente: '',
  numero: '',
  valor: 0,
  dataVencimento: '',
  loja: '',
  contaDeposito: '',
  dataDeposito: new Date().toISOString().split('T')[0],
  status: StatusCheque.A_DEPOSITAR,
};

const parseStatus = (statusString: string): StatusCheque => {
    const s = statusString?.toLowerCase().trim();
    if (s === 'compensado') return StatusCheque.COMPENSADO;
    if (s === 'devolvido') return StatusCheque.DEVOLVIDO;
    return StatusCheque.A_DEPOSITAR;
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

// Constants for virtualization
const ROW_HEIGHT = 52; // Fixed row height in pixels
const OVERSCAN = 5;    // Number of rows to render outside the viewport for smoother scrolling

// This component will now manage checks instead of just being a wrapper for an iframe.
const GerenciadorCheques: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const STORAGE_KEY = 'gerenciador_cheques_data';

  const [cheques, setCheques] = useState<Cheque[]>(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    return savedData ? JSON.parse(savedData) : [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Partial<Cheque> & { dataVencimento_br?: string; dataDeposito_br?: string } | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
  const [errors, setErrors] = useState<ChequeErrors>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [chequeParaAcao, setChequeParaAcao] = useState<Cheque | null>(null);
  
  // Reminder state
  const [lembreteCheques, setLembreteCheques] = useState<Cheque[]>([]);
  const [isLembreteModalOpen, setIsLembreteModalOpen] = useState(false);
  
  // Virtualization refs and state
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);


  const getDynamicStatus = useMemo(() => (cheque: Cheque): string => {
    if (cheque.status === StatusCheque.A_DEPOSITAR) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        // Date string is YYYY-MM-DD, which JS new Date() interprets as local time midnight
        const vencimento = new Date(cheque.dataVencimento + 'T00:00:00');
        if (vencimento < hoje) {
            return 'Vencido';
        }
    }
    return cheque.status;
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cheques));
  }, [cheques]);

  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hojeLocalISO = `${year}-${month}-${day}`;

    const chequesVencendoHoje = cheques.filter(cheque => 
        cheque.dataVencimento === hojeLocalISO && 
        getDynamicStatus(cheque) === StatusCheque.A_DEPOSITAR
    );

    if (chequesVencendoHoje.length > 0) {
        setLembreteCheques(chequesVencendoHoje);
        setIsLembreteModalOpen(true);
    }
}, [cheques, getDynamicStatus]);

    useEffect(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        const updateHeight = () => {
            setContainerHeight(container.clientHeight);
        };

        updateHeight(); // Set initial height

        // Use ResizeObserver for robust height updates
        const resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(container);

        // Cleanup
        return () => resizeObserver.unobserve(container);
    }, []); // Runs only once on mount

  const allChequesWithDynamicStatus = useMemo(() => {
    return cheques.map(cheque => ({...cheque, dynamicStatus: getDynamicStatus(cheque)}));
  }, [cheques, getDynamicStatus]);

  const filteredCheques = useMemo(() => {
    const filtered = allChequesWithDynamicStatus.filter(cheque => {
        const statusMatch = statusFilter === 'Todos' || cheque.dynamicStatus === statusFilter;
        
        const searchMatch = !searchTerm || Object.values(cheque).some(value =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return statusMatch && searchMatch;
    });

    return filtered.sort((a, b) => {
        const statusA = statusOrder[a.dynamicStatus] || 99;
        const statusB = statusOrder[b.dynamicStatus] || 99;
        if (statusA !== statusB) {
            return statusA - statusB;
        }
        // Secondary sort by due date (vencimento) ascending
        return new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime();
    });
  }, [allChequesWithDynamicStatus, searchTerm, statusFilter]);

  // Virtualization calculations
    const numVisibleItems = Math.ceil(containerHeight / ROW_HEIGHT);
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const endIndex = Math.min(
        filteredCheques.length,
        startIndex + numVisibleItems + OVERSCAN * 2
    );

    const visibleCheques = useMemo(() => {
        return filteredCheques.slice(startIndex, endIndex);
    }, [filteredCheques, startIndex, endIndex]);

  const totals = useMemo(() => {
    const result = {
        aDepositar: { count: 0, value: 0 },
        compensado: { count: 0, value: 0 },
        devolvido: { count: 0, value: 0 },
        vencido: { count: 0, value: 0 },
    };

    // Calculate totals based on all cheques, not just filtered ones for the cards.
    allChequesWithDynamicStatus.forEach(cheque => {
        const { dynamicStatus, valor } = cheque;

        switch (dynamicStatus) {
            case 'Vencido':
                result.vencido.count++;
                result.vencido.value += valor;
                break;
            case StatusCheque.A_DEPOSITAR:
                result.aDepositar.count++;
                result.aDepositar.value += valor;
                break;
            case StatusCheque.COMPENSADO:
                result.compensado.count++;
                result.compensado.value += valor;
                break;
            case StatusCheque.DEVOLVIDO:
                result.devolvido.count++;
                result.devolvido.value += valor;
                break;
        }
    });

    return result;
  }, [allChequesWithDynamicStatus]);


  const handleOpenAddModal = () => {
    setErrors({});
    setEditingCheque({
      ...newChequeTemplate,
      dataDeposito_br: formatDateToBR(newChequeTemplate.dataDeposito),
      dataVencimento_br: '',
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (cheque: Cheque) => {
    setErrors({});
    setEditingCheque({
      ...cheque,
      dataVencimento_br: formatDateToBR(cheque.dataVencimento),
      dataDeposito_br: formatDateToBR(cheque.dataDeposito),
    });
    setIsModalOpen(true);
  };
  
  const handleDeleteClick = (id: string) => {
    const action = () => setCheques(prev => prev.filter(c => c.id !== id));
    setConfirmAction({ action, message: "Tem certeza que deseja excluir este cheque?" });
    setIsConfirmOpen(true);
  };

  const handleDoubleClickRow = (cheque: Cheque) => {
    if (getDynamicStatus(cheque) === StatusCheque.COMPENSADO) return; // Can't change a compensated check
    setChequeParaAcao(cheque);
  };
  
  const handleUpdateStatus = (newStatus: StatusCheque) => {
    if (!chequeParaAcao) return;

    const chequeSelecionado = chequeParaAcao; // Capture the current cheque
    setChequeParaAcao(null); // Close the action modal immediately

    const action = () => {
        setCheques(prev => prev.map(c => 
            c.id === chequeSelecionado.id ? { ...c, status: newStatus } : c
        ));
    };

    setConfirmAction({
        action,
        message: `Deseja marcar o cheque Nº ${chequeSelecionado.numero} como '${newStatus}'?`
    });
    setIsConfirmOpen(true);
  };


  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCheque(null);
  };
  
  const handleConfirm = () => {
    confirmAction.action?.();
    setIsConfirmOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editingCheque) return;
    const { name, value } = e.target;
    let finalValue: string | number = value;

    if (name === 'valor') {
        let numericValue = value.replace(/\D/g, '');
        if (numericValue === '') numericValue = '0';
        finalValue = Number(numericValue) / 100;
    } else if (name.startsWith('data')) {
        finalValue = applyDateMask(value);
    }
    
    setEditingCheque(prev => ({ ...prev, [name]: finalValue }));
  };
  
  const validate = (): boolean => {
    if (!editingCheque) return false;
    const newErrors: ChequeErrors = {};
    if (!editingCheque.emitente?.trim()) newErrors.emitente = "Emitente é obrigatório.";
    if (!editingCheque.numero?.trim()) newErrors.numero = "Número do cheque é obrigatório.";
    if (!editingCheque.loja?.trim()) newErrors.loja = "Loja é obrigatória.";
    if (!editingCheque.contaDeposito?.trim()) newErrors.contaDeposito = "Conta de Depósito é obrigatória.";
    if (!editingCheque.valor || editingCheque.valor <= 0) newErrors.valor = "Valor deve ser maior que zero.";
    if (!editingCheque.dataVencimento_br || !isValidBRDate(editingCheque.dataVencimento_br)) newErrors.dataVencimento = "Data de vencimento inválida.";
    if (!editingCheque.dataDeposito_br || !isValidBRDate(editingCheque.dataDeposito_br)) newErrors.dataDeposito = "Data de depósito inválida.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSaveChanges = () => {
    if (!validate() || !editingCheque) return;
    
    const chequeToSave = {
        ...editingCheque,
        dataVencimento: formatDateToISO(editingCheque.dataVencimento_br!),
        dataDeposito: formatDateToISO(editingCheque.dataDeposito_br!),
    };
    
    const action = () => {
        if (chequeToSave.id) {
            setCheques(prev => prev.map(c => c.id === chequeToSave.id ? (chequeToSave as Cheque) : c));
        } else {
            setCheques(prev => [...prev, { ...newChequeTemplate, ...chequeToSave, id: `cheque-${Date.now()}` }]);
        }
        handleCloseModal();
    };
    
    setConfirmAction({ action, message: `Deseja ${editingCheque.id ? 'salvar as alterações' : 'adicionar este cheque'}?`});
    setIsConfirmOpen(true);
  };
  
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = (window as any).XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = (window as any).XLSX.utils.sheet_to_json(worksheet, { raw: true });

                const existingKeys = new Set(cheques.map(c => `${c.numero}-${c.contaDeposito}`));

                const newCheques: Cheque[] = json.map((row, index) => {
                    const numero = row['Número'] || row['Numero'];
                    const contaDeposito = row['Conta Depósito'] || row['Conta Deposito'];
                    
                    if (!numero || !contaDeposito || existingKeys.has(`${numero}-${contaDeposito}`)) {
                        return null;
                    }

                    const status = row['Status'];
                    const vencimento = row['Vencimento'];
                    const emitente = row['Emitente'];
                    const valor = row['Valor'];
                    const loja = row['Loja'];
                    const dataDeposito = row['Data Depósito'] || row['Data Deposito'];

                    const dataVencimentoISO = parseImportedDate(vencimento);
                    if (!dataVencimentoISO) return null; // Skip if vencimento date is invalid

                    const dataDepositoISO = parseImportedDate(dataDeposito);

                    return {
                        id: `cheque-${Date.now()}-${index}`,
                        emitente: String(emitente || ''),
                        numero: String(numero),
                        valor: Number(valor || 0),
                        dataVencimento: dataVencimentoISO,
                        loja: String(loja || ''),
                        contaDeposito: String(contaDeposito),
                        dataDeposito: dataDepositoISO || new Date().toISOString().split('T')[0],
                        status: parseStatus(String(status || '')),
                    };
                }).filter((c): c is Cheque => c !== null);

                if (newCheques.length > 0) {
                     setCheques(prev => [...prev, ...newCheques]);
                     alert(`${newCheques.length} novos cheques importados com sucesso!`);
                } else {
                    alert('Nenhum cheque novo encontrado para importar. Cheques duplicados (mesmo número e conta depósito) ou com data de vencimento inválida são ignorados.');
                }

            } catch (error) {
                console.error("Erro ao processar arquivo XLSX:", error);
                alert('Ocorreu um erro ao ler o arquivo. Verifique o formato e os cabeçalhos obrigatórios: Status, Vencimento, Emitente, Número, Valor, Loja, Conta Depósito, Data Depósito.');
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleBackup = () => {
        const XLSX = (window as any).XLSX;
        const dataToExport = cheques.map(c => ({
            'Status': getDynamicStatus(c),
            'Vencimento': formatDateToBR(c.dataVencimento),
            'Emitente': c.emitente,
            'Número': c.numero,
            'Valor': c.valor,
            'Loja': c.loja,
            'Conta Depósito': c.contaDeposito,
            'Data Depósito': formatDateToBR(c.dataDeposito),
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Backup Cheques');
        XLSX.writeFile(workbook, `backup_cheques_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handleExportDevolvidos = () => {
        const devolvidos = cheques.filter(c => getDynamicStatus(c) === StatusCheque.DEVOLVIDO);
        
        if (devolvidos.length === 0) {
            alert('Nenhum cheque devolvido para exportar.');
            return;
        }

        // Group by Loja, then by Emitente
        const grouped = devolvidos.reduce<Record<string, Record<string, Cheque[]>>>((acc, cheque) => {
            if (!acc[cheque.loja]) {
                acc[cheque.loja] = {};
            }
            if (!acc[cheque.loja][cheque.emitente]) {
                acc[cheque.loja][cheque.emitente] = [];
            }
            acc[cheque.loja][cheque.emitente].push(cheque);
            return acc;
        }, {});

        const aoaData: any[][] = [];
        aoaData.push(['Relatório de Cheques Devolvidos', null, null, null]); // Title
        aoaData.push([]); // Spacer

        let totalGeral = 0;

        // Iterate over lojas, sorted alphabetically
        for (const loja of Object.keys(grouped).sort()) {
            aoaData.push([`Loja: ${loja}`, null, null, null]); // Loja Header
            let totalLoja = 0;

            // Iterate over emitentes in the loja, sorted alphabetically
            for (const emitente of Object.keys(grouped[loja]).sort()) {
                aoaData.push([`Emitente: ${emitente}`, null, null, null]); // Emitente Header
                aoaData.push(['Número do Cheque', 'Vencimento', 'Valor']); // Cheque headers
                
                let totalEmitente = 0;
                const chequesDoEmitente = grouped[loja][emitente];
                
                // List individual cheques for the emitente
                for (const cheque of chequesDoEmitente) {
                    aoaData.push([cheque.numero, formatDateToBR(cheque.dataVencimento), cheque.valor]);
                    totalEmitente += cheque.valor;
                }
                
                // Subtotal for emitente
                aoaData.push(['Subtotal Emitente:', null, totalEmitente]);
                aoaData.push([]); // Spacer
                totalLoja += totalEmitente;
            }

            // Total for loja
            aoaData.push([`Total da Loja ${loja}:`, null, totalLoja]);
            aoaData.push([]); // Spacer
            totalGeral += totalLoja;
        }
        
        // Grand Total
        aoaData.push([]);
        aoaData.push(['TOTAL GERAL DEVOLVIDO:', null, totalGeral]);

        const XLSX = (window as any).XLSX;
        const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

        // Styling and formatting
        worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }]; // Merge title

        const range = XLSX.utils.decode_range(worksheet['!ref'] as string);
        for(let R = 2; R <= range.e.r; ++R) { // Start from row 2 to avoid headers
            const cellRef = XLSX.utils.encode_cell({c: 2, r: R}); // Column C for values
            if (worksheet[cellRef] && typeof worksheet[cellRef].v === 'number') {
                worksheet[cellRef].t = 'n';
                worksheet[cellRef].z = 'R$ #,##0.00';
            }
        }
        
        worksheet['!cols'] = [
            { wch: 40 }, // A: Loja/Emitente/Numero
            { wch: 15 }, // B: Vencimento
            { wch: 20 }, // C: Valor
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cheques Devolvidos');
        XLSX.writeFile(workbook, `devolvidos_detalhado_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handleFilterClick = (status: string) => {
        setStatusFilter(prev => prev === status ? 'Todos' : status);
    };

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
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Gerenciador de Cheques</h2>
            </div>
            <div className="flex items-center flex-wrap gap-2">
                <button onClick={handleExportDevolvidos} className="flex items-center gap-2 bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors duration-300 h-10">
                    <DownloadIcon className="h-5 w-5" /> Exportar Devolvidos
                </button>
                 <button onClick={handleBackup} className="flex items-center gap-2 bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-300 h-10">
                    <DownloadIcon className="h-5 w-5" /> Backup (XLSX)
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-secondary text-text-primary font-semibold py-2 px-4 rounded-lg hover:bg-border transition-colors duration-300 h-10">
                    <UploadIcon className="h-5 w-5" /> Importar
                </button>
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors duration-300 h-10">
                    <PlusIcon className="h-5 w-5" /> Lançar
                </button>
            </div>
        </div>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div onClick={() => handleFilterClick(StatusCheque.A_DEPOSITAR)} className={`p-4 rounded-lg shadow-md text-center cursor-pointer transition-all ${statusFilter === StatusCheque.A_DEPOSITAR ? 'ring-2 ring-primary border-primary' : 'border border-border'}`}><p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">A Depositar</p><p className="text-2xl font-bold text-primary">{formatCurrency(totals.aDepositar.value)}</p><p className="text-sm text-text-secondary">{totals.aDepositar.count} cheques</p></div>
            <div onClick={() => handleFilterClick(StatusCheque.COMPENSADO)} className={`p-4 rounded-lg shadow-md text-center cursor-pointer transition-all ${statusFilter === StatusCheque.COMPENSADO ? 'ring-2 ring-success border-success' : 'border border-border'}`}><p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Compensado</p><p className="text-2xl font-bold text-success">{formatCurrency(totals.compensado.value)}</p><p className="text-sm text-text-secondary">{totals.compensado.count} cheques</p></div>
            <div onClick={() => handleFilterClick(StatusCheque.DEVOLVIDO)} className={`p-4 rounded-lg shadow-md text-center cursor-pointer transition-all ${statusFilter === StatusCheque.DEVOLVIDO ? 'ring-2 ring-warning border-warning' : 'border border-border'}`}><p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Devolvido</p><p className="text-2xl font-bold text-warning">{formatCurrency(totals.devolvido.value)}</p><p className="text-sm text-text-secondary">{totals.devolvido.count} cheques</p></div>
            <div onClick={() => handleFilterClick('Vencido')} className={`p-4 rounded-lg shadow-md text-center cursor-pointer transition-all ${statusFilter === 'Vencido' ? 'ring-2 ring-danger border-danger' : 'border border-border'}`}><p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Vencido</p><p className="text-2xl font-bold text-danger">{formatCurrency(totals.vencido.value)}</p><p className="text-sm text-text-secondary">{totals.vencido.count} cheques</p></div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end items-center mb-4 gap-2">
            <div className="relative w-full sm:w-auto"><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 pl-10 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10 w-full sm:w-64"/><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-text-secondary" /></div></div>
            <button onClick={() => { setSearchTerm(''); setStatusFilter('Todos'); }} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">Limpar</button>
        </div>

        <div className="bg-card shadow-md rounded-lg overflow-hidden flex flex-col flex-grow">
            {/* Stable Header with fixed widths */}
            <div className="flex-shrink-0 bg-secondary text-xs uppercase font-semibold text-text-primary border-b border-border px-4" style={{ height: '44px' }}>
                <div className="flex items-center h-full w-full">
                    <div className="w-28 flex-shrink-0 pr-2 text-left">Status</div>
                    <div className="w-32 flex-shrink-0 pr-2 text-left">Vencimento</div>
                    <div className="flex-1 min-w-[250px] pr-2 text-left">Emitente</div>
                    <div className="w-28 flex-shrink-0 pr-2 text-left">Número</div>
                    <div className="w-36 flex-shrink-0 pr-2 text-left">Valor</div>
                    <div className="flex-1 min-w-[250px] pr-2 text-left">Loja</div>
                    <div className="flex-1 min-w-[150px] pr-2 text-left">Conta Depósito</div>
                    <div className="w-32 flex-shrink-0 pr-2 text-left">Data Depósito</div>
                    <div className="w-24 flex-shrink-0 text-left">Ações</div>
                </div>
            </div>

            {/* Scrollable Body */}
            <div ref={tableContainerRef} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)} className="overflow-auto flex-grow">
                {filteredCheques.length > 0 ? (
                    <div style={{ height: `${filteredCheques.length * ROW_HEIGHT}px`, position: 'relative' }}>
                         <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${startIndex * ROW_HEIGHT}px)`
                        }}>
                            {visibleCheques.map((cheque) => (
                                <div
                                    key={cheque.id}
                                    onDoubleClick={() => handleDoubleClickRow(cheque)}
                                    style={{ height: `${ROW_HEIGHT}px` }}
                                    className="flex items-center text-xs bg-card border-b border-border hover:bg-secondary transition-colors cursor-pointer px-4"
                                >
                                    <div className="w-28 flex-shrink-0 pr-2 text-left"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${cheque.dynamicStatus === 'Vencido' ? 'bg-danger/20 text-danger' : cheque.dynamicStatus === StatusCheque.COMPENSADO ? 'bg-success/20 text-success' : cheque.dynamicStatus === StatusCheque.DEVOLVIDO ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'}`}>{cheque.dynamicStatus}</span></div>
                                    <div className="w-32 flex-shrink-0 pr-2 text-left">{formatDateToBR(cheque.dataVencimento)}</div>
                                    <div className="flex-1 min-w-[250px] pr-2 font-medium text-text-primary whitespace-nowrap overflow-hidden text-ellipsis text-left">{cheque.emitente}</div>
                                    <div className="w-28 flex-shrink-0 pr-2 text-left">{cheque.numero}</div>
                                    <div className="w-36 flex-shrink-0 pr-2 text-left">{formatCurrency(cheque.valor)}</div>
                                    <div className="flex-1 min-w-[250px] pr-2 whitespace-nowrap overflow-hidden text-ellipsis text-left">{cheque.loja}</div>
                                    <div className="flex-1 min-w-[150px] pr-2 whitespace-nowrap overflow-hidden text-ellipsis text-left">{cheque.contaDeposito}</div>
                                    <div className="w-32 flex-shrink-0 pr-2 text-left">{formatDateToBR(cheque.dataDeposito)}</div>
                                    <div className="w-24 flex-shrink-0 text-left"><div className="flex items-center justify-start gap-2"><button onClick={(e) => { e.stopPropagation(); handleEditClick(cheque); }} className="text-primary p-2 rounded-full hover:bg-primary/10"><EditIcon className="h-5 w-5"/></button><button onClick={(e) => { e.stopPropagation(); handleDeleteClick(cheque.id); }} className="text-danger p-2 rounded-full hover:bg-danger/10"><TrashIcon className="h-5 w-5"/></button></div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-text-secondary h-full"><SearchIcon className="w-12 h-12 mb-4 text-gray-300" /><h3 className="text-xl font-semibold text-text-primary">Nenhum Cheque Encontrado</h3><p className="mt-1">Tente ajustar os filtros ou adicione um novo cheque.</p></div>
                )}
            </div>
        </div>

        {isModalOpen && editingCheque && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-lg">
                    <h3 className="text-xl font-bold mb-6 text-text-primary">{editingCheque.id ? 'Editar Cheque' : 'Lançar Novo Cheque'}</h3>
                    <div className="space-y-4">
                        <input name="emitente" value={editingCheque.emitente || ''} onChange={handleInputChange} placeholder="Emitente" className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.emitente ? 'border-danger focus:ring-danger' : 'border-border focus:ring-primary'}`} />
                        {errors.emitente && <p className="text-danger text-xs">{errors.emitente}</p>}
                        <div className="grid grid-cols-2 gap-4">
                            <div><input name="numero" value={editingCheque.numero || ''} onChange={handleInputChange} placeholder="Número do Cheque" className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.numero ? 'border-danger focus:ring-danger' : 'border-border focus:ring-primary'}`} />{errors.numero && <p className="text-danger text-xs">{errors.numero}</p>}</div>
                            <div><input name="loja" value={editingCheque.loja || ''} onChange={handleInputChange} placeholder="Loja" className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.loja ? 'border-danger focus:ring-danger' : 'border-border focus:ring-primary'}`} />{errors.loja && <p className="text-danger text-xs">{errors.loja}</p>}</div>
                        </div>
                        <div><input name="contaDeposito" value={editingCheque.contaDeposito || ''} onChange={handleInputChange} placeholder="Conta Depósito" className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.contaDeposito ? 'border-danger focus:ring-danger' : 'border-border focus:ring-primary'}`} />{errors.contaDeposito && <p className="text-danger text-xs">{errors.contaDeposito}</p>}</div>
                        <div><input name="valor" value={formatCurrency(editingCheque.valor || 0)} onChange={handleInputChange} placeholder="Valor" className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.valor ? 'border-danger focus:ring-danger' : 'border-border focus:ring-primary'}`} />{errors.valor && <p className="text-danger text-xs">{errors.valor}</p>}</div>
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs text-text-secondary">Vencimento</label><input name="dataVencimento_br" value={editingCheque.dataVencimento_br || ''} onChange={handleInputChange} placeholder="DD/MM/AAAA" className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.dataVencimento ? 'border-danger focus:ring-danger' : 'border-border focus:ring-primary'}`} />{errors.dataVencimento && <p className="text-danger text-xs">{errors.dataVencimento}</p>}</div>
                             <div><label className="text-xs text-text-secondary">Data Depósito</label><input name="dataDeposito_br" value={editingCheque.dataDeposito_br || ''} onChange={handleInputChange} placeholder="DD/MM/AAAA" className={`w-full bg-background border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 ${errors.dataDeposito ? 'border-danger focus:ring-danger' : 'border-border focus:ring-primary'}`} />{errors.dataDeposito && <p className="text-danger text-xs">{errors.dataDeposito}</p>}</div>
                        </div>
                        <div><label className="text-xs text-text-secondary">Status</label><select name="status" value={editingCheque.status || StatusCheque.A_DEPOSITAR} onChange={handleInputChange} className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"><option value={StatusCheque.A_DEPOSITAR}>A Depositar</option><option value={StatusCheque.COMPENSADO}>Compensado</option><option value={StatusCheque.DEVOLVIDO}>Devolvido</option></select></div>
                    </div>
                    <div className="mt-8 flex justify-end gap-4">
                        <button onClick={handleCloseModal} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold">Cancelar</button>
                        <button onClick={handleSaveChanges} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold">Salvar</button>
                    </div>
                </div>
            </div>
        )}
        
        {chequeParaAcao && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-md">
                    <h3 className="text-lg font-bold mb-4 text-text-primary">Ação para o Cheque Nº {chequeParaAcao.numero}</h3>
                    <p className="text-text-secondary mb-6">Selecione a ação que deseja realizar para este cheque.</p>
                    <div className="flex flex-col space-y-4">
                         <button
                            onClick={() => handleUpdateStatus(StatusCheque.COMPENSADO)}
                            className="w-full py-3 px-4 rounded-lg bg-success text-white font-semibold hover:bg-green-700 transition-colors"
                        >
                            Marcar como Compensado
                        </button>
                        <button
                            onClick={() => handleUpdateStatus(StatusCheque.DEVOLVIDO)}
                            className="w-full py-3 px-4 rounded-lg bg-warning text-white font-semibold hover:bg-yellow-600 transition-colors"
                        >
                            Marcar como Devolvido
                        </button>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => setChequeParaAcao(null)}
                            className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isConfirmOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-sm">
                    <h3 className="text-lg font-bold mb-4 text-text-primary">Confirmar Ação</h3>
                    <p className="text-text-secondary mb-6">{confirmAction.message}</p>
                    <div className="flex justify-end gap-4">
                        <button onClick={() => setIsConfirmOpen(false)} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold">Cancelar</button>
                        <button onClick={handleConfirm} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold">Confirmar</button>
                    </div>
                </div>
            </div>
        )}

        {isLembreteModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-lg">
                    <h3 className="text-xl font-bold mb-4 text-text-primary flex items-center gap-2">
                        <CalendarClockIcon className="h-6 w-6 text-primary" />
                        Lembrete de Compensação
                    </h3>
                    <p className="text-text-secondary mb-6">Os seguintes cheques vencem hoje e estão aguardando compensação:</p>
                    <div className="max-h-60 overflow-y-auto bg-background rounded p-4 border border-border">
                        <ul className="space-y-3">
                            {lembreteCheques.map(cheque => (
                                <li key={cheque.id} className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-text-primary">{cheque.emitente} (Nº {cheque.numero})</span>
                                    <span className="font-bold text-success">{formatCurrency(cheque.valor)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button onClick={() => setIsLembreteModalOpen(false)} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold">Fechar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default GerenciadorCheques;