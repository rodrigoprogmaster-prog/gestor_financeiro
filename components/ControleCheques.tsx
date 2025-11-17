import React from 'react';

const ControleCheques: React.FC = () => {
  const systemUrl = "https://691b0a4a1efc7a7921cdf7a8--startling-marigold-dca562.netlify.app/";

  return (
    <iframe
      src={systemUrl}
      title="Boletos a Receber"
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

export default ControleCheques;