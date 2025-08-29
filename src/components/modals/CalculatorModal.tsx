import React, { useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose
}) => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const clearAll = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, op: string): number => {
    switch (op) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return firstValue / secondValue;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    if (!previousValue || !operation) return;

    const inputValue = parseFloat(display);
    const newValue = calculate(previousValue, inputValue, operation);
    setDisplay(String(newValue));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };



  const buttons = [
    { label: 'C', onClick: clearAll, className: 'bg-red-500 hover:bg-red-600 text-white' },
    { label: '±', onClick: () => setDisplay(String(-parseFloat(display))), className: 'bg-gray-500 hover:bg-gray-600 text-white' },
    { label: '%', onClick: () => setDisplay(String(parseFloat(display) / 100)), className: 'bg-gray-500 hover:bg-gray-600 text-white' },
    { label: '÷', onClick: () => performOperation('÷'), className: 'bg-orange-500 hover:bg-orange-600 text-white' },
    
    { label: '7', onClick: () => inputDigit('7'), className: 'bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white' },
    { label: '8', onClick: () => inputDigit('8'), className: 'bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white' },
    { label: '9', onClick: () => inputDigit('9'), className: 'bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white' },
    { label: '×', onClick: () => performOperation('×'), className: 'bg-orange-500 hover:bg-orange-600 text-white' },
    
    { label: '4', onClick: () => inputDigit('4'), className: 'bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white' },
    { label: '5', onClick: () => inputDigit('5'), className: 'bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white' },
    { label: '6', onClick: () => inputDigit('6'), className: 'bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white' },
    { label: '-', onClick: () => performOperation('-'), className: 'bg-orange-500 hover:bg-orange-600 text-white' },
    
    { label: '1', onClick: () => inputDigit('1'), className: 'bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white' },
    { label: '2', onClick: () => inputDigit('2'), className: 'bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white' },
    { label: '3', onClick: () => inputDigit('3'), className: 'bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white' },
    { label: '+', onClick: () => performOperation('+'), className: 'bg-orange-500 hover:bg-orange-600 text-white' },
    
    { label: '0', onClick: () => inputDigit('0'), className: 'bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white col-span-2' },
    { label: '.', onClick: inputDecimal, className: 'bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white' },
    { label: '=', onClick: handleEquals, className: 'bg-orange-500 hover:bg-orange-600 text-white' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Calculator"
      size="sm"
    >
      <div className="space-y-4">
        {/* Display */}
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <div className="text-right text-2xl font-mono text-gray-800 dark:text-white">
            {display}
          </div>
          {operation && (
            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
              {previousValue} {operation}
            </div>
          )}
        </div>

        {/* Calculator Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {buttons.map((button, index) => (
            <button
              key={index}
              onClick={button.onClick}
              className={`p-4 text-lg font-medium rounded-lg transition-colors ${button.className}`}
            >
              {button.label}
            </button>
          ))}
        </div>

        {/* Close button - only show when needed */}
        <div className="pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CalculatorModal;
