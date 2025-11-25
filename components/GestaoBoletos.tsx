import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, DownloadIcon, EditIcon, UploadIcon, CheckIcon, CalendarClockIcon, SpinnerIcon } from './icons';
import { ArrowDownCircleIcon, ArrowUpCircleIcon } from './icons'; // Reusing icons

// Enum for status
enum StatusCheque {
  A_DEPOSITAR = 'A Depositar',
  COMPENSADO = 'Compensado',
  DEVOLVIDO = 'Devolvido',
}

// Data structure for a cheque
interface Cheque {
    id: string;
    emitente: string;
    numero: string;
    valor: number;
    dataVencimento: string; // YYYY-MM-DD
    loja: string;
    contaDeposito: string;
    dataDeposito: string; // YYYY-MM-DD
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
                return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
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

// Constants for infinite scroll
const ITEMS_PER_LOAD = 20;
const SCROLL_THRESHOLD = 100; // pixels from the bottom to trigger loading


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
  const [statusFilter, setStatusFilter] = useState<StatusCheque | 'Vencido' | 'Todos'>(StatusCheque.A_DEPOSITAR); // Default to 'A Depositar'
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  const [chequeParaAcao, setChequeParaAcao] = useState<Cheque | null>(null);
  
  // Reminder state
  const [lembreteCheques, setLembreteCheques] = useState<Cheque[]>([]);
  const [isLembreteModalOpen, setIsLembreteModalOpen] = useState(false);
  
  // Infinite scroll states
  const scrollRef = useRef<HTMLDivElement>(null);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD);
  const [isLoadingMore, setIsLoadingMore] = useState(false);


  const getDynamicStatus = useMemo(() => (cheque: Cheque): string => {
    if (cheque.status === StatusCheque.COMPENSADO) return StatusCheque.COMPENSADO;
    if (cheque.status === StatusCheque.DEVOLVIDO) return StatusCheque.DEVOLVIDO;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    // Date string is YYYY-MM-DD, which JS new Date() interprets as local time midnight
    const vencimento = new Date(cheque.dataVencimento + 'T00:00:00');
    if (vencimento < hoje) {
        return 'Vencido';
    }
    
    return StatusCheque.A_DEPOSITAR;
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


  const allChequesWithDynamicStatus = useMemo(() => {
    return cheques.map(cheque => ({...cheque, dynamicStatus: getDynamicStatus(cheque)}));
  }, [cheques, getDynamicStatus]);

  const filteredCheques = useMemo(() => {
    setDisplayCount(ITEMS_PER_LOAD); // Reset display count on filter change
    const filtered = allChequesWithDynamicStatus.filter(cheque => {
        const statusMatch = statusFilter === 'Todos' || cheque.dynamicStatus === statusFilter;
        
        const searchMatch = !searchTerm || Object.values(cheque).some(value =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );

        const startDateMatch = !dateRange.start || cheque.dataVencimento >= dateRange.start;
        const endDateMatch = !dateRange.end || cheque.dataVencimento <= dateRange.end;
        
        return statusMatch && searchMatch && startDateMatch && endDateMatch;
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
  }, [allChequesWithDynamicStatus, searchTerm, statusFilter, dateRange]);


  const totals = useMemo(() => {
    const result = {
        aDepositar: { count: 0, value: 0 },
        compensado: { count: 0, value: 0 },
        devolvido: { count: 0, value: 0 },
        vencido: { count: 0, value: 0 },
    };

    // Use a list filtered ONLY by search and date, but NOT by status, for the totals
    const chequesForTotals = allChequesWithDynamicStatus.filter(cheque => {
        const searchMatch = !searchTerm || Object.values(cheque).some(value =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
        const startDateMatch = !dateRange.start || cheque.dataVencimento >= dateRange.start;
        const endDateMatch = !dateRange.end || cheque.dataVencimento <= dateRange.end;
        
        return searchMatch && startDateMatch && endDateMatch;
    });

    chequesForTotals.forEach(cheque => {
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
  }, [allChequesWithDynamicStatus, searchTerm, dateRange]);


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
    setErrors({}); // Clear errors on modal close
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

    // Clear error on change
    if (errors[name as keyof ChequeErrors]) {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name as keyof ChequeErrors];
            return newErrors;
        });
    }
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
    
    setConfirmAction({ action, message: `Deseja ${chequeToSave.id ? 'salvar as alterações' : 'adicionar este cheque'}?`});
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

        // Sort by dataVencimento descending (Most Recent First), then by loja, then by emitente
        const sortedDevolvidos = [...devolvidos].sort((a, b) => {
            const dateA = new Date(a.dataVencimento).getTime();
            const dateB = new Date(b.dataVencimento).getTime();
            if (dateA !== dateB) return dateB - dateA; // Most recent date first (Desc)
            if (a.loja !== b.loja) return a.loja.localeCompare(b.loja);
            return a.emitente.localeCompare(b.emitente);
        });

        const aoaData: any[][] = [];
        aoaData.push(['Relatório de Cheques Devolvidos - Por Data de Vencimento', null, null]); // Title
        aoaData.push([]); // Spacer

        let currentVencimento: string | null = null;
        let currentLoja: string | null = null;
        let currentEmitente: string | null = null;

        let totalGeral = 0;
        let totalVencimentoGroup = 0;
        let totalLojaGroup = 0;
        let totalEmitenteGroup = 0;

        sortedDevolvidos.forEach((cheque, index) => {
            // Break grouping for Vencimento
            if (cheque.dataVencimento !== currentVencimento) {
                if (currentVencimento !== null) {
                    // Close previous groups
                     if (currentLoja !== null) {
                        if (currentEmitente !== null) {
                            aoaData.push(['    Subtotal Emitente:', null, totalEmitenteGroup]);
                            aoaData.push([]);
                            totalEmitenteGroup = 0;
                        }
                         aoaData.push([`  Total da Loja ${currentLoja}:`, null, totalLojaGroup]);
                         aoaData.push([]);
                         totalLojaGroup = 0;
                     }
                    // Add totals for previous Vencimento group
                    aoaData.push([`TOTAL PARA VENCIMENTO ${formatDateToBR(currentVencimento)}:`, null, totalVencimentoGroup]);
                    aoaData.push([]);
                }
                currentVencimento = cheque.dataVencimento;
                currentLoja = null; 
                currentEmitente = null;
                totalVencimentoGroup = 0;
                aoaData.push([`VENCIMENTO: ${formatDateToBR(currentVencimento)}`, null, null]);
                aoaData.push([]);
            }

            // Break grouping for Loja
            if (cheque.loja !== currentLoja) {
                 if (currentLoja !== null) {
                     // Close previous emitente if exists
                     if (currentEmitente !== null) {
                        aoaData.push(['    Subtotal Emitente:', null, totalEmitenteGroup]);
                        aoaData.push([]);
                        totalEmitenteGroup = 0;
                     }
                    // Add totals for previous Loja group within same Vencimento
                    aoaData.push([`  Total da Loja ${currentLoja}:`, null, totalLojaGroup]);
                    aoaData.push([]);
                }
                currentLoja = cheque.loja;
                currentEmitente = null; 
                totalLojaGroup = 0;
                aoaData.push([`  LOJA: ${currentLoja}`, null, null]);
            }

            // Break grouping for Emitente
            if (cheque.emitente !== currentEmitente) {
                if (currentEmitente !== null) {
                    // Add totals for previous Emitente group within same Loja
                    aoaData.push(['    Subtotal Emitente:', null, totalEmitenteGroup]);
                    aoaData.push([]);
                }
                currentEmitente = cheque.emitente;
                totalEmitenteGroup = 0;
                aoaData.push([`    EMITENTE: ${currentEmitente}`, null, null]);
                aoaData.push(['      Número do Cheque', 'Valor']); 
            }

            // Add cheque detail
            aoaData.push([`      ${cheque.numero}`, cheque.valor]);
            totalEmitenteGroup += cheque.valor;
            totalLojaGroup += cheque.valor;
            totalVencimentoGroup += cheque.valor;
            totalGeral += cheque.valor;

            // Handle totals for the very last item in the loop
            if (index === sortedDevolvidos.length - 1) {
                aoaData.push(['    Subtotal Emitente:', null, totalEmitenteGroup]);
                aoaData.push([]);
                aoaData.push([`  Total da Loja ${currentLoja}:`, null, totalLojaGroup]);
                aoaData.push([]);
                aoaData.push([`TOTAL PARA VENCIMENTO ${formatDateToBR(currentVencimento)}:`, null, totalVencimentoGroup]);
                aoaData.push([]);
            }
        });

        aoaData.push([]);
        aoaData.push(['TOTAL GERAL DEVOLVIDO:', null, totalGeral]);

        const XLSX = (window as any).XLSX;
        const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

        // Styling and formatting
        worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }]; // Merge title

        const range = XLSX.utils.decode_range(worksheet['!ref'] as string);
        for(let R = 0; R <= range.e.r; ++R) {
            // Column C for subtotals/totals (index 2)
            const cellRefC = XLSX.utils.encode_cell({c: 2, r: R});
            if (worksheet[cellRefC] && typeof worksheet[cellRefC].v === 'number') {
                worksheet[cellRefC].t = 'n';
                worksheet[cellRefC].z = 'R$ #,##0.00';
            }
            // Column B for individual cheque values (index 1)
            const cellRefB = XLSX.utils.encode_cell({c: 1, r: R});
            if (worksheet[cellRefB] && typeof worksheet[cellRefB].v === 'number') {
                worksheet[cellRefB].t = 'n';
                worksheet[cellRefB].z = 'R$ #,##0.00';
            }
        }

        worksheet['!cols'] = [
            { wch: 45 }, // A: Vencimento/Loja/Emitente/Cheque Number (long, so wider)
            { wch: 15 }, // B: Value for individual cheques
            { wch: 20 }, // C: Subtotals/Totals
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cheques Devolvidos');
        XLSX.writeFile(workbook, `devolvidos_por_vencimento_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handleFilterClick = (status: StatusCheque | 'Vencido' | 'Todos') => {
        setStatusFilter(prev => prev === status ? 'Todos' : status);
    };

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, clientHeight, scrollHeight } = scrollRef.current;
            if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD && !isLoadingMore && displayCount < filteredCheques.length) {
                setIsLoadingMore(true);
                setTimeout(() => {
                    setDisplayCount(prevCount => Math.min(prevCount + ITEMS_PER_LOAD, filteredCheques.length));
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
                
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Gerenciador de Cheques</h2>
            </div>
            <div className="flex items-center flex-wrap gap-2">
                <button onClick={handleExportDevolvidos} className="flex items-center gap-2 bg-white border border-border text-text-primary font-semibold py-2 px-4 rounded-full hover:bg-secondary transition-colors duration-300 h-9">
                    <DownloadIcon className="h-4 w-4" /> Exportar Devolvidos
                </button>
                 <button onClick={handleBackup} className="flex items-center gap-2 bg-white border border-border text-text-primary font-semibold py-2 px-4 rounded-full hover:bg-secondary transition-colors duration-300 h-9">
                    <DownloadIcon className="h-4 w-4" /> Backup (XLSX)
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-white border border-border text-text-primary font-semibold py-2 px-4 rounded-full hover:bg-secondary transition-colors duration-300 h-9">
                    <UploadIcon className="h-4 w-4" /> Importar
                </button>
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors duration-300 h-9 shadow-sm">
                    <PlusIcon className="h-4 w-4" /> Lançar
                </button>
            </div>
        </div>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div onClick={() => handleFilterClick(StatusCheque.A_DEPOSITAR)} className={`p-4 rounded-2xl shadow-md text-center cursor-pointer transition-all ${statusFilter === StatusCheque.A_DEPOSITAR ? 'ring-1 ring-primary border-primary bg-primary/5' : 'border border-border bg-card hover:border-gray-300'}`}><p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">A Depositar</p><p className="text-xl font-bold text-primary">{formatCurrency(totals.aDepositar.value)}</p><p className="text-sm text-text-secondary">{totals.aDepositar.count} cheques</p></div>
            <div onClick={() => handleFilterClick(StatusCheque.COMPENSADO)} className={`p-4 rounded-2xl shadow-md text-center cursor-pointer transition-all ${statusFilter === StatusCheque.COMPENSADO ? 'ring-1 ring-success border-success bg-success/5' : 'border border-border bg-card hover:border-gray-300'}`}><p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Compensado</p><p className="text-xl font-bold text-success">{formatCurrency(totals.compensado.value)}</p><p className="text-sm text-text-secondary">{totals.compensado.count} cheques</p></div>
            <div onClick={() => handleFilterClick(StatusCheque.DEVOLVIDO)} className={`p-4 rounded-2xl shadow-md text-center cursor-pointer transition-all ${statusFilter === StatusCheque.DEVOLVIDO ? 'ring-1 ring-warning border-warning bg-warning/5' : 'border border-border bg-card hover:border-gray-300'}`}><p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Devolvido</p><p className="text-xl font-bold text-warning">{formatCurrency(totals.devolvido.value)}</p><p className="text-sm text-text-secondary">{totals.devolvido.count} cheques</p></div>
            <div onClick={() => handleFilterClick('Vencido')} className={`p-4 rounded-2xl shadow-md text-center cursor-pointer transition-all ${statusFilter === 'Vencido' ? 'ring-1 ring-danger border-danger bg-danger/5' : 'border border-border bg-card hover:border-gray-300'}`}><p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Vencido</p><p className="text-xl font-bold text-danger">{formatCurrency(totals.vencido.value)}</p><p className="text-sm text-text-secondary">{totals.vencido.count} cheques</p></div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end items-center mb-4 gap-2 bg-white p-3 rounded-2xl border border-border">
            <div className="relative w-full sm:w-auto"><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-white border border-border rounded-xl px-3 py-2 pl-10 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9 w-full sm:w-64"/><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-4 w-4 text-text-secondary" /></div></div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-secondary">Vencimento:</span>
                    <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-white border border-border rounded-xl px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"/>
                    <span className="text-xs text-text-secondary">até</span>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-white border border-border rounded-xl px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary h-9"/>
                </div>
                <button onClick={() => { setSearchTerm(''); setStatusFilter('Todos'); setDateRange({start: '', end: ''}); }} className="py-2 px-4 rounded-full bg-secondary hover:bg-border text-text-primary font-medium text-sm h-9 transition-colors">Limpar</button>
            </div>
        </div>

        <div className="bg-card shadow-sm rounded-2xl overflow-hidden flex flex-col flex-grow border border-border">
            <div ref={scrollRef} onScroll={handleScroll} className="overflow-x-auto overflow-y-auto h-full">
                <table className="min-w-full divide-y divide-border text-sm text-left">
                    <thead className="bg-secondary text-xs uppercase font-medium text-text-secondary sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Vencimento</th>
                            <th className="px-6 py-3">Emitente</th>
                            <th className="px-6 py-3">Número</th>
                            <th className="px-6 py-3">Valor</th>
                            <th className="px-6 py-3">Loja</th>
                            <th className="px-6 py-3">Conta Depósito</th>
                            <th className="px-6 py-3">Data Depósito</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                        {filteredCheques.length > 0 ? (
                            filteredCheques.slice(0, displayCount).map((cheque) => (
                                <tr
                                    key={cheque.id}
                                    onDoubleClick={() => handleDoubleClickRow(cheque)}
                                    className="hover:bg-secondary transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${cheque.dynamicStatus === 'Vencido' ? 'bg-danger/20 text-danger border-danger/30' : cheque.dynamicStatus === StatusCheque.COMPENSADO ? 'bg-success/20 text-success border-success/30' : cheque.dynamicStatus === StatusCheque.DEVOLVIDO ? 'bg-warning/20 text-warning border-warning/30' : 'bg-primary/20 text-primary border-primary/30'}`}>{cheque.dynamicStatus}</span></td>
                                    <td className="px-6 py-4 text-text-secondary whitespace-nowrap">{formatDateToBR(cheque.dataVencimento)}</td>
                                    <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{cheque.emitente}</td>
                                    <td className="px-6 py-4 text-text-secondary whitespace-nowrap">{cheque.numero}</td>
                                    <td className="px-6 py-4 font-semibold text-text-primary text-right whitespace-nowrap">{formatCurrency(cheque.valor)}</td>
                                    <td className="px-6 py-4 text-text-secondary whitespace-nowrap">{cheque.loja}</td>
                                    <td className="px-6 py-4 text-text-secondary whitespace-nowrap">{cheque.contaDeposito}</td>
                                    <td className="px-6 py-4 text-text-secondary whitespace-nowrap">{formatDateToBR(cheque.dataDeposito)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleEditClick(cheque); }} className="text-primary p-1.5 rounded-full hover:bg-primary/10 transition-colors"><EditIcon className="h-4 w-4"/></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(cheque.id); }} className="text-danger p-1.5 rounded-full hover:bg-danger/10 transition-colors"><TrashIcon className="h-4 w-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={9} className="text-center py-16">
                                    <div className="flex flex-col items-center justify-center text-text-secondary">
                                        <SearchIcon className="w-10 h-10 mb-4 text-gray-300" />
                                        <h3 className="text-lg font-medium text-text-primary">Nenhum Cheque Encontrado</h3>
                                        <p className="mt-1">Tente ajustar os filtros ou adicione um novo cheque.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {isLoadingMore && (
                            <tr>
                                <td colSpan={9} className="text-center py-4 text-primary">
                                    <SpinnerIcon className="h-5 w-5 animate-spin mx-auto" />
                                    Carregando mais...
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {isModalOpen && editingCheque && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
                    <h3 className="text-2xl font-bold text-text-primary mb-6 text-center">{editingCheque.id ? 'Editar Cheque' : 'Lançar Novo Cheque'}</h3>
                    <div className="space-y-4">
                        <div><label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Emitente</label><input name="emitente" value={editingCheque.emitente || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.emitente ? 'border-danger' : ''}`} />{errors.emitente && <p className="text-danger text-xs mt-1 ml-1">{errors.emitente}</p>}</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Número do Cheque</label><input name="numero" value={editingCheque.numero || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.numero ? 'border-danger' : ''}`} />{errors.numero && <p className="text-danger text-xs mt-1 ml-1">{errors.numero}</p>}</div>
                            <div><label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Loja</label><input name="loja" value={editingCheque.loja || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.loja ? 'border-danger' : ''}`} />{errors.loja && <p className="text-danger text-xs mt-1 ml-1">{errors.loja}</p>}</div>
                        </div>
                        <div><label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Conta Depósito</label><input name="contaDeposito" value={editingCheque.contaDeposito || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.contaDeposito ? 'border-danger' : ''}`} />{errors.contaDeposito && <p className="text-danger text-xs mt-1 ml-1">{errors.contaDeposito}</p>}</div>
                        <div><label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Valor</label><input name="valor" value={formatCurrency(editingCheque.valor || 0)} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.valor ? 'border-danger' : ''}`} />{errors.valor && <p className="text-danger text-xs mt-1 ml-1">{errors.valor}</p>}</div>
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Vencimento</label><input name="dataVencimento_br" value={editingCheque.dataVencimento_br || ''} onChange={handleInputChange} placeholder="DD/MM/AAAA" className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.dataVencimento ? 'border-danger' : ''}`} />{errors.dataVencimento && <p className="text-danger text-xs mt-1 ml-1">{errors.dataVencimento}</p>}</div>
                             <div><label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Data Depósito</label><input name="dataDeposito_br" value={editingCheque.dataDeposito_br || ''} onChange={handleInputChange} placeholder="DD/MM/AAAA" className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.dataDeposito ? 'border-danger' : ''}`} />{errors.dataDeposito && <p className="text-danger text-xs mt-1 ml-1">{errors.dataDeposito}</p>}</div>
                        </div>
                        <div><label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Status</label><select name="status" value={editingCheque.status || StatusCheque.A_DEPOSITAR} onChange={handleInputChange} className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"><option value={StatusCheque.A_DEPOSITAR}>A Depositar</option><option value={StatusCheque.COMPENSADO}>Compensado</option><option value={StatusCheque.DEVOLVIDO}>Devolvido</option></select></div>
                    </div>
                    <div className="flex justify-center gap-3 mt-8">
                        <button onClick={handleCloseModal} className="px-6 py-3 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                        <button onClick={handleSaveChanges} className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Salvar</button>
                    </div>
                </div>
            </div>
        )}
        
        {chequeParaAcao && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-8">
                    <h3 className="text-xl font-bold text-text-primary mb-6 text-center">Ação para o Cheque Nº {chequeParaAcao.numero}</h3>
                    <p className="text-text-secondary text-center mb-8">Selecione a ação que deseja realizar para este cheque.</p>
                    <div className="flex flex-col space-y-4">
                         <button
                            onClick={() => handleUpdateStatus(StatusCheque.COMPENSADO)}
                            className="w-full py-3 px-4 rounded-xl bg-success text-white font-bold shadow-lg shadow-success/20 hover:bg-success/90 transition-colors"
                        >
                            Marcar como Compensado
                        </button>
                        <button
                            onClick={() => handleUpdateStatus(StatusCheque.DEVOLVIDO)}
                            className="w-full py-3 px-4 rounded-xl bg-warning text-white font-bold shadow-lg shadow-warning/20 hover:bg-warning/90 transition-colors"
                        >
                            Marcar como Devolvido
                        </button>
                    </div>
                    <div className="flex justify-center mt-6">
                        <button
                            onClick={() => setChequeParaAcao(null)}
                            className="px-6 py-2.5 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isConfirmOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
                    <h3 className="text-xl font-bold mb-4 text-text-primary">Confirmar Ação</h3>
                    <p className="text-text-secondary mb-8">{confirmAction.message}</p>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setIsConfirmOpen(false)} className="px-6 py-2.5 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                        <button onClick={handleConfirm} className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Confirmar</button>
                    </div>
                </div>
            </div>
        )}

        {isLembreteModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden p-8">
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <CalendarClockIcon className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-bold text-text-primary">Lembrete de Compensação</h3>
                    </div>
                    <p className="text-text-secondary mb-6 text-center">Os seguintes cheques vencem hoje e estão aguardando compensação:</p>
                    <div className="max-h-60 overflow-y-auto bg-secondary rounded-xl p-4 border border-transparent mb-6 custom-scrollbar">
                        <ul className="space-y-3">
                            {lembreteCheques.map(cheque => (
                                <li key={cheque.id} className="flex justify-between items-center text-sm p-2 bg-white rounded-lg shadow-sm">
                                    <span className="font-semibold text-text-primary">{cheque.emitente} (Nº {cheque.numero})</span>
                                    <span className="font-bold text-success">{formatCurrency(cheque.valor)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex justify-center">
                        <button onClick={() => setIsLembreteModalOpen(false)} className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Fechar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default GerenciadorCheques;