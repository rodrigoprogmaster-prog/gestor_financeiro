import React, { useState } from 'react';

interface PasswordModalProps {
    onSuccess: () => void;
    onClose: () => void;
    isInitialUnlock?: boolean;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ onSuccess, onClose, isInitialUnlock = false }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const savedPassword = localStorage.getItem('user_password') || '140552';
        
        if (password === savedPassword) {
            onSuccess();
        } else {
            setError('Senha incorreta.');
            setPassword('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-card rounded-2xl shadow-xl p-8 w-full max-w-sm">
                <h3 className="text-lg font-bold mb-4 text-text-primary font-heading">
                    {isInitialUnlock ? 'Acesso Restrito' : 'Confirmação de Segurança'}
                </h3>
                <p className="text-text-secondary mb-6">
                    {isInitialUnlock ? 'Para acessar esta área, por favor, insira a senha de administrador.' : 'Para continuar com esta ação, por favor, insira a senha novamente.'}
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="password-modal" className="sr-only">Senha</label>
                        <input
                            id="password-modal"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full bg-background border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary ${error ? 'border-danger animate-shake' : 'border-border'}`}
                            placeholder="Senha"
                            autoFocus
                        />
                        {error && <p className="text-danger text-xs mt-1">{error}</p>}
                    </div>
                    <div className="flex justify-end gap-4">
                        {!isInitialUnlock && (
                            <button type="button" onClick={onClose} className="py-2 px-4 rounded-full bg-secondary hover:bg-border font-semibold transition-colors">
                                Cancelar
                            </button>
                        )}
                        <button type="submit" className="py-2 px-4 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PasswordModal;