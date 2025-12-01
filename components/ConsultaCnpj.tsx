import React, { useState } from 'react';
import { SearchIcon, SpinnerIcon, BuildingIcon, CopyIcon, ArrowLeftIcon, CheckIcon } from './icons';

interface CnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  descricao_situacao_cadastral: string;
  data_inicio_atividade: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  ddd_telefone_1: string;
  email: string;
  natureza_juridica: string;
  cnae_fiscal_descricao: string;
  qsa: Array<{
    nome_socio: string;
    qualificacao_socio: string;
  }>;
}

const ConsultaCnpj: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [cnpjInput, setCnpjInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CnpjData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const applyCnpjMask = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpjInput(applyCnpjMask(e.target.value));
    setError(null);
  };

  const fetchCnpj = async () => {
    const cleanCnpj = cnpjInput.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      setError('CNPJ incompleto. Verifique os dígitos.');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error('CNPJ não encontrado.');
        if (response.status === 429) throw new Error('Muitas requisições. Tente novamente mais tarde.');
        throw new Error('Erro ao consultar CNPJ. Verifique a conexão.');
      }
      const result: CnpjData = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchCnpj();
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full h-full overflow-y-auto animate-fade-in flex flex-col">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            {onBack && (
            <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10 text-sm">
                <ArrowLeftIcon className="h-4 w-4" />
                Voltar
            </button>
            )}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <BuildingIcon className="h-6 w-6" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Consulta CNPJ</h2>
            </div>
        </div>

        {/* Search Box */}
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border mb-8">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="flex-grow w-full sm:w-auto">
                <label className="block text-sm font-medium text-text-secondary mb-2 ml-1">Digite o CNPJ</label>
                <div className="relative">
                    <input
                        type="text"
                        value={cnpjInput}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="00.000.000/0000-00"
                        className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 pl-12 text-lg text-text-primary focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none h-12 shadow-inner"
                        maxLength={18}
                    />
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                </div>
            </div>
            <button
                onClick={fetchCnpj}
                disabled={loading || cnpjInput.length < 14}
                className="w-full sm:w-auto h-12 px-8 rounded-full bg-white border border-gray-200 text-primary font-bold hover:bg-orange-50 hover:border-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
            >
                {loading ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <SearchIcon className="h-5 w-5" />}
                {loading ? 'Consultando...' : 'Consultar'}
            </button>
            </div>
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-danger flex items-center gap-2 animate-shake">
                    <span className="font-bold">Erro:</span> {error}
                </div>
            )}
        </div>

        {/* Results */}
        {data && (
            <div className="animate-fade-in space-y-6 pb-8">
            {/* Main Header Card */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-border relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-2 h-full ${data.descricao_situacao_cadastral === 'ATIVA' ? 'bg-success' : 'bg-danger'}`}></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pl-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 
                                className="text-2xl font-bold text-text-primary cursor-pointer hover:text-primary transition-colors flex items-center gap-2 group"
                                onClick={() => copyToClipboard(data.razao_social, 'razao')}
                                title="Clique para copiar"
                            >
                                {data.razao_social}
                                {copiedField === 'razao' ? <CheckIcon className="h-5 w-5 text-success" /> : <CopyIcon className="h-4 w-4 text-text-secondary opacity-0 group-hover:opacity-100" />}
                            </h3>
                        </div>
                        <p 
                            className="text-text-secondary text-lg cursor-pointer hover:text-primary transition-colors flex items-center gap-2 group w-fit"
                            onClick={() => copyToClipboard(data.cnpj, 'cnpj_res')}
                        >
                            {applyCnpjMask(data.cnpj)}
                            {copiedField === 'cnpj_res' ? <CheckIcon className="h-4 w-4 text-success" /> : <CopyIcon className="h-3 w-3 opacity-0 group-hover:opacity-100" />}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase border ${data.descricao_situacao_cadastral === 'ATIVA' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                            {data.descricao_situacao_cadastral}
                        </span>
                        <span className="text-xs text-text-secondary">Aberta em: {formatDate(data.data_inicio_atividade)}</span>
                    </div>
                </div>
                <div className="pl-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <InfoItem label="Nome Fantasia" value={data.nome_fantasia} fieldKey="fantasia" onCopy={copyToClipboard} copiedKey={copiedField} />
                    <InfoItem label="Natureza Jurídica" value={data.natureza_juridica} fieldKey="natureza" onCopy={copyToClipboard} copiedKey={copiedField} />
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contact & Address */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-border col-span-1 lg:col-span-2">
                    <h4 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                        <BuildingIcon className="h-5 w-5 text-primary" /> Endereço e Contato
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                        <InfoItem label="Logradouro" value={`${data.logradouro}, ${data.numero} ${data.complemento}`} fieldKey="logradouro" onCopy={copyToClipboard} copiedKey={copiedField} fullWidth />
                        <InfoItem label="Bairro" value={data.bairro} fieldKey="bairro" onCopy={copyToClipboard} copiedKey={copiedField} />
                        <InfoItem label="CEP" value={data.cep} fieldKey="cep" onCopy={copyToClipboard} copiedKey={copiedField} />
                        <InfoItem label="Município / UF" value={`${data.municipio} - ${data.uf}`} fieldKey="cidade" onCopy={copyToClipboard} copiedKey={copiedField} />
                        
                        <div className="col-span-1 sm:col-span-2 h-px bg-border my-2"></div>

                        <InfoItem label="E-mail" value={data.email} fieldKey="email" onCopy={copyToClipboard} copiedKey={copiedField} />
                        <InfoItem label="Telefone" value={data.ddd_telefone_1} fieldKey="telefone" onCopy={copyToClipboard} copiedKey={copiedField} />
                    </div>
                </div>

                {/* Activity & Partners */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
                    <h4 className="text-lg font-bold text-text-primary mb-4">Atividade e Sócios</h4>
                    <div className="space-y-6">
                        <div className="group">
                            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Atividade Principal</p>
                            <p className="text-sm text-text-primary leading-relaxed">{data.cnae_fiscal_descricao}</p>
                        </div>
                        
                        {data.qsa && data.qsa.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Quadro Societário</p>
                                <ul className="space-y-3">
                                    {data.qsa.map((socio, idx) => (
                                        <li key={idx} className="bg-secondary/30 p-3 rounded-xl border border-border/50 text-sm">
                                            <p className="font-bold text-text-primary">{socio.nome_socio}</p>
                                            <p className="text-xs text-text-secondary mt-0.5">{socio.qualificacao_socio}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </div>
        )}
      </div>
    </div>
  );
};

const InfoItem: React.FC<{ 
    label: string; 
    value: string; 
    fieldKey: string; 
    onCopy: (val: string, key: string) => void; 
    copiedKey: string | null; 
    fullWidth?: boolean 
}> = ({ label, value, fieldKey, onCopy, copiedKey, fullWidth }) => (
    <div className={`group ${fullWidth ? 'col-span-1 sm:col-span-2' : ''}`}>
        <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">{label}</p>
        <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => onCopy(value, fieldKey)}
            title="Copiar"
        >
            <p className="text-base font-medium text-text-primary truncate">{value || '-'}</p>
            {value && (
                copiedKey === fieldKey 
                ? <CheckIcon className="h-4 w-4 text-success shrink-0" /> 
                : <CopyIcon className="h-4 w-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            )}
        </div>
    </div>
);

export default ConsultaCnpj;