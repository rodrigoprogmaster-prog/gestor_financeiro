import React, { useState, useEffect } from 'react';

const Clock: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <>
            <p className="font-sans text-lg font-semibold text-text-primary">
                {currentTime.toLocaleTimeString('pt-BR')}
            </p>
            <p className="text-xs text-text-secondary">
                {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
        </>
    );
};

export default Clock;