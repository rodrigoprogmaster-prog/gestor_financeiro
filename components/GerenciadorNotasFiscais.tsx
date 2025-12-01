
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UploadIcon, SearchIcon, FileTextIcon, ArrowLeftIcon, XIcon, CheckIcon, DownloadIcon } from './icons';

interface ItemNota {
    codigo: string;
    descricao: string;
    ncm: string;
    cst: string;
    cfop: string;
    unidade: string;
    quantidade: string;
    valorUnitario: string;
    valorTotal: string;
}

interface NotaFiscal {
    id: string; // Chave de Acesso
    numero: string;
    serie: string;
    dataEmissao: string;
    naturezaOperacao: string;
    tipo: '0' | '1'; // 0-Entrada, 1-Saída
    emitente: {
        nome: string;
        cnpj: string;
        inscricaoEstadual: string;
        endereco: string;
        bairro: string;
        cep: string;
        municipio: string;
        uf: string;
        fone: string;
    };
    destinatario: {
        nome: string;
        cnpj: string;
        inscricaoEstadual: string;
        endereco: string;
        bairro: string;
        cep: string;
        municipio: string;
        uf: string;
        fone: string;
    };
    valores: {
        bcIcms: number;
        valorIcms: number;
        bcSt: number;
        valorSt: number;
        totalProdutos: number;
        frete: number;
        seguro: number;
        desconto: number;
        outras: number;
        ipi: number;
        totalNota: number;
    };
    itens: ItemNota[];
    xmlContent: string;
    dataImportacao: string;
}

const STORAGE_KEY = 'notas_fiscais_data';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDateToBR = (isoDate: string): string => {
    if (!isoDate) return '';
    const datePart = isoDate.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
};

// Helper component for DANFE fields
const DanfeField: React.FC<{ label: string; value?: string | number; className?: string; valueClassName?: string }> = ({ label, value, className = "", valueClassName = "" }) => (
    <div className={`flex flex-col ${className}`}>
        <span className="text-[8px] font-bold text-gray-500 uppercase leading-none mb-0.5">{label}</span>
        <span className={`text-[10px] font-bold text-black uppercase leading-tight break-words ${valueClassName}`}>{value || ''}</span>
    </div>
);

const GerenciadorNotasFiscais: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const [notas, setNotas] = useState<NotaFiscal[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedNota, setSelectedNota] = useState<NotaFiscal | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notas));
    }, [notas]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const xmlText = e.target?.result as string;
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");

                if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                    throw new Error("Erro ao ler o arquivo XML.");
                }

                const getTagValue = (tagName: string, context: Document | Element = xmlDoc) => {
                    const elements = context.getElementsByTagName(tagName);
                    return elements.length > 0 ? elements[0].textContent || '' : '';
                };

                const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
                const id = infNFe ? infNFe.getAttribute("Id")?.replace('NFe', '') || `nf-${Date.now()}` : `nf-${Date.now()}`;
                
                if (notas.some(n => n.id === id)) {
                    alert("Esta Nota Fiscal já foi importada.");
                    return;
                }

                // Ide
                const ide = xmlDoc.getElementsByTagName("ide")[0];
                const numero = getTagValue("nNF", ide);
                const serie = getTagValue("serie", ide);
                const natOp = getTagValue("natOp", ide);
                const tpNF = getTagValue("tpNF", ide) as '0' | '1';
                let dataEmissao = getTagValue("dhEmi", ide); 
                if (!dataEmissao) dataEmissao = getTagValue("dEmi", ide);

                // Emitente
                const emit = xmlDoc.getElementsByTagName("emit")[0];
                const enderEmit = emit.getElementsByTagName("enderEmit")[0];
                const emitente = {
                    nome: getTagValue("xNome", emit),
                    cnpj: getTagValue("CNPJ", emit),
                    inscricaoEstadual: getTagValue("IE", emit),
                    endereco: `${getTagValue("xLgr", enderEmit)}, ${getTagValue("nro", enderEmit)}`,
                    bairro: getTagValue("xBairro", enderEmit),
                    cep: getTagValue("CEP", enderEmit),
                    municipio: getTagValue("xMun", enderEmit),
                    uf: getTagValue("UF", enderEmit),
                    fone: getTagValue("fone", enderEmit)
                };

                // Destinatario
                const dest = xmlDoc.getElementsByTagName("dest")[0];
                const enderDest = dest?.getElementsByTagName("enderDest")[0];
                const destinatario = {
                    nome: getTagValue("xNome", dest),
                    cnpj: getTagValue("CNPJ", dest) || getTagValue("CPF", dest),
                    inscricaoEstadual: getTagValue("IE", dest),
                    endereco: enderDest ? `${getTagValue("xLgr", enderDest)}, ${getTagValue("nro", enderDest)}` : '',
                    bairro: getTagValue("xBairro", enderDest),
                    cep: getTagValue("CEP", enderDest),
                    municipio: getTagValue("xMun", enderDest),
                    uf: getTagValue("UF", enderDest),
                    fone: getTagValue("fone", enderDest)
                };

                // Totals
                const total = xmlDoc.getElementsByTagName("total")[0];
                const ICMSTot = total?.getElementsByTagName("ICMSTot")[0];
                
                const parseVal = (tag: string) => parseFloat(getTagValue(tag, ICMSTot)) || 0;

                const valores = {
                    bcIcms: parseVal("vBC"),
                    valorIcms: parseVal("vICMS"),
                    bcSt: parseVal("vBCST"),
                    valorSt: parseVal("vST"),
                    totalProdutos: parseVal("vProd"),
                    frete: parseVal("vFrete"),
                    seguro: parseVal("vSeg"),
                    desconto: parseVal("vDesc"),
                    outras: parseVal("vOutro"),
                    ipi: parseVal("vIPI"),
                    totalNota: parseVal("vNF"),
                };

                // Itens
                const dets = xmlDoc.getElementsByTagName("det");
                const itens: ItemNota[] = [];
                for (let i = 0; i < dets.length; i++) {
                    const prod = dets[i].getElementsByTagName("prod")[0];
                    const imposto = dets[i].getElementsByTagName("imposto")[0];
                    itens.push({
                        codigo: getTagValue("cProd", prod),
                        descricao: getTagValue("xProd", prod),
                        ncm: getTagValue("NCM", prod),
                        cst: "", // Simplified extraction
                        cfop: getTagValue("CFOP", prod),
                        unidade: getTagValue("uCom", prod),
                        quantidade: getTagValue("qCom", prod),
                        valorUnitario: getTagValue("vUnCom", prod),
                        valorTotal: getTagValue("vProd", prod),
                    });
                }

                const newNota: NotaFiscal = {
                    id,
                    numero,
                    serie,
                    dataEmissao,
                    naturezaOperacao: natOp,
                    tipo: tpNF,
                    emitente,
                    destinatario,
                    valores,
                    itens,
                    xmlContent: xmlText,
                    dataImportacao: new Date().toISOString()
                };

                setNotas(prev => [newNota, ...prev]);

            } catch (error) {
                console.error("XML Parsing Error", error);
                alert("Falha ao processar o arquivo XML. Verifique se é uma NF-e válida.");
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const filteredNotas = useMemo(() => {
        return notas.filter(n => 
            n.numero.includes(searchTerm) || 
            n.emitente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.destinatario.nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [notas, searchTerm]);

    const renderDanfeModal = () => {
        if (!selectedNota) return null;

        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 animate-fade-in overflow-y-auto">
                <div className="bg-white text-black w-full max-w-5xl rounded-sm shadow-2xl overflow-hidden flex flex-col font-sans my-4 relative">
                    
                    {/* Floating Toolbar - Responsive Fix: flex-wrap added */}
                    <div className="sticky top-0 bg-slate-800 text-white p-4 flex flex-wrap justify-between items-center gap-4 z-10 shadow-md print:hidden shrink-0">
                        <h3 className="font-bold text-lg whitespace-nowrap overflow-hidden text-ellipsis">Visualização da Nota Fiscal</h3>
                        <div className="flex items-center gap-4">
                            <button onClick={() => window.print()} className="flex items-center gap-2 hover:text-blue-300 transition-colors whitespace-nowrap">
                                <DownloadIcon className="h-5 w-5" /> Imprimir
                            </button>
                            <button onClick={() => setSelectedNota(null)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                                <XIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Document Content - A4 Proportions Simulation */}
                    <div className="p-8 bg-white text-[10px] leading-tight print:p-0 print:m-0 font-sans overflow-x-auto">
                        <div className="min-w-[700px]">
                            {/* Header Area */}
                            <div className="border-2 border-black p-1 mb-1 grid grid-cols-12 gap-1 min-h-[140px]">
                                {/* Emitente Info */}
                                <div className="col-span-5 border border-black p-2 flex flex-col justify-center">
                                    <h4 className="font-bold text-sm uppercase mb-2 break-words">{selectedNota.emitente.nome}</h4>
                                    <div className="text-[9px] space-y-0.5">
                                        <p className="break-words">{selectedNota.emitente.endereco}</p>
                                        <p>{selectedNota.emitente.bairro} - {selectedNota.emitente.municipio} / {selectedNota.emitente.uf}</p>
                                        <p>CEP: {selectedNota.emitente.cep}</p>
                                        <p>Fone: {selectedNota.emitente.fone}</p>
                                    </div>
                                </div>

                                {/* DANFE Label */}
                                <div className="col-span-2 border border-black p-2 flex flex-col items-center justify-between text-center">
                                    <h2 className="font-bold text-3xl tracking-widest">DANFE</h2>
                                    <p className="text-[8px] leading-none">Documento Auxiliar da<br/>Nota Fiscal Eletrônica</p>
                                    
                                    <div className="w-full flex justify-center gap-2 my-1 text-[9px]">
                                        <div className="text-left">
                                            <div className="flex items-center gap-1">0 - Entrada</div>
                                            <div className="flex items-center gap-1">1 - Saída</div>
                                        </div>
                                        <div className="border border-black px-3 py-1 font-bold text-lg">{selectedNota.tipo}</div>
                                    </div>

                                    <div className="w-full text-center">
                                        <p className="font-bold text-sm">Nº {selectedNota.numero}</p>
                                        <p className="font-bold">SÉRIE {selectedNota.serie}</p>
                                        <p className="text-[8px]">Folha 1/1</p>
                                    </div>
                                </div>

                                {/* Barcode & Key */}
                                <div className="col-span-5 border border-black p-2 flex flex-col justify-between">
                                    <div className="h-14 w-full bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-400 text-[10px] mb-1">
                                        |||||||||||| |||||||||||| |||||||||||| ||||||||||||
                                    </div>
                                    <div>
                                        <p className="font-bold text-[9px] mb-0.5">CHAVE DE ACESSO</p>
                                        <p className="text-xs font-bold tracking-wider text-center bg-gray-50 border border-gray-300 p-1 break-all">{selectedNota.id}</p>
                                    </div>
                                    <div className="mt-1 text-center">
                                        <p className="text-[9px]">Consulta de autenticidade no portal nacional da NF-e<br/>www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora</p>
                                    </div>
                                </div>
                            </div>

                            {/* Natureza Operacao */}
                            <div className="grid grid-cols-12 gap-1 mb-1">
                                <div className="col-span-7 border border-black p-1">
                                    <DanfeField label="NATUREZA DA OPERAÇÃO" value={selectedNota.naturezaOperacao} />
                                </div>
                                <div className="col-span-5 border border-black p-1">
                                    <DanfeField label="PROTOCOLO DE AUTORIZAÇÃO DE USO" value="123456789012345 - 01/01/2025 12:00:00" /> {/* Mocked Protocol */}
                                </div>
                            </div>

                            {/* Inscrição Estadual Section */}
                            <div className="grid grid-cols-12 gap-1 mb-2 border border-black bg-gray-50 p-1">
                                <div className="col-span-4"><DanfeField label="INSCRIÇÃO ESTADUAL" value={selectedNota.emitente.inscricaoEstadual} /></div>
                                <div className="col-span-4"><DanfeField label="INSC. ESTADUAL DO SUBST. TRIB." value="" /></div>
                                <div className="col-span-4"><DanfeField label="CNPJ" value={selectedNota.emitente.cnpj} /></div>
                            </div>

                            {/* Destinatário Section */}
                            <div className="mb-2">
                                <h5 className="font-bold text-[9px] uppercase bg-gray-200 px-1 border border-black border-b-0">Destinatário / Remetente</h5>
                                <div className="border border-black">
                                    <div className="grid grid-cols-12 border-b border-black">
                                        <div className="col-span-7 p-1 border-r border-black"><DanfeField label="NOME / RAZÃO SOCIAL" value={selectedNota.destinatario.nome} /></div>
                                        <div className="col-span-3 p-1 border-r border-black"><DanfeField label="CNPJ / CPF" value={selectedNota.destinatario.cnpj} /></div>
                                        <div className="col-span-2 p-1"><DanfeField label="DATA DA EMISSÃO" value={formatDateToBR(selectedNota.dataEmissao)} /></div>
                                    </div>
                                    <div className="grid grid-cols-12 border-b border-black">
                                        <div className="col-span-6 p-1 border-r border-black"><DanfeField label="ENDEREÇO" value={selectedNota.destinatario.endereco} /></div>
                                        <div className="col-span-4 p-1 border-r border-black"><DanfeField label="BAIRRO / DISTRITO" value={selectedNota.destinatario.bairro} /></div>
                                        <div className="col-span-2 p-1"><DanfeField label="CEP" value={selectedNota.destinatario.cep} /></div>
                                    </div>
                                    <div className="grid grid-cols-12">
                                        <div className="col-span-4 p-1 border-r border-black"><DanfeField label="MUNICÍPIO" value={selectedNota.destinatario.municipio} /></div>
                                        <div className="col-span-1 p-1 border-r border-black"><DanfeField label="UF" value={selectedNota.destinatario.uf} /></div>
                                        <div className="col-span-3 p-1 border-r border-black"><DanfeField label="FONE / FAX" value={selectedNota.destinatario.fone} /></div>
                                        <div className="col-span-4 p-1"><DanfeField label="INSCRIÇÃO ESTADUAL" value={selectedNota.destinatario.inscricaoEstadual} /></div>
                                    </div>
                                </div>
                            </div>

                            {/* Impostos Section */}
                            <div className="mb-2">
                                <h5 className="font-bold text-[9px] uppercase bg-gray-200 px-1 border border-black border-b-0">Cálculo do Imposto</h5>
                                <div className="border border-black flex">
                                    <div className="flex-1 p-1 border-r border-black"><DanfeField label="BASE DE CÁLC. DO ICMS" value={formatCurrency(selectedNota.valores.bcIcms)} valueClassName="text-right" /></div>
                                    <div className="flex-1 p-1 border-r border-black"><DanfeField label="VALOR DO ICMS" value={formatCurrency(selectedNota.valores.valorIcms)} valueClassName="text-right" /></div>
                                    <div className="flex-1 p-1 border-r border-black"><DanfeField label="BASE DE CÁLC. DO ICMS ST" value={formatCurrency(selectedNota.valores.bcSt)} valueClassName="text-right" /></div>
                                    <div className="flex-1 p-1 border-r border-black"><DanfeField label="VALOR DO ICMS ST" value={formatCurrency(selectedNota.valores.valorSt)} valueClassName="text-right" /></div>
                                    <div className="flex-1 p-1"><DanfeField label="VALOR TOTAL DOS PRODUTOS" value={formatCurrency(selectedNota.valores.totalProdutos)} valueClassName="text-right" /></div>
                                </div>
                                <div className="border border-black border-t-0 flex">
                                    <div className="flex-1 p-1 border-r border-black"><DanfeField label="VALOR DO FRETE" value={formatCurrency(selectedNota.valores.frete)} valueClassName="text-right" /></div>
                                    <div className="flex-1 p-1 border-r border-black"><DanfeField label="VALOR DO SEGURO" value={formatCurrency(selectedNota.valores.seguro)} valueClassName="text-right" /></div>
                                    <div className="flex-1 p-1 border-r border-black"><DanfeField label="DESCONTO" value={formatCurrency(selectedNota.valores.desconto)} valueClassName="text-right" /></div>
                                    <div className="flex-1 p-1 border-r border-black"><DanfeField label="OUTRAS DESP. ACESS." value={formatCurrency(selectedNota.valores.outras)} valueClassName="text-right" /></div>
                                    <div className="flex-1 p-1 border-r border-black"><DanfeField label="VALOR DO IPI" value={formatCurrency(selectedNota.valores.ipi)} valueClassName="text-right" /></div>
                                    <div className="flex-1 p-1 bg-gray-100"><DanfeField label="VALOR TOTAL DA NOTA" value={formatCurrency(selectedNota.valores.totalNota)} valueClassName="text-right text-lg" /></div>
                                </div>
                            </div>

                            {/* Itens Section */}
                            <div className="mb-2">
                                <h5 className="font-bold text-[9px] uppercase bg-gray-200 px-1 border border-black border-b-0">Dados do Produto / Serviço</h5>
                                <div className="border border-black min-h-[250px]">
                                    <table className="w-full text-[9px] border-collapse">
                                        <thead className="bg-gray-100 border-b border-black">
                                            <tr>
                                                <th className="p-1 border-r border-black w-16 text-left">CÓDIGO</th>
                                                <th className="p-1 border-r border-black text-left">DESCRIÇÃO</th>
                                                <th className="p-1 border-r border-black w-16">NCM/SH</th>
                                                <th className="p-1 border-r border-black w-10">CST</th>
                                                <th className="p-1 border-r border-black w-10">CFOP</th>
                                                <th className="p-1 border-r border-black w-10">UNID.</th>
                                                <th className="p-1 border-r border-black w-16 text-right">QTD.</th>
                                                <th className="p-1 border-r border-black w-20 text-right">V.UNIT.</th>
                                                <th className="p-1 border-r border-black w-20 text-right">V.TOTAL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-300">
                                            {selectedNota.itens.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-1 border-r border-black align-top">{item.codigo}</td>
                                                    <td className="p-1 border-r border-black align-top break-words whitespace-normal">{item.descricao}</td>
                                                    <td className="p-1 border-r border-black align-top text-center">{item.ncm}</td>
                                                    <td className="p-1 border-r border-black align-top text-center">{item.cst}</td>
                                                    <td className="p-1 border-r border-black align-top text-center">{item.cfop}</td>
                                                    <td className="p-1 border-r border-black align-top text-center">{item.unidade}</td>
                                                    <td className="p-1 border-r border-black align-top text-right">{parseFloat(item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                    <td className="p-1 border-r border-black align-top text-right">{parseFloat(item.valorUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                    <td className="p-1 border-r border-black align-top text-right font-bold">{parseFloat(item.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Footer Stub */}
                            <div className="border border-black p-2 mt-4 text-[9px] text-gray-500">
                                <p>DADOS ADICIONAIS</p>
                                <p>INFORMAÇÕES COMPLEMENTARES: Documento emitido por ME ou EPP optante pelo Simples Nacional.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in flex flex-col h-full">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xml" />
            
            {/* Header with Unified Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold transition-colors h-10 text-sm shadow-sm">
                            <ArrowLeftIcon className="h-4 w-4" />
                            Voltar
                        </button>
                    )}
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Notas Fiscais (XML)</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex items-center gap-2 bg-white border border-gray-200 text-primary font-bold py-2 px-4 rounded-full hover:bg-orange-50 hover:border-orange-200 transition-colors duration-300 h-10 text-sm shadow-sm"
                    >
                        <UploadIcon className="h-4 w-4" /> Importar XML
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-card p-3 rounded-2xl border border-border shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative w-full sm:w-96">
                    <input 
                        type="text" 
                        placeholder="Buscar por número, emitente ou destinatário..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2 bg-secondary border-transparent rounded-xl text-sm text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-text-secondary"/>
                    </div>
                </div>
                <div className="ml-auto text-xs font-medium text-text-secondary">
                    Total: {filteredNotas.length} notas
                </div>
            </div>

            {/* List Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex-grow shadow-sm flex flex-col">
                <div className="overflow-x-auto overflow-y-auto flex-grow">
                    <table className="min-w-full divide-y divide-border text-sm text-left">
                        <thead className="bg-secondary text-text-secondary font-medium uppercase text-xs tracking-wider sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3">Número / Série</th>
                                <th className="px-6 py-3">Emissão</th>
                                <th className="px-6 py-3">Emitente</th>
                                <th className="px-6 py-3">Destinatário</th>
                                <th className="px-6 py-3 text-right">Valor Total</th>
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                            {filteredNotas.length > 0 ? (
                                filteredNotas.map((nota) => (
                                    <tr key={nota.id} className="hover:bg-secondary transition-colors duration-150">
                                        <td className="px-6 py-4 font-medium text-text-primary">
                                            {nota.numero} <span className="text-text-secondary text-xs opacity-70">/ {nota.serie}</span>
                                        </td>
                                        <td className="px-6 py-4 text-text-secondary text-sm">{formatDateToBR(nota.dataEmissao)}</td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="truncate font-medium" title={nota.emitente.nome}>{nota.emitente.nome}</div>
                                            <div className="text-xs text-text-secondary">{nota.emitente.cnpj}</div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="truncate font-medium" title={nota.destinatario.nome}>{nota.destinatario.nome}</div>
                                            <div className="text-xs text-text-secondary">{nota.destinatario.cnpj}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-text-primary">{formatCurrency(nota.valores.totalNota)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => setSelectedNota(nota)}
                                                className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors flex items-center justify-center gap-1 mx-auto"
                                                title="Visualizar DANFE"
                                            >
                                                <FileTextIcon className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-20">
                                        <div className="flex flex-col items-center text-text-secondary">
                                            <SearchIcon className="w-12 h-12 mb-4 text-gray-300"/>
                                            <h3 className="text-lg font-medium text-text-primary">Nenhuma Nota Encontrada</h3>
                                            <p className="text-sm mt-1">Importe um arquivo XML para visualizar as notas.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DANFE Modal */}
            {renderDanfeModal()}
        </div>
    );
};

export default GerenciadorNotasFiscais;
