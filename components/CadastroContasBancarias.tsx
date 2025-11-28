
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, DownloadIcon, EditIcon, UploadIcon, ArrowLeftIcon } from './icons';

// Data structure for a bank account
interface ContaBancaria {
  id: string;
  titular: string;
  cnpj: string;
  pix: string;
  banco: string;
  agencia: string;
  contaCorrente: string; // Represents C/C
}

// Mock data to start with if no data is in local storage
const initialContas: ContaBancaria[] = [
  { id: '1', titular: 'Empresa Exemplo LTDA', cnpj: '12.345.678/0001-99', pix: 'contato@empresa.com', banco: 'Banco do Brasil', agencia: '1234-5', contaCorrente: '98765-4' },
  { id: '2', titular: 'Comércio Varejista S.A.', cnpj: '98.765.432/0001-11', pix: 'financeiro@comercio.com', banco: 'Itaú Unibanco', agencia: '5678-9', contaCorrente: '12345-6' },
];

type ContaErrors = Partial<Record<keyof Omit<ContaBancaria, 'id'>, string>>;

const newContaTemplate: Omit<ContaBancaria, 'id'> = {
  titular: '',
  cnpj: '',
  pix: '',
  banco: '',
  agencia: '',
  contaCorrente: '',
};

const applyCnpjMask = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
};

const isValidCnpj = (cnpj: string): boolean => {
    return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cnpj);
};


const CadastroContasBancarias: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const [contas, setContas] = useState<ContaBancaria[]>(() => {
        const savedContas = localStorage.getItem('contas_bancarias');
        return savedContas ? JSON.parse(savedContas) : initialContas;
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingConta, setEditingConta] = useState<Partial<ContaBancaria> | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null; message: string }>({ action: null, message: '' });
    const [errors, setErrors] = useState<ContaErrors>({});
    const [searchTerm, setSearchTerm] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const [selectedContas, setSelectedContas] = useState<Set<string>>(new Set());

    useEffect(() => {
        localStorage.setItem('contas_bancarias', JSON.stringify(contas));
    }, [contas]);
    
     useEffect(() => {
        // Clear selection if filtered results change
        setSelectedContas(new Set());
    }, [searchTerm]);

    const filteredContas = useMemo(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        if (!lowercasedSearchTerm) return contas;
        return contas.filter(conta =>
            Object.values(conta).some(value =>
                String(value).toLowerCase().includes(lowercasedSearchTerm)
            )
        );
    }, [contas, searchTerm]);
    
    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => {
            setNotification(null);
        }, 3000); // Hide after 3 seconds
    };

    const handleRowDoubleClick = (conta: ContaBancaria) => {
        const contentToCopy = `TITULAR: ${conta.titular}\nCNPJ: ${conta.cnpj}\nPIX: ${conta.pix}\nBANCO: ${conta.banco}\nAGENCIA: ${conta.agencia}\nC/C: ${conta.contaCorrente}`;
        
        navigator.clipboard.writeText(contentToCopy)
            .then(() => {
                showNotification(`Dados de "${conta.titular}" copiados!`);
            })
            .catch(err => {
                console.error('Falha ao copiar dados: ', err);
                showNotification('Erro ao copiar dados.');
            });
    };
    
    const handleSelectConta = (id: string) => {
        const newSelection = new Set(selectedContas);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedContas(newSelection);
    };
    
    const handleSelectAll = () => {
        if (selectedContas.size === filteredContas.length) {
            setSelectedContas(new Set());
        } else {
            setSelectedContas(new Set(filteredContas.map(c => c.id)));
        }
    };

    const handleOpenAddModal = () => {
        setErrors({});
        setEditingConta({ ...newContaTemplate });
        setIsModalOpen(true);
    };

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

    const handleEditClick = (e: React.MouseEvent, conta: ContaBancaria) => {
        e.stopPropagation();
        setErrors({});
        setEditingConta({ ...conta });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const action = () => setContas(contas.filter(c => c.id !== id));
        setConfirmAction({ action, message: 'Você tem certeza que deseja excluir esta conta permanentemente?' });
        setIsConfirmOpen(true);
    };
    
    const handleDeleteSelectedClick = () => {
        const action = () => {
            setContas(contas.filter(c => !selectedContas.has(c.id)));
            setSelectedContas(new Set());
        };
        setConfirmAction({
            action,
            message: `Você tem certeza que deseja excluir as ${selectedContas.size} contas selecionadas?`
        });
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingConta(null);
        setErrors({});
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (editingConta) {
            let { name, value } = e.target;
            if (name === 'cnpj') {
                value = applyCnpjMask(value);
            }
            setEditingConta({ ...editingConta, [name]: value });
        }
    };
    
    const validate = (): boolean => {
        if (!editingConta) return false;
        const newErrors: ContaErrors = {};

        if (!editingConta.titular?.trim()) newErrors.titular = 'Titular é obrigatório.';
        
        if (!editingConta.cnpj?.trim()) {
            newErrors.cnpj = 'CNPJ é obrigatório.';
        } else if (!isValidCnpj(editingConta.cnpj)) {
            newErrors.cnpj = 'Formato de CNPJ inválido. Use XX.XXX.XXX/XXXX-XX.';
        }

        if (!editingConta.pix?.trim()) newErrors.pix = 'PIX é obrigatório.';
        if (!editingConta.banco?.trim()) newErrors.banco = 'Banco é obrigatório.';
        if (!editingConta.agencia?.trim()) newErrors.agencia = 'Agência é obrigatória.';
        if (!editingConta.contaCorrente?.trim()) newErrors.contaCorrente = 'C/C é obrigatória.';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveChanges = () => {
        if (!validate()) return;
        if (!editingConta) return;

        const action = () => {
            if (editingConta.id) { // Editing
                setContas(contas.map(c => c.id === editingConta.id ? (editingConta as ContaBancaria) : c));
            } else { // Adding
                const newId = `conta-${Date.now()}`;
                setContas([...contas, { ...newContaTemplate, ...editingConta, id: newId }]);
            }
            handleCloseModal();
        };

        setConfirmAction({
            action,
            message: editingConta.id ? 'Você tem certeza que deseja salvar as alterações?' : 'Você tem certeza que deseja adicionar esta nova conta?'
        });
        setIsConfirmOpen(true);
    };
    
    const handleConfirm = () => {
        if (confirmAction.action) confirmAction.action();
        setIsConfirmOpen(false);
        setConfirmAction({ action: null, message: '' });
    };

    const handleCancelConfirm = () => {
        setIsConfirmOpen(false);
        setConfirmAction({ action: null, message: '' });
    };

    const handleExportXLSX = () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
            alert("Erro: A biblioteca de exportação não foi carregada.");
            return;
        }

        const dataToExport = filteredContas.map(c => ({
            'TITULAR': c.titular,
            'CNPJ': c.cnpj,
            'PIX': c.pix,
            'BANCO': c.banco,
            'AGENCIA': c.agencia,
            'C/C': c.contaCorrente,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Contas Bancárias');
        XLSX.writeFile(workbook, `contas_bancarias_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = (window as any).XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = (window as any).XLSX.utils.sheet_to_json(worksheet);

                const newContas: ContaBancaria[] = json.map((row, index) => {
                    const titular = row['TITULAR'] || row['titular'];
                    const cnpj = row['CNPJ'] || row['cnpj'];
                    const pix = row['PIX'] || row['pix'];
                    const banco = row['BANCO'] || row['banco'];
                    const agencia = row['AGENCIA'] || row['agencia'];
                    const contaCorrente = row['C/C'] || row['c/c'] || row['CC'] || row['Conta Corrente'];
                    
                    if (!titular || !cnpj || !pix || !banco || !agencia || !contaCorrente) {
                        console.warn(`Pulando linha ${index + 2} por falta de dados obrigatórios.`);
                        return null;
                    }

                    return {
                        id: `import-${Date.now()}-${index}`,
                        titular: String(titular),
                        cnpj: String(cnpj),
                        pix: String(pix),
                        banco: String(banco),
                        agencia: String(agencia),
                        contaCorrente: String(contaCorrente),
                    };
                }).filter((c): c is ContaBancaria => c !== null);

                if (newContas.length > 0) {
                    const action = () => {
                        const existingKeys = new Set(contas.map(c => `${c.agencia}-${c.contaCorrente}`));
                        const uniqueNewContas = newContas.filter(c => !existingKeys.has(`${c.agencia}-${c.contaCorrente}`));
                        setContas(prev => [...prev, ...uniqueNewContas]);
                    };
                    setConfirmAction({
                        action,
                        message: `Foram encontradas ${newContas.length} contas no arquivo. Deseja importá-las? (Contas com mesma agência e C/C serão ignoradas)`
                    });
                    setIsConfirmOpen(true);
                } else {
                    alert('Nenhuma conta válida foi encontrada no arquivo. Verifique se os cabeçalhos (TITULAR, CNPJ, PIX, BANCO, AGENCIA, C/C) estão corretos.');
                }

            } catch (error) {
                console.error("Erro ao processar arquivo XLSX:", error);
                alert('Ocorreu um erro ao ler o arquivo. Verifique se é um arquivo XLSX válido.');
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full h-full flex flex-col animate-fade-in">
            <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls" />
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10">
                            <ArrowLeftIcon className="h-5 w-5" />
                            Voltar
                        </button>
                    )}
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
                        Cadastro de Contas Bancárias
                    </h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                   {selectedContas.size > 0 && (
                        <button
                            onClick={handleDeleteSelectedClick}
                            className="flex items-center gap-2 bg-danger text-white font-semibold py-2 px-4 rounded-full hover:bg-red-700 transition-colors duration-300 h-10"
                        >
                            <TrashIcon className="h-5 w-5" />
                            Apagar ({selectedContas.size})
                        </button>
                    )}
                   <button onClick={handleImportClick} className="flex items-center gap-2 bg-secondary text-text-primary font-semibold py-2 px-4 rounded-full hover:bg-border transition-colors duration-300 h-10">
                        <UploadIcon className="h-5 w-5" /> Importar XLSX
                    </button>
                    <button onClick={handleExportXLSX} className="flex items-center gap-2 bg-success text-white font-semibold py-2 px-4 rounded-full hover:bg-green-700 transition-colors duration-300 h-10">
                        <DownloadIcon className="h-5 w-5" /> Exportar XLSX
                    </button>
                    <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors duration-300 h-10">
                        <PlusIcon className="h-5 w-5" /> Adicionar Conta
                    </button>
                </div>
            </div>
            
            <div className="mb-4 relative w-full sm:w-1/3 shrink-0">
                <input
                    type="text"
                    placeholder="Buscar por qualquer campo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-background border border-border rounded-xl px-3 py-2 pl-10 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-10 w-full"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-text-secondary" />
                </div>
            </div>
             <div className="mb-6 shrink-0">
                <div className="bg-card p-4 rounded-2xl shadow-md border border-border text-center sm:max-w-sm">
                    <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Total de Contas</p>
                    <p className="text-2xl font-bold text-primary">{filteredContas.length}</p>
                </div>
            </div>

            <div className="bg-card shadow-md rounded-2xl overflow-hidden flex flex-col flex-grow border border-border">
                <div className="overflow-x-auto overflow-y-auto flex-grow">
                    <table className="w-full text-sm text-left text-text-secondary">
                        <thead className="text-sm text-text-primary uppercase bg-secondary sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3">
                                    <input
                                        type="checkbox"
                                        className="h-5 w-5 text-primary bg-background border-border rounded focus:ring-primary"
                                        checked={filteredContas.length > 0 && selectedContas.size === filteredContas.length}
                                        onChange={handleSelectAll}
                                        aria-label="Selecionar todas as contas"
                                    />
                                </th>
                                <th scope="col" className="px-6 py-3">Titular</th>
                                <th scope="col" className="px-6 py-3">CNPJ</th>
                                <th scope="col" className="px-6 py-3">PIX</th>
                                <th scope="col" className="px-6 py-3">Banco</th>
                                <th scope="col" className="px-6 py-3">Agência</th>
                                <th scope="col" className="px-6 py-3">C/C</th>
                                <th scope="col" className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredContas.length > 0 ? (
                                filteredContas.map((conta) => (
                                    <tr 
                                        key={conta.id} 
                                        className={`bg-card border-b border-border hover:bg-secondary transition-colors duration-200 cursor-pointer ${selectedContas.has(conta.id) ? 'bg-primary/10' : ''}`}
                                        onDoubleClick={() => handleRowDoubleClick(conta)}
                                    >
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 text-primary bg-background border-border rounded focus:ring-primary"
                                                checked={selectedContas.has(conta.id)}
                                                onChange={() => handleSelectConta(conta.id)}
                                                aria-label={`Selecionar conta de ${conta.titular}`}
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{conta.titular}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{conta.cnpj}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{conta.pix}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{conta.banco}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{conta.agencia}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{conta.contaCorrente}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={(e) => handleEditClick(e, conta)} className="text-primary hover:text-primary/80 p-2 rounded-full hover:bg-primary/10 transition-colors" aria-label="Editar conta">
                                                    <EditIcon className="h-5 w-5" />
                                                </button>
                                                <button onClick={(e) => handleDeleteClick(e, conta.id)} className="text-danger hover:text-danger/80 p-2 rounded-full hover:bg-danger/10 transition-colors" aria-label="Excluir conta">
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="text-center py-16">
                                        <div className="flex flex-col items-center justify-center text-text-secondary">
                                            <SearchIcon className="w-12 h-12 mb-4 text-gray-300" />
                                            <h3 className="text-xl font-semibold text-text-primary">Nenhuma Conta Encontrada</h3>
                                            <p className="mt-1">Tente ajustar sua busca ou adicione uma nova conta.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && editingConta && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="shrink-0 p-6 pb-4 border-b border-gray-100">
                            <h3 className="text-2xl font-bold text-text-primary text-center">{editingConta.id ? 'Editar Conta' : 'Adicionar Nova Conta'}</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {Object.entries({ titular: 'TITULAR', cnpj: 'CNPJ', pix: 'PIX', banco: 'BANCO', agencia: 'AGENCIA', contaCorrente: 'C/C' }).map(([key, label]) => (
                                <div key={key}>
                                    <label htmlFor={key} className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">{label}</label>
                                    <input 
                                       id={key} 
                                       type="text" 
                                       name={key} 
                                       value={editingConta[key as keyof typeof editingConta] || ''} 
                                       onChange={handleInputChange} 
                                       {...(key === 'cnpj' && { maxLength: 18 })}
                                       className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none placeholder-gray-400 ${errors[key as keyof ContaErrors] ? 'border-danger focus:border-danger focus:ring-danger/10' : ''}`} />
                                    {errors[key as keyof ContaErrors] && <p className="text-danger text-xs mt-1 ml-1">{errors[key as keyof ContaErrors]}</p>}
                                </div>
                            ))}
                        </div>
                        <div className="shrink-0 p-6 pt-4 border-t border-gray-100 flex justify-center gap-3 bg-gray-50">
                            <button onClick={handleCloseModal} className="px-6 py-3 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleSaveChanges} className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">
                                {editingConta.id ? 'Salvar Alterações' : 'Adicionar Conta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isConfirmOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
                        <h3 className="text-xl font-bold mb-4 text-text-primary">Confirmar Ação</h3>
                        <p className="text-text-secondary mb-8">{confirmAction.message}</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={handleCancelConfirm} className="px-6 py-2.5 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                            {confirmAction.action && (
                                <button onClick={handleConfirm} className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Confirmar</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {notification && (
                <div className="fixed bottom-8 right-8 bg-success text-white py-3 px-6 rounded-xl shadow-lg animate-fade-in z-50 font-medium">
                    {notification}
                </div>
            )}
        </div>
    );
};

export default CadastroContasBancarias;
