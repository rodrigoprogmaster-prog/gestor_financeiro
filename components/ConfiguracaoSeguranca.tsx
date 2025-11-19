import React, { useState, useEffect, useRef } from 'react';
import PasswordModal from './PasswordModal';
import { UserIcon, KeyIcon, ArrowLeftIcon, EditIcon, CheckIcon } from './icons';

// Modal for managing users (placeholder)
const ManageUsersModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-card rounded-lg shadow-lg border border-border p-8 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-text-primary">Gerenciar Usuários</h3>
            <p className="text-text-secondary mb-6">Esta funcionalidade está em desenvolvimento e estará disponível em breve.</p>
            <div className="flex justify-end">
                <button onClick={onClose} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Fechar</button>
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
            <div className="bg-card rounded-lg shadow-lg border border-border p-8 w-full max-w-md">
                <h3 className="text-xl font-bold mb-6 text-text-primary">Alterar Senha de Acesso</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="password" placeholder="Senha Atual" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full bg-white border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" autoFocus />
                    <input type="password" placeholder="Nova Senha" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full bg-white border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input type="password" placeholder="Confirmar Nova Senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-white border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                    
                    {error && <p className="text-danger text-sm">{error}</p>}
                    {success && <p className="text-success text-sm">{success}</p>}

                    <div className="pt-4 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">Cancelar</button>
                        <button type="submit" className="py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Salvar Nova Senha</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const googleFonts = ['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro', 'Poppins', 'Merriweather', 'Playfair Display', 'Inter', 'Nunito', 'Raleway'];

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
    const [previewText, setPreviewText] = useState('A rápida raposa marrom salta sobre o cão preguiçoso. 1234567890');
    const [loadedFonts, setLoadedFonts] = useState<string[]>(['Roboto', 'Inter']);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
        showNotification('Fonte aplicada com sucesso!');
    };
    
    const handleBackup = () => {
        const backupData: { [key: string]: any } = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                try { backupData[key] = JSON.parse(localStorage.getItem(key)!); } 
                catch (e) { backupData[key] = localStorage.getItem(key); }
            }
        }
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup_financeiro_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        showNotification('Backup criado com sucesso!');
    };

    const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backupData = JSON.parse(e.target?.result as string);
                requestPassword(() => {
                    localStorage.clear();
                    Object.keys(backupData).forEach(key => localStorage.setItem(key, typeof backupData[key] === 'object' ? JSON.stringify(backupData[key]) : backupData[key]));
                    setIsRestoreSuccessModalOpen(true);
                });
            } catch (error) { 
                showNotification('Erro ao ler o arquivo de backup.', 'error'); 
            }
        };
        reader.readAsText(file);
    };

    const handleRestoreSuccess = () => {
        setIsRestoreSuccessModalOpen(false);
        window.location.href = window.location.protocol + '//' + window.location.host + window.location.pathname;
    };
    
    if (!isUnlocked) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 w-full">
                {isPasswordModalOpen && <PasswordModal onSuccess={handleInitialUnlockSuccess} onClose={() => { /* No close on initial unlock */ }} isInitialUnlock />}
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
                {onBack && (
                    <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Voltar
                    </button>
                )}
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary font-heading">Configuração e Segurança</h2>
            </div>
            <div className="space-y-8">
                
                 <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text-primary mb-4 font-heading flex items-center gap-3">
                        <UserIcon className="h-6 w-6 text-primary" />
                        Perfil de Usuário
                    </h3>
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            {profilePicture ? (
                                <img src={profilePicture} alt="Foto de Perfil" className="h-24 w-24 rounded-full object-cover border-2 border-primary" />
                            ) : (
                                <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center border-2 border-border">
                                    <UserIcon className="h-12 w-12 text-text-secondary" />
                                </div>
                            )}
                            <button
                                onClick={() => photoInputRef.current?.click()}
                                className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full hover:bg-primary-hover transition-colors shadow-sm"
                                aria-label="Alterar foto"
                            >
                                <EditIcon className="h-4 w-4" />
                            </button>
                            <input
                                type="file"
                                ref={photoInputRef}
                                onChange={handlePhotoChange}
                                className="hidden"
                                accept="image/png, image/jpeg"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-4">
                                <span className="font-semibold text-text-primary">Nome de Usuário:</span>
                                <span className="text-text-secondary">Rodrigo Moraes</span>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text-primary mb-4 font-heading flex items-center gap-3">
                        <KeyIcon className="h-6 w-6 text-primary" />
                        Segurança e Acesso
                    </h3>
                    <div className="space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
                        <button onClick={() => setIsChangePasswordModalOpen(true)} className="w-full md:w-auto py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">
                            Alterar Senha de Acesso
                        </button>
                        <button onClick={() => setIsManageUsersModalOpen(true)} className="w-full md:w-auto py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors">
                            Gerenciar Usuários
                        </button>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text-primary mb-4 font-heading">Aparência</h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between"><span className="font-semibold text-text-primary">Tema Escuro</span><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={isDarkMode} onChange={() => setIsDarkMode(!isDarkMode)} className="sr-only peer" /><div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div></label></div>
                        <div>
                           <label className="block text-sm font-medium text-text-secondary mb-2">Alterar Fontes</label>
                           <div className="space-y-4">
                               <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                   <select value={currentFont} onChange={(e) => { const f = e.target.value; fontTarget === 'all' ? setBodyFont(f) : setHeadingFont(f); }} className="sm:col-span-1 bg-white border border-border rounded-lg px-3 py-2 text-text-primary h-10"><option key="Inter" value="Inter">Padrão (Inter)</option>{googleFonts.filter(f => f !== 'Inter').map(f => (<option key={f} value={f}>{f}</option>))}</select>
                                   <select value={fontTarget} onChange={(e) => setFontTarget(e.target.value as any)} className="sm:col-span-1 bg-white border border-border rounded-lg px-3 py-2 text-text-primary h-10"><option value="all">Todo o Sistema</option><option value="headings">Apenas Cabeçalhos</option></select>
                                   <button onClick={() => requestPassword(handleApplyFont)} className="sm:col-span-1 py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold h-10">Aplicar</button>
                               </div>
                               <div><textarea value={previewText} onChange={(e) => setPreviewText(e.target.value)} style={{ fontFamily: `'${currentFont}', sans-serif` }} className="w-full h-24 p-4 bg-white border border-border rounded-lg text-text-primary text-lg" placeholder="Digite para pré-visualizar..."/></div>
                           </div>
                        </div>
                    </div>
                </div>
                <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text-primary mb-4 font-heading">Gerenciamento de Dados</h3>

                     <div className="mb-6 p-4 bg-blue-50 text-blue-800 border border-blue-100 rounded-lg">
                        <p className="text-sm">
                            <strong>Salvamento Automático:</strong> Todas as suas informações são salvas automaticamente no seu navegador.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={handleBackup} className="py-3 px-4 rounded-lg bg-secondary hover:bg-border font-semibold border border-border transition-colors">Backup Geral</button>
                                <button onClick={() => fileInputRef.current?.click()} className="py-3 px-4 rounded-lg bg-secondary hover:bg-border font-semibold border border-border transition-colors">Restaurar Backup</button>
                            </div>
                            <p className="text-xs text-text-secondary mt-2">
                                <strong>Backup:</strong> Salva um arquivo com TODOS os dados do sistema. Guarde em local seguro.
                            </p>
                             <p className="text-xs text-text-secondary mt-1">
                                <strong>Restaurar:</strong> Carrega todos os dados de um arquivo de backup. A sessão atual será perdida.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleRestore} className="hidden" accept=".json" />
            
            {isActionPasswordModalOpen && <PasswordModal onSuccess={handleActionPasswordSuccess} onClose={() => setIsActionPasswordModalOpen(false)}/>}

            {isChangePasswordModalOpen && <ChangePasswordModal onClose={() => setIsChangePasswordModalOpen(false)} />}
            {isManageUsersModalOpen && <ManageUsersModal onClose={() => setIsManageUsersModalOpen(false)} />}
            
            {isRestoreSuccessModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-card rounded-lg shadow-lg border border-border p-8 w-full max-w-sm text-center">
                        <div className="mb-4 flex justify-center">
                            <div className="bg-success/20 p-4 rounded-full">
                                <CheckIcon className="h-12 w-12 text-success" />
                            </div>
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-text-primary">BACKUP EFETUADO COM SUCESSO</h3>
                        <p className="text-text-secondary mb-6">Os dados foram restaurados. O sistema será reiniciado para aplicar as alterações.</p>
                        <div className="flex justify-center">
                            <button onClick={handleRestoreSuccess} className="w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">OK</button>
                        </div>
                    </div>
                </div>
            )}

            {notification && (
                <div className={`fixed bottom-8 right-8 text-white py-3 px-6 rounded-lg shadow-lg animate-fade-in z-50 ${notification.type === 'success' ? 'bg-success' : 'bg-danger'}`}>
                    {notification.message}
                </div>
            )}
        </div>
    );
};

export default ConfiguracaoSeguranca;