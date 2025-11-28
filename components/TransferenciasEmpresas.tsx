
import React, { useState, useMemo, useEffect } from 'react';
import { PlusIcon, TrashIcon, EditIcon, DownloadIcon, SearchIcon } from './icons';
import DatePicker from './DatePicker';

interface Transferencia {
  id: string;
  data: string; // ISO YYYY-MM-DD
  empresaOrigem: string;
  empresaDestino: string;
  valor: number;
  bancoOrigem: string;
  bancoDestino: string;
}

type TransferenciaErrors = Partial<Record<keyof Omit<Transferencia, 'id'>, string>>;

interface TransferenciasEmpresasProps {
  storageKeySuffix?: string;
  onBack?: () => void; // Optional: for card-based nav
}

// Date helpers
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

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


const newTransferenciaTemplate: Omit<Transferencia, 'id'> = {
    data: new Date().toISOString().split('T')[0],
    empresaOrigem: '',
    empresaDestino: '',
    valor: 0,
    bancoOrigem: '',
    bancoDestino: '',
};

const TransferenciasEmpresas: React.FC<TransferenciasEmpresasProps> = ({ storageKeySuffix = '' }) => {
    const LOCAL_STORAGE_KEY_TRANSFERENCIAS = `transferencias_empresas${storageKeySuffix}`;
    
    const [transferencias, setTransferencias] = useState<Transferencia[]>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY_TRANSFERENCIAS);
        return saved ? JSON.parse(saved) : [];
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransferencia, setEditingTransferencia] = useState<Partial<Transferencia> | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: (() => void) | null, message: string }>({ action: null, message: '' });
    const [errors, setErrors] = useState<TransferenciaErrors>({});
    // Initialize with current date
    const [reportDateFilter, setReportDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);


    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY_TRANSFERENCIAS, JSON.stringify(transferencias));
    }, [transferencias, LOCAL_STORAGE_KEY_TRANSFERENCIAS]);

    const filteredTransferencias = useMemo(() => {
        if (!reportDateFilter) {
            return transferencias;
        }
        return transferencias.filter(t => t.data === reportDateFilter);
    }, [transferencias, reportDateFilter]);


    const totalValor = useMemo(() => {
        return filteredTransferencias.reduce((acc, item) => acc + item.valor, 0);
    }, [filteredTransferencias]);

    const handleOpenAddModal = () => {
        setErrors({});
        setEditingTransferencia({ ...newTransferenciaTemplate });
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

    const handleEditClick = (transferencia: Transferencia) => {
        setErrors({});
        setEditingTransferencia({ ...transferencia });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        const action = () => setTransferencias(transferencias.filter(t => t.id !== id));
        setConfirmAction({ action, message: 'Você tem certeza que deseja excluir esta transferência?' });
        setIsConfirmOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTransferencia(null);
        setErrors({});
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (editingTransferencia) {
            const { name, value } = e.target;
            if (name === 'valor') {
                 let numericValue = value.replace(/\D/g, '');
                if (numericValue === '') numericValue = '0';
                const numberValue = Number(numericValue) / 100;
                setEditingTransferencia({ ...editingTransferencia, valor: numberValue });
            }
            else {
                setEditingTransferencia({ ...editingTransferencia, [name]: value });
            }
        }
    };

     const handleExportXLSX = () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
            alert("Erro: A biblioteca de exportação não foi carregada.");
            return;
        }

        const dataToExport = filteredTransferencias.map(t => ({
            'Data': formatDateToBR(t.data),
            'Origem': `${t.empresaOrigem} - ${t.bancoOrigem}`,
            'Destino': `${t.empresaDestino} - ${t.bancoDestino}`,
            'Valor': t.valor
        }));

        const totalLancamentos = filteredTransferencias.length;
        
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['TRANSFERÊNCIAS ENTRE EMPRESAS'],
            [],
            ['Total de Lançamentos:', totalLancamentos],
            ['Valor Total:', totalValor],
            [],
            ['Data', 'Origem', 'Destino', 'Valor']
        ]);
        
        XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A7', skipHeader: true });
        
        // Merge title cell
        worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

        // Format currency cells
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let R = range.s.r + 6; R <= range.e.r; ++R) {
            const cell_address = { c: 3, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (worksheet[cell_ref]) {
                worksheet[cell_ref].t = 'n';
                worksheet[cell_ref].z = 'R$ #,##0.00';
            }
        }
        
        const totalValueCellRef = 'B4';
        if (worksheet[totalValueCellRef]) {
            worksheet[totalValueCellRef].t = 'n';
            worksheet[totalValueCellRef].z = 'R$ #,##0.00';
        }

        // Set column widths
        worksheet['!cols'] = [
            { wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 15 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transferências');
        XLSX.writeFile(workbook, `transferencias_${reportDateFilter || 'geral'}.xlsx`);
    };

    const validate = (): boolean => {
        if (!editingTransferencia) return false;
        
        const newErrors: TransferenciaErrors = {};

        if (!editingTransferencia.data) newErrors.data = 'Data é obrigatória.';
        if (!editingTransferencia.empresaOrigem?.trim()) newErrors.empresaOrigem = 'Empresa de Origem é obrigatória.';
        if (!editingTransferencia.empresaDestino?.trim()) newErrors.empresaDestino = 'Empresa Destino é obrigatória.';
        if (!editingTransferencia.bancoOrigem?.trim()) newErrors.bancoOrigem = 'Banco de Origem é obrigatório.';
        if (!editingTransferencia.bancoDestino?.trim()) newErrors.bancoDestino = 'Banco de Destino é obrigatório.';
        
        if (!editingTransferencia.valor || editingTransferencia.valor <= 0) {
            newErrors.valor = 'O Valor deve ser maior que zero.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveChanges = () => {
        if (!validate()) {
            return;
        }
        
        if (!editingTransferencia || !editingTransferencia.data) return;
        
        const transferenciaToSave = {
            ...editingTransferencia,
        } as Transferencia;

        const action = () => {
            if (transferenciaToSave.id) { // Edit
                setTransferencias(transferencias.map(t => t.id === transferenciaToSave.id ? transferenciaToSave : t));
            } else { // Add
                const newTransferencia: Transferencia = {
                    id: `transf-${Date.now()}`,
                    ...newTransferenciaTemplate,
                    ...transferenciaToSave
                };
                setTransferencias([...transferencias, newTransferencia]);
            }
            handleCloseModal();
        };

        setConfirmAction({
            action,
            message: editingTransferencia.id ? 'Deseja salvar as alterações?' : 'Deseja adicionar esta nova transferência?'
        });
        setIsConfirmOpen(true);
    };

    const handleConfirm = () => {
        if (confirmAction.action) confirmAction.action();
        setIsConfirmOpen(false);
    };

    const handleCancelConfirm = () => setIsConfirmOpen(false);

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                     <span className="font-semibold text-sm">Filtrar por Dia:</span>
                     <DatePicker 
                        value={reportDateFilter} 
                        onChange={setReportDateFilter} 
                        className="w-40"
                    />
                    <button onClick={() => setReportDateFilter('')} className="py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10">Limpar</button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportXLSX}
                        className="flex items-center justify-center gap-2 bg-success text-white font-semibold py-2 px-4 rounded-full hover:bg-green-700 transition-colors duration-300 h-10"
                    >
                        <DownloadIcon className="h-5 w-5" />
                        Relatório
                    </button>
                    <button
                        onClick={handleOpenAddModal}
                        className="flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2 px-4 rounded-full hover:bg-primary-hover transition-colors duration-300 h-10"
                    >
                        <PlusIcon className="h-5 w-5" />
                        Adicionar
                    </button>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-card p-4 rounded-2xl shadow-md border border-border text-center">
                    <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Valor Total</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totalValor)}</p>
                </div>
                <div className="bg-card p-4 rounded-2xl shadow-md border border-border text-center">
                    <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Transferências</p>
                    <p className="text-2xl font-bold text-primary">{filteredTransferencias.length}</p>
                </div>
            </div>
            
            <div className="bg-card shadow-md rounded-2xl overflow-x-auto">
                <table className="w-full text-base text-left text-text-secondary">
                    <thead className="text-sm text-text-primary uppercase bg-secondary">
                        <tr>
                            <th scope="col" className="px-6 py-3">Data</th>
                            <th scope="col" className="px-6 py-3">Empresa Origem</th>
                            <th scope="col" className="px-6 py-3">Banco Origem</th>
                            <th scope="col" className="px-6 py-3">Empresa Destino</th>
                            <th scope="col" className="px-6 py-3">Banco Destino</th>
                            <th scope="col" className="px-6 py-3 text-right">Valor</th>
                            <th scope="col" className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransferencias.length > 0 ? (
                            filteredTransferencias.map(item => (
                                <tr key={item.id} className="bg-card border-b border-border">
                                    <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{formatDateToBR(item.data)}</td>
                                    <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{item.empresaOrigem}</td>
                                    <td className="px-6 py-4">{item.bancoOrigem}</td>
                                    <td className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{item.empresaDestino}</td>
                                    <td className="px-6 py-4">{item.bancoDestino}</td>
                                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(item.valor)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-evenly w-full">
                                            <button onClick={() => handleEditClick(item)} className="flex items-center justify-center text-primary hover:text-primary/80 p-2 rounded-full hover:bg-primary/10 transition-colors">
                                                <EditIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => handleDeleteClick(item.id)} className="flex items-center justify-center text-danger hover:text-danger/80 p-2 rounded-full hover:bg-danger/10 transition-colors">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="text-center py-16">
                                    <div className="flex flex-col items-center justify-center text-text-secondary">
                                        <SearchIcon className="w-12 h-12 mb-4 text-gray-300" />
                                        <h3 className="text-xl font-semibold text-text-primary">Nenhuma Transferência Encontrada</h3>
                                        <p className="mt-1">{reportDateFilter ? 'Não há dados para a data selecionada.' : 'Adicione uma nova transferência para começar.'}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && editingTransferencia && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="shrink-0 p-6 pb-4 border-b border-gray-100">
                            <h3 className="text-2xl font-bold text-text-primary text-center">
                                {editingTransferencia.id ? 'Editar Transferência' : 'Adicionar Transferência'}
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                             <div>
                                <DatePicker 
                                    label="Data"
                                    value={editingTransferencia.data || ''} 
                                    onChange={(val) => setEditingTransferencia(prev => ({...prev, data: val}))} 
                                    placeholder="Selecione"
                                />
                                {errors.data && <p className="text-danger text-xs mt-1 ml-1">{errors.data}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Empresa de Origem</label>
                                <input type="text" name="empresaOrigem" placeholder="Digite a empresa de origem" value={editingTransferencia.empresaOrigem || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.empresaOrigem ? 'border-danger' : ''}`} />
                                {errors.empresaOrigem && <p className="text-danger text-xs mt-1 ml-1">{errors.empresaOrigem}</p>}
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Banco Origem</label>
                                <input type="text" name="bancoOrigem" placeholder="Ex: Itaú" value={editingTransferencia.bancoOrigem || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.bancoOrigem ? 'border-danger' : ''}`} />
                                {errors.bancoOrigem && <p className="text-danger text-xs mt-1 ml-1">{errors.bancoOrigem}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Empresa Destino</label>
                                <input type="text" name="empresaDestino" placeholder="Digite a empresa de destino" value={editingTransferencia.empresaDestino || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.empresaDestino ? 'border-danger' : ''}`} />
                                {errors.empresaDestino && <p className="text-danger text-xs mt-1 ml-1">{errors.empresaDestino}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Banco Destino</label>
                                <input type="text" name="bancoDestino" placeholder="Ex: Inter" value={editingTransferencia.bancoDestino || ''} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.bancoDestino ? 'border-danger' : ''}`} />
                                {errors.bancoDestino && <p className="text-danger text-xs mt-1 ml-1">{errors.bancoDestino}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Valor</label>
                                <input type="text" name="valor" value={formatCurrency(editingTransferencia.valor || 0)} onChange={handleInputChange} className={`w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 ${errors.valor ? 'border-danger' : ''}`} />
                                {errors.valor && <p className="text-danger text-xs mt-1 ml-1">{errors.valor}</p>}
                            </div>
                        </div>
                        <div className="shrink-0 p-6 pt-4 border-t border-gray-100 flex justify-center gap-3 bg-gray-50">
                            <button onClick={handleCloseModal} className="px-6 py-3 rounded-xl bg-secondary text-text-primary font-semibold hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleSaveChanges} className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Salvar</button>
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
                            <button onClick={handleConfirm} className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransferenciasEmpresas;
