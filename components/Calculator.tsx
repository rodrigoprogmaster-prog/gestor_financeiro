
import React, { useState } from 'react';
import { XIcon } from './icons';

interface CalculatorProps {
  initialValue?: number;
  onResult: (result: number) => void;
  onClose: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ initialValue = 0, onResult, onClose }) => {
  const [display, setDisplay] = useState(String(initialValue));
  const [expression, setExpression] = useState('');
  const [resetDisplay, setResetDisplay] = useState(true);

  const handleNumber = (num: string) => {
    if (resetDisplay) {
      setDisplay(num);
      setResetDisplay(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleOperator = (op: string) => {
    setExpression(display + ' ' + op + ' ');
    setResetDisplay(true);
  };

  const handleEqual = () => {
    try {
      const fullExpr = expression + display;
      // Sanitize input to only allow numbers and operators
      if (!/^[\d\.\+\-\*\/ ]+$/.test(fullExpr)) {
          return;
      }
      // eslint-disable-next-line no-eval
      const result = eval(fullExpr); 
      setDisplay(String(result));
      setExpression('');
      setResetDisplay(true);
    } catch (e) {
      setDisplay('Erro');
      setResetDisplay(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    setResetDisplay(true);
  };

  const handleConfirm = () => {
    // If there is a pending calculation (user pressed confirm without pressing =), calculate it first
    let result = parseFloat(display);
    if(expression && !resetDisplay) {
         try {
            const fullExpr = expression + display;
             if (/^[\d\.\+\-\*\/ ]+$/.test(fullExpr)) {
                 // eslint-disable-next-line no-eval
                 result = eval(fullExpr);
             }
         } catch (e) {
             // ignore error, take current display
         }
    }
    
    onResult(isNaN(result) ? 0 : result);
    onClose();
  };

  return (
    <div className="absolute z-50 mt-1 bg-card rounded-2xl shadow-xl border border-border p-4 w-64 animate-fade-in right-0">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-text-secondary truncate h-4">{expression}</span>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><XIcon className="h-4 w-4" /></button>
      </div>
      <div className="bg-background border border-border rounded-xl p-2 mb-3 text-right">
        <span className="text-2xl font-bold text-text-primary block truncate">{display}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <button onClick={handleClear} className="col-span-3 p-2 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 transition-colors">C</button>
        <button onClick={() => handleOperator('/')} className="p-2 bg-secondary text-primary rounded-lg font-bold hover:bg-primary/10 transition-colors">÷</button>
        
        <button onClick={() => handleNumber('7')} className="p-2 bg-white border border-border text-text-primary rounded-lg font-bold hover:bg-secondary transition-colors">7</button>
        <button onClick={() => handleNumber('8')} className="p-2 bg-white border border-border text-text-primary rounded-lg font-bold hover:bg-secondary transition-colors">8</button>
        <button onClick={() => handleNumber('9')} className="p-2 bg-white border border-border text-text-primary rounded-lg font-bold hover:bg-secondary transition-colors">9</button>
        <button onClick={() => handleOperator('*')} className="p-2 bg-secondary text-primary rounded-lg font-bold hover:bg-primary/10 transition-colors">×</button>
        
        <button onClick={() => handleNumber('4')} className="p-2 bg-white border border-border text-text-primary rounded-lg font-bold hover:bg-secondary transition-colors">4</button>
        <button onClick={() => handleNumber('5')} className="p-2 bg-white border border-border text-text-primary rounded-lg font-bold hover:bg-secondary transition-colors">5</button>
        <button onClick={() => handleNumber('6')} className="p-2 bg-white border border-border text-text-primary rounded-lg font-bold hover:bg-secondary transition-colors">6</button>
        <button onClick={() => handleOperator('-')} className="p-2 bg-secondary text-primary rounded-lg font-bold hover:bg-primary/10 transition-colors">-</button>
        
        <button onClick={() => handleNumber('1')} className="p-2 bg-white border border-border text-text-primary rounded-lg font-bold hover:bg-secondary transition-colors">1</button>
        <button onClick={() => handleNumber('2')} className="p-2 bg-white border border-border text-text-primary rounded-lg font-bold hover:bg-secondary transition-colors">2</button>
        <button onClick={() => handleNumber('3')} className="p-2 bg-white border border-border text-text-primary rounded-lg font-bold hover:bg-secondary transition-colors">3</button>
        <button onClick={() => handleOperator('+')} className="p-2 bg-secondary text-primary rounded-lg font-bold hover:bg-primary/10 transition-colors">+</button>
        
        <button onClick={() => handleNumber('0')} className="col-span-2 p-2 bg-white border border-border text-text-primary rounded-lg font-bold hover:bg-secondary transition-colors">0</button>
        <button onClick={() => handleNumber('.')} className="p-2 bg-white border border-border text-text-primary rounded-lg font-bold hover:bg-secondary transition-colors">.</button>
        <button onClick={handleEqual} className="p-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors">=</button>
      </div>
      <button onClick={handleConfirm} className="w-full mt-3 p-2 bg-success text-white rounded-xl font-bold hover:bg-success/90 transition-colors shadow-sm">
        Confirmar
      </button>
    </div>
  );
};

export default Calculator;
