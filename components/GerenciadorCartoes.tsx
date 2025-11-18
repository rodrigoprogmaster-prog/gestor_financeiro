import React, { useState } from 'react';
import CartaoMMA from './CartaoMMA';
import CartaoWorldWide from './CartaoWorldWide';
import CartaoManual from './CartaoManual';
import { CreditCardChipIcon, ArrowLeftIcon } from './icons';

type CardId = 'mma' | 'worldwide' | 'adm' | 'itau';

interface CardInfo {
    id: CardId;
    title: string;
    description: string;
    bgColor: string;
    textColor: string;
}

const cards: CardInfo[] = [
    { id: 'mma', title: 'Cartão MMA', description: 'Gerencie via upload de CSV.', bgColor: 'bg-gradient-to-br from-gray-700 to-gray-900', textColor: 'text-white' },
    { id: 'worldwide', title: 'Cartão World Wide', description: 'Gerencie via upload de CSV.', bgColor: 'bg-gradient-to-br from-blue-700 to-blue-900', textColor: 'text-white' },
    { id: 'adm', title: 'Cartão ADM', description: 'Gerencie com lançamentos manuais.', bgColor: 'bg-gradient-to-br from-green-600 to-green-800', textColor: 'text-white' },
    { id: 'itau', title: 'Cartão World Itau', description: 'Gerencie com lançamentos manuais.', bgColor: 'bg-gradient-to-br from-orange-500 to-red-600', textColor: 'text-white' },
];

const CreditCard: React.FC<{ card: CardInfo; onSelect: () => void }> = ({ card, onSelect }) => (
    <div
        onClick={onSelect}
        className={`rounded-xl shadow-lg p-6 flex flex-col justify-between cursor-pointer transform hover:scale-105 transition-transform duration-300 h-56 ${card.bgColor} ${card.textColor}`}
    >
        <div>
            <div className="flex justify-between items-start">
                <h3 className="text-2xl font-bold">{card.title}</h3>
                <CreditCardChipIcon className="h-10 w-10 text-yellow-400" />
            </div>
            <p className="opacity-80 mt-1">{card.description}</p>
        </div>
        <div>
            <p className="font-mono text-xl tracking-widest">**** **** **** 1234</p>
        </div>
    </div>
);


const GerenciadorCartoes: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const [selectedCard, setSelectedCard] = useState<CardId | null>(null);

    const handleSelectCard = (cardId: CardId) => {
        setSelectedCard(cardId);
    };

    const handleBack = () => {
        setSelectedCard(null);
    };

    const renderSelectedCard = () => {
        switch (selectedCard) {
            case 'mma':
                return <CartaoMMA onBack={handleBack} />;
            case 'worldwide':
                return <CartaoWorldWide onBack={handleBack} />;
            case 'adm':
                return <CartaoManual title="Cartão ADM" storageKey="cartao_adm_data" onBack={handleBack} />;
            case 'itau':
                return <CartaoManual title="Cartão World Itau" storageKey="cartao_world_itau_data" onBack={handleBack} />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in">
            {selectedCard === null ? (
                <>
                    <div className="flex items-center gap-4 mb-6">
                        {onBack && (
                            <button onClick={onBack} className="flex items-center gap-2 py-2 px-4 rounded-lg bg-secondary hover:bg-border font-semibold transition-colors h-10">
                                <ArrowLeftIcon className="h-5 w-5" />
                                Voltar
                            </button>
                        )}
                        <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
                            Gerenciador de Cartões de Crédito
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {cards.map(card => (
                            <CreditCard key={card.id} card={card} onSelect={() => handleSelectCard(card.id)} />
                        ))}
                    </div>
                </>
            ) : (
                renderSelectedCard()
            )}
        </div>
    );
};

export default GerenciadorCartoes;