import React from 'react';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

export interface QuantityUnit {
  value: string;
  label: string;
  category: 'weight' | 'volume' | 'count' | 'spoon';
}

export const QUANTITY_UNITS: QuantityUnit[] = [
  // Weight units (most common)
  { value: 'g', label: 'grams (g)', category: 'weight' },
  { value: 'kg', label: 'kilograms (kg)', category: 'weight' },
  
  // Volume units
  { value: 'cup', label: 'cup', category: 'volume' },
  { value: 'cups', label: 'cups', category: 'volume' },
  
  // Count units
  { value: 'piece', label: 'piece', category: 'count' },
  { value: 'pieces', label: 'pieces', category: 'count' },
  
  // Spoon units
  { value: 'tsp', label: 'teaspoon (tsp)', category: 'spoon' },
  { value: 'tbsp', label: 'tablespoon (tbsp)', category: 'spoon' }
];

interface QuantitySelectorProps {
  value: string; // Combined value like "250g" or "1 cup"
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  onChange,
  className = "",
  disabled = false
}) => {
  // Parse the current value to extract number and unit
  const parseQuantity = (quantityString: string) => {
    if (!quantityString.trim()) return { amount: '', unit: '' };
    
    const match = quantityString.trim().match(/^(\d*\.?\d+)\s*(.*)$/);
    if (match) {
      return { amount: match[1], unit: match[2].trim() || 'g' };
    }
    return { amount: '', unit: 'g' };
  };

  const { amount, unit } = parseQuantity(value);

  const handleAmountChange = (newAmount: string) => {
    // Only allow numbers and decimal points
    if (newAmount === '' || /^\d*\.?\d*$/.test(newAmount)) {
      const newValue = newAmount && unit ? `${newAmount}${unit}` : newAmount;
      onChange(newValue);
    }
  };

  const handleUnitChange = (newUnit: string) => {
    const newValue = amount ? `${amount}${newUnit}` : '';
    onChange(newValue);
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      <Input
        type="text"
        value={amount}
        onChange={(e) => handleAmountChange(e.target.value)}
        placeholder="0"
        className="flex-1 min-w-0 text-sm"
        disabled={disabled}
      />
      <Select
        value={unit || 'g'}
        onValueChange={handleUnitChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-20 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <div className="text-xs font-medium text-gray-500 px-2 py-1">Weight</div>
          {QUANTITY_UNITS.filter(u => u.category === 'weight').map(unitOption => (
            <SelectItem key={unitOption.value} value={unitOption.value}>
              {unitOption.value}
            </SelectItem>
          ))}
          <div className="text-xs font-medium text-gray-500 px-2 py-1 border-t mt-1">Volume</div>
          {QUANTITY_UNITS.filter(u => u.category === 'volume').map(unitOption => (
            <SelectItem key={unitOption.value} value={unitOption.value}>
              {unitOption.value}
            </SelectItem>
          ))}
          <div className="text-xs font-medium text-gray-500 px-2 py-1 border-t mt-1">Count</div>
          {QUANTITY_UNITS.filter(u => u.category === 'count').map(unitOption => (
            <SelectItem key={unitOption.value} value={unitOption.value}>
              {unitOption.value}
            </SelectItem>
          ))}
          <div className="text-xs font-medium text-gray-500 px-2 py-1 border-t mt-1">Spoons</div>
          {QUANTITY_UNITS.filter(u => u.category === 'spoon').map(unitOption => (
            <SelectItem key={unitOption.value} value={unitOption.value}>
              {unitOption.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Utility function to validate quantity format
export const validateQuantity = (quantity: string): boolean => {
  if (!quantity.trim()) return false;
  
  const parsed = quantity.trim().match(/^(\d*\.?\d+)\s*(.*)$/);
  if (!parsed) return false;
  
  const [, amount, unit] = parsed;
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount <= 0) return false;
  
  const validUnits = QUANTITY_UNITS.map(u => u.value);
  return validUnits.includes(unit.trim()) || unit.trim() === '';
};

// Utility function to convert quantities to a standard unit for calculations (grams)
export const convertToGrams = (quantity: string): number => {
  const parsed = quantity.trim().match(/^(\d*\.?\d+)\s*(.*)$/);
  if (!parsed) return 0;
  
  const [, amount, unit] = parsed;
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) return 0;
  
  const conversionRates: Record<string, number> = {
    'g': 1,
    'kg': 1000,
    'cup': 240, // Standard US cup in grams
    'cups': 240,
    'piece': 100, // Rough estimate for average piece
    'pieces': 100,
    'tsp': 5, // Teaspoon in grams
    'tbsp': 15 // Tablespoon in grams
  };
  
  return numAmount * (conversionRates[unit.trim()] || 1);
};
