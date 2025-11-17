import React from 'react';

const ControleBoletos: React.FC = () => {
    const systemUrl = "https://sprightly-pony-9590bc.netlify.app/";

    return (
        <iframe
            src={systemUrl}
            title="Boletos a Pagar"
            className="w-full flex-grow border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        >
            Seu navegador não suporta iframes. Por favor, acesse o sistema diretamente em{' '}
            <a href={systemUrl} target="_blank" rel="noopener noreferrer">
                {systemUrl}
            </a>
        </iframe>
    );
};

export default ControleBoletos;