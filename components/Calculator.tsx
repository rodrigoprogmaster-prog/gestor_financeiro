
import React, { useState, useEffect } from 'react';
import { XIcon, ChevronLeftIcon, CalculatorIcon } from './icons';

interface CalculatorProps {
  initialValue?: number;
  onResult: (result: number) => void;
  onClose: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ initialValue = 0, onResult, onClose }) => {
  const [display, setDisplay] = useState(String(initialValue));
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(true);

  // Helper to format display (limit decimal places if necessary)
  const formatDisplay = (val: string) => {
      if (val.length > 12) return val.substring(0, 12);
      return val;
  };

  // Format for visual output (replace dot with comma)
  const formatVisual = (val: string) => {
      return val.replace('.', ',');
  };

  const handleNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(formatDisplay(display === '0' && num !== '.' ? num : display + num));
    }
  };

  const calculate = (a: number, b: number, op: string) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleOperator = (op: string) => {
    const currentValue = parseFloat(display);

    if (operator && !waitingForNewValue && prevValue !== null) {
      const result = calculate(prevValue, currentValue, operator);
      setDisplay(String(result));
      setPrevValue(result);
    } else {
      setPrevValue(currentValue);
    }

    setOperator(op);
    setWaitingForNewValue(true);
  };

  const handleEqual = () => {
    if (!operator || prevValue === null) return;

    const currentValue = parseFloat(display);
    const result = calculate(prevValue, currentValue, operator);
    
    setDisplay(String(result));
    setPrevValue(null);
    setOperator(null);
    setWaitingForNewValue(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForNewValue(false);
  };

  const handleBackspace = () => {
    if (waitingForNewValue) return;
    if (display.length === 1) {
        setDisplay('0');
    } else {
        setDisplay(display.slice(0, -1));
    }
  };

  const handleConfirm = () => {
    // If there's a pending operation, finish it first
    let finalResult = parseFloat(display);
    if (operator && prevValue !== null && !waitingForNewValue) {
        finalResult = calculate(prevValue, finalResult, operator);
    }
    onResult(isNaN(finalResult) ? 0 : finalResult);
    onClose();
  };

  // Map operator symbols for display
  const getOperatorSymbol = (op: string | null) => {
      switch(op) {
          case '/': return '÷';
          case '*': return '×';
          default: return op;
      }
  };

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
        onClick={onClose}
    >
        <div 
            className="bg-card w-80 rounded-3xl shadow-2xl border border-border p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-4 pl-1">
                <div className="flex items-center gap-2 text-primary">
                    <CalculatorIcon className="h-5 w-5" />
                    <h3 className="font-bold text-lg text-text-primary">Calculadora</h3>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-1.5 rounded-full hover:bg-secondary text-text-secondary hover:text-text-primary transition-colors"
                >
                    <XIcon className="h-5 w-5" />
                </button>
            </div>

            {/* Display Screen */}
            <div className="bg-background border border-border rounded-2xl p-4 mb-5 text-right shadow-inner">
                <span className="block text-xs text-text-secondary h-4 font-mono mb-1 truncate">
                    {prevValue !== null ? `${formatVisual(String(prevValue))} ${getOperatorSymbol(operator) || ''}` : ''}
                </span>
                <span className="block text-3xl font-bold text-text-primary truncate font-mono tracking-tight">
                    {formatVisual(display)}
                </span>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-3 mb-5">
                <button onClick={handleClear} className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-100 transition-colors text-sm shadow-sm">C</button>
                <button onClick={handleBackspace} className="p-3 bg-secondary text-text-primary border border-border rounded-xl font-bold hover:bg-border transition-colors flex items-center justify-center shadow-sm"><ChevronLeftIcon className="h-5 w-5" /></button>
                <button onClick={() => handleOperator('/')} className="p-3 bg-secondary text-primary border border-border rounded-xl font-bold hover:bg-primary/10 transition-colors text-lg shadow-sm">÷</button>
                <button onClick={() => handleOperator('*')} className="p-3 bg-secondary text-primary border border-border rounded-xl font-bold hover:bg-primary/10 transition-colors text-lg shadow-sm">×</button>
                
                <button onClick={() => handleNumber('7')} className="p-3 bg-white border border-border text-text-primary rounded-xl font-bold hover:bg-secondary transition-colors shadow-sm text-lg">7</button>
                <button onClick={() => handleNumber('8')} className="p-3 bg-white border border-border text-text-primary rounded-xl font-bold hover:bg-secondary transition-colors shadow-sm text-lg">8</button>
                <button onClick={() => handleNumber('9')} className="p-3 bg-white border border-border text-text-primary rounded-xl font-bold hover:bg-secondary transition-colors shadow-sm text-lg">9</button>
                <button onClick={() => handleOperator('-')} className="p-3 bg-secondary text-primary border border-border rounded-xl font-bold hover:bg-primary/10 transition-colors text-lg shadow-sm">-</button>
                
                <button onClick={() => handleNumber('4')} className="p-3 bg-white border border-border text-text-primary rounded-xl font-bold hover:bg-secondary transition-colors shadow-sm text-lg">4</button>
                <button onClick={() => handleNumber('5')} className="p-3 bg-white border border-border text-text-primary rounded-xl font-bold hover:bg-secondary transition-colors shadow-sm text-lg">5</button>
                <button onClick={() => handleNumber('6')} className="p-3 bg-white border border-border text-text-primary rounded-xl font-bold hover:bg-secondary transition-colors shadow-sm text-lg">6</button>
                <button onClick={() => handleOperator('+')} className="p-3 bg-secondary text-primary border border-border rounded-xl font-bold hover:bg-primary/10 transition-colors text-lg shadow-sm">+</button>
                
                <button onClick={() => handleNumber('1')} className="p-3 bg-white border border-border text-text-primary rounded-xl font-bold hover:bg-secondary transition-colors shadow-sm text-lg">1</button>
                <button onClick={() => handleNumber('2')} className="p-3 bg-white border border-border text-text-primary rounded-xl font-bold hover:bg-secondary transition-colors shadow-sm text-lg">2</button>
                <button onClick={() => handleNumber('3')} className="p-3 bg-white border border-border text-text-primary rounded-xl font-bold hover:bg-secondary transition-colors shadow-sm text-lg">3</button>
                <button onClick={handleEqual} className="row-span-2 p-3 bg-primary text-white border border-primary rounded-xl font-bold hover:bg-primary-hover transition-colors text-xl shadow-md flex items-center justify-center">=</button>
                
                <button onClick={() => handleNumber('0')} className="col-span-2 p-3 bg-white border border-border text-text-primary rounded-xl font-bold hover:bg-secondary transition-colors shadow-sm text-lg">0</button>
                <button onClick={() => handleNumber('.')} className="p-3 bg-white border border-border text-text-primary rounded-xl font-bold hover:bg-secondary transition-colors shadow-sm text-lg">,</button>
            </div>

            <button 
                onClick={handleConfirm} 
                className="w-full py-3 bg-success text-white rounded-xl font-bold hover:bg-success/90 transition-colors shadow-lg shadow-success/20 text-sm uppercase tracking-wide"
            >
                Confirmar Valor
            </button>
        </div>
    </div>
  );
};

export default Calculator;
