
import React, { useState, useEffect, useRef } from 'react';
import PasswordModal from './PasswordModal';
import { UserIcon, KeyIcon, ArrowLeftIcon, EditIcon, CheckIcon, ChevronDownIcon, UploadIcon, DownloadIcon, DatabaseIcon, SpinnerIcon } from './icons';

// Modal for managing users (placeholder)
const ManageUsersModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-text-primary">Gerenciar Usuários</h3>
            <p className="text-text-secondary mb-6">Esta funcionalidade está em desenvolvimento e estará disponível em breve.</p>
            <div className="flex justify-end">
                <button onClick={onClose} className="py-2 px-4 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Fechar</button>
            </div>
        </div>
    </div>
);

// Modal for changing password
const ChangePasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const savedPassword = localStorage.getItem('user_password') || '140552';

        if (currentPassword !== savedPassword) {
            setError('A senha atual está incorreta.');
            return;
        }

        if (newPassword.length < 6) {
            setError('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('As novas senhas não coincidem.');
            return;
        }

        localStorage.setItem('user_password', newPassword);
        setSuccess('Senha alterada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
             onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-card rounded-2xl shadow-lg border border-border p-8 w-full max-w-md">
                <h3 className="text-xl font-bold mb-6 text-text-primary">Alterar Senha de Acesso</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="password" placeholder="Senha Atual" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full bg-white border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-12" autoFocus />
                    <input type="password" placeholder="Nova Senha" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full bg-white border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-12" />
                    <input type="password" placeholder="Confirmar Nova Senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-white border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-12" />
                    
                    {error && <p className="text-danger text-sm">{error}</p>}
                    {success && <p className="text-success text-sm">{success}</p>}

                    <div className="pt-4 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button>
                        <button type="submit" className="py-2 px-4 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Salvar Nova Senha</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const googleFonts = [
    'Inter', 'Roboto', 'Lato', 'Montserrat', 'Open Sans', 'Poppins', 
    'Source Sans 3', 'Outfit', 'DM Sans', 'Plus Jakarta Sans', 'Work Sans', 
    'Manrope', 'Raleway', 'Fira Sans', 'Nunito Sans'
];

const ConfiguracaoSeguranca: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(true); // For initial unlock
    const [isActionPasswordModalOpen, setIsActionPasswordModalOpen] = useState(false); // For subsequent actions
    const [passwordAction, setPasswordAction] = useState<{ action: (() => void) | null }>({ action: null });
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [isManageUsersModalOpen, setIsManageUsersModalOpen] = useState(false);
    const [isRestoreSuccessModalOpen, setIsRestoreSuccessModalOpen] = useState(false);
    const [profilePicture, setProfilePicture] = useState(() => localStorage.getItem('profile_picture'));
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const [bodyFont, setBodyFont] = useState(() => localStorage.getItem('fontBody') || 'Inter');
    const [headingFont, setHeadingFont] = useState(() => localStorage.getItem('fontHeading') || 'Inter');
    const [fontTarget, setFontTarget] = useState<'all' | 'headings'>('all');
    const [loadedFonts, setLoadedFonts] = useState<string[]>(['Roboto', 'Inter']);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const currentFont = fontTarget === 'all' ? bodyFont : headingFont;

    useEffect(() => {
        const fontToLoad = currentFont;
        if (fontToLoad && !loadedFonts.includes(fontToLoad)) {
            const sanitizedFontName = fontToLoad.trim().replace(/\s+/g, '+');
            const link = document.createElement('link');
            link.href = `https://fonts.googleapis.com/css2?family=${sanitizedFontName}:wght@400;500;700;900&display=swap`;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
            setLoadedFonts(prev => [...prev, fontToLoad]);
        }
    }, [currentFont, loadedFonts]);
    
    const showNotification = (message: string, type: 'success' | 'error' = 'success', duration: number = 3000) => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, duration);
    };

    const handleInitialUnlockSuccess = () => {
        setIsPasswordModalOpen(false);
        setIsUnlocked(true);
    };
    
    const handleActionPasswordSuccess = () => {
        setIsActionPasswordModalOpen(false);
        if (passwordAction.action) {
            passwordAction.action();
        }
        setPasswordAction({ action: null });
    };

    const requestPassword = (action: () => void) => {
        setPasswordAction({ action });
        setIsActionPasswordModalOpen(true);
    };
    
    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target?.result as string;
                localStorage.setItem('profile_picture', base64);
                setProfilePicture(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleApplyFont = () => {
        const apply = (target: 'body' | 'heading', fontName: string) => {
            document.documentElement.style.setProperty(`--font-${target}`, fontName);
            localStorage.setItem(`font${target.charAt(0).toUpperCase() + target.slice(1)}`, fontName);
        };
        if (fontTarget === 'all') {
            apply('body', bodyFont);
            apply('heading', bodyFont);
            setHeadingFont(bodyFont);
        } else {
            apply('heading', headingFont);
        }
        showNotification('Fonte aplicada com sucesso!', 'success');
    };
    
    const handleBackup = () => {
        try {
            setIsProcessing(true);
            // 1. Estrutura do Backup (Versionado para evitar incompatibilidades futuras)
            const backupPayload = {
                meta: {
                    timestamp: new Date().toISOString(),
                    version: '2.2', // Versão atualizada
                    appName: 'Gerenciador Financeiro',
                    itemCount: 0
                },
                data: {} as Record<string, any>
            };

            let count = 0;
            // 2. Itera sobre o LocalStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    const value = localStorage.getItem(key);
                    if (value) {
                        try {
                            // Tenta fazer o parse para salvar como Objeto JSON no arquivo (fica legível)
                            // Se for uma string pura (ex: tema 'dark'), salva como string
                            backupPayload.data[key] = JSON.parse(value);
                        } catch (e) {
                            // Se falhar o parse, salva como string mesmo (ex: senhas ou tokens simples)
                            backupPayload.data[key] = value;
                        }
                        count++;
                    }
                }
            }
            backupPayload.meta.itemCount = count;

            // 3. Gera e baixa o arquivo
            const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().slice(0, 10);
            a.download = `backup_financeiro_v2_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('Backup gerado com sucesso!', 'success');
        } catch (error) {
            console.error("Backup error:", error);
            showNotification('Erro ao gerar backup.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                setIsProcessing(true);
                const content = e.target?.result as string;
                
                // 1. Parse do arquivo
                let parsed: any;
                try {
                    parsed = JSON.parse(content);
                } catch (jsonError) {
                    throw new Error("O arquivo selecionado não é um JSON válido.");
                }
                
                let dataToRestore: Record<string, any> = {};

                // 2. Detecção de Formato: V2+ (Meta + Data) ou Legado (Objeto Plano)
                if (parsed && typeof parsed === 'object' && parsed.meta && parsed.data) {
                    // Formato Novo
                    dataToRestore = parsed.data;
                } else if (parsed && typeof parsed === 'object') {
                    // Formato Legado (apenas chaves e valores)
                    dataToRestore = parsed;
                } else {
                    throw new Error("Formato de backup não reconhecido ou corrompido.");
                }

                if (Object.keys(dataToRestore).length === 0) {
                    throw new Error("O arquivo de backup está vazio.");
                }

                // Validação básica para garantir que é um backup do sistema
                const knownKeys = ['boletos_a_receber_data', 'gerenciador_cheques_data', 'theme', 'user_password', 'contas_bancarias', 'boletos_a_pagar_data'];
                const hasKnownKey = Object.keys(dataToRestore).some(k => knownKeys.some(known => k.includes(known) || k === known));

                if (!hasKnownKey) {
                    // Se não encontrar nenhuma chave conhecida, alerta o usuário mas permite continuar se ele quiser (arriscado)
                    if(!confirm("Atenção: Este arquivo não parece conter dados reconhecidos deste sistema. Deseja restaurar mesmo assim?")) {
                        setIsProcessing(false);
                        return;
                    }
                }

                // 3. Solicita senha antes de sobrescrever dados
                requestPassword(() => {
                    try {
                        // Limpa dados atuais
                        localStorage.clear();
                        
                        // Lógica de Restauração Corrigida
                        Object.entries(dataToRestore).forEach(([key, value]) => {
                            if (typeof value === 'object' && value !== null) {
                                // CRUCIAL: Se for objeto/array, converte para string JSON antes de salvar no localStorage.
                                // O localStorage só aceita strings. Se salvar objeto direto, vira "[object Object]" e quebra o app.
                                localStorage.setItem(key, JSON.stringify(value));
                            } else if (typeof value === 'string') {
                                // Se já for string, salva direto.
                                localStorage.setItem(key, value);
                            } else {
                                // Números, booleanos, etc. converte para string simples.
                                localStorage.setItem(key, String(value));
                            }
                        });
                        
                        setIsRestoreSuccessModalOpen(true);
                    } catch (restoreError) {
                        console.error("Restore execution error:", restoreError);
                        showNotification('Erro crítico durante a gravação dos dados.', 'error');
                    }
                });

            } catch (err: any) {
                console.error("Restore parsing error:", err);
                showNotification(err.message || 'Erro ao processar arquivo de backup.', 'error');
            } finally {
                if (event.target) event.target.value = '';
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full h-full overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 border-b border-border pb-4">
                {onBack && (
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors h-10 text-sm">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Voltar
                    </button>
                )}
                <h2 className="text-2xl font-bold text-text-primary">Configurações</h2>
            </div>

            {/* Main Content - Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
                
                {/* Profile Section */}
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-primary"/> Perfil
                    </h3>
                    <div className="flex items-center gap-6">
                        <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                            {profilePicture ? (
                                <img src={profilePicture} alt="Profile" className="h-24 w-24 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors" />
                            ) : (
                                <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center border-2 border-border group-hover:border-primary transition-colors">
                                    <UserIcon className="h-10 w-10 text-text-secondary" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <EditIcon className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <div>
                            <p className="font-medium text-text-primary">Foto de Perfil</p>
                            <p className="text-sm text-text-secondary mb-3">Clique na imagem para alterar</p>
                            <input type="file" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" accept="image/*" />
                        </div>
                    </div>
                </div>

                {/* Appearance Section */}
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text-primary mb-4">Aparência</h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="text-text-primary">Modo Escuro</span>
                            <button 
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-primary' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isDarkMode ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-text-secondary">Fonte do Sistema</label>
                            <div className="flex gap-2">
                                <select 
                                    value={bodyFont} 
                                    onChange={(e) => setBodyFont(e.target.value)}
                                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm"
                                >
                                    {googleFonts.map(font => <option key={font} value={font}>{font}</option>)}
                                </select>
                                <button onClick={() => { setFontTarget('all'); handleApplyFont(); }} className="px-3 py-2 bg-primary text-white rounded-full text-xs font-bold hover:bg-primary-hover transition-colors">Aplicar</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security Section */}
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                        <KeyIcon className="h-5 w-5 text-primary"/> Segurança
                    </h3>
                    <div className="space-y-3">
                        <button onClick={() => requestPassword(() => setIsChangePasswordModalOpen(true))} className="w-full text-left px-4 py-3 bg-secondary hover:bg-border rounded-xl transition-colors text-text-primary flex justify-between items-center group">
                            <span>Alterar Senha de Acesso</span>
                            <ChevronDownIcon className="h-4 w-4 -rotate-90 text-text-secondary group-hover:text-text-primary" />
                        </button>
                        <button onClick={() => setIsManageUsersModalOpen(true)} className="w-full text-left px-4 py-3 bg-secondary hover:bg-border rounded-xl transition-colors text-text-primary flex justify-between items-center group">
                            <span>Gerenciar Usuários</span>
                            <ChevronDownIcon className="h-4 w-4 -rotate-90 text-text-secondary group-hover:text-text-primary" />
                        </button>
                    </div>
                </div>

                {/* Data Management */}
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                        <DatabaseIcon className="h-5 w-5 text-primary"/> Backup e Dados
                    </h3>
                    <p className="text-sm text-text-secondary mb-4">Faça cópias de segurança ou restaure seus dados para manter seu histórico seguro.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => requestPassword(handleBackup)} disabled={isProcessing} className="flex flex-col items-center justify-center p-4 bg-secondary hover:bg-border rounded-xl transition-colors gap-2 border border-transparent hover:border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isProcessing ? <SpinnerIcon className="h-6 w-6 text-primary animate-spin" /> : <DownloadIcon className="h-6 w-6 text-primary" />}
                            <span className="text-sm font-bold text-text-primary">Fazer Backup</span>
                        </button>
                        <button onClick={() => !isProcessing && fileInputRef.current?.click()} disabled={isProcessing} className="flex flex-col items-center justify-center p-4 bg-secondary hover:bg-border rounded-xl transition-colors gap-2 relative border border-transparent hover:border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isProcessing ? <SpinnerIcon className="h-6 w-6 text-primary animate-spin" /> : <UploadIcon className="h-6 w-6 text-primary" />}
                            <span className="text-sm font-bold text-text-primary">Restaurar</span>
                            <input type="file" ref={fileInputRef} onChange={handleRestore} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" accept=".json" disabled={isProcessing} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isPasswordModalOpen && (
                <PasswordModal
                    isInitialUnlock
                    onSuccess={handleInitialUnlockSuccess}
                    onClose={() => { if(onBack) onBack(); }}
                />
            )}
            
            {isActionPasswordModalOpen && (
                <PasswordModal
                    onSuccess={handleActionPasswordSuccess}
                    onClose={() => setIsActionPasswordModalOpen(false)}
                />
            )}

            {isChangePasswordModalOpen && (
                <ChangePasswordModal onClose={() => setIsChangePasswordModalOpen(false)} />
            )}

            {isManageUsersModalOpen && (
                <ManageUsersModal onClose={() => setIsManageUsersModalOpen(false)} />
            )}

            {isRestoreSuccessModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-card rounded-2xl shadow-lg border border-border p-8 w-full max-w-sm text-center">
                        <CheckIcon className="h-12 w-12 text-success mx-auto mb-4" />
                        <h3 className="text-lg font-bold mb-2 text-text-primary">Restauração Concluída!</h3>
                        <p className="text-text-secondary mb-6">Seus dados foram restaurados com sucesso. A página será recarregada para aplicar as alterações.</p>
                        <button onClick={() => window.location.reload()} className="py-2 px-6 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">OK, Recarregar</button>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {notification && (
                <div className={`fixed bottom-8 right-8 py-3 px-6 rounded-xl shadow-lg animate-fade-in z-50 font-medium text-white ${notification.type === 'error' ? 'bg-danger' : 'bg-success'}`}>
                    {notification.message}
                </div>
            )}
        </div>
    );
};

export default ConfiguracaoSeguranca;
