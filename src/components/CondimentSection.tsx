import { Check, Package, Plus, Search, Trash2, X as XIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useModal } from '../contexts/ModalContext';
import { getAllCondiments, getAllCondimentsForAdmin } from '../lib/supabaseQueries';
import type { Condiment } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface CondimentSectionProps {
  selectedCondiments: { condiment_id: number; quantity: string }[];
  onCondimentSelect: (condiment: Condiment) => void;
  onQuantityChange: (condimentId: number, quantity: string) => void;
  onCondimentRemove: (condimentId: number) => void;
  userRole?: string; // Add userRole prop to filter out cook-created condiments for admin users
}

export const CondimentSection: React.FC<CondimentSectionProps> = ({
  selectedCondiments,
  onCondimentSelect,
  onQuantityChange,
  onCondimentRemove,
  userRole
}) => {
  const [condiments, setCondiments] = useState<Condiment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  // Track condiments currently being added (pending confirmation) with local quantity drafts
  const [pendingAdds, setPendingAdds] = useState<Record<number, string>>({});

  const { openCreateCondimentModal } = useModal();

  const filteredCondiments = condiments.filter(condiment =>
    !condiment.is_archived && condiment.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadCondiments = async () => {
    setIsLoading(true);
    // Use admin-filtered function for admin users to exclude cook-created condiments
    const condimentsFunction = userRole === 'admin' ? getAllCondimentsForAdmin : getAllCondiments;
    const result = await condimentsFunction();
    if (result.success && result.data) {
      setCondiments(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCondiments();
  }, [userRole]); // Re-load when userRole changes

  // Listen for condiment added events
  useEffect(() => {
    const refresh = () => {
      loadCondiments();
      // Clear search term when condiments are updated to avoid confusion
      setSearchTerm('');
    };
    window.addEventListener('condimentAdded', refresh);
    window.addEventListener('condimentSaved', refresh);
    return () => {
      window.removeEventListener('condimentAdded', refresh);
      window.removeEventListener('condimentSaved', refresh);
    };
  }, []);

  const isCondimentSelected = (condimentId: number) => {
    return selectedCondiments.some(item => item.condiment_id === condimentId);
  };

  const getCondimentQuantity = (condimentId: number) => {
    const selected = selectedCondiments.find(item => item.condiment_id === condimentId);
    return selected?.quantity || '';
  };

  const startPendingAdd = (condimentId: number) => {
    setPendingAdds(prev => ({ ...prev, [condimentId]: '' }));
  };

  const cancelPendingAdd = (condimentId: number) => {
    setPendingAdds(prev => {
      const clone = { ...prev };
      delete clone[condimentId];
      return clone;
    });
  };

  const updatePendingQuantity = (condimentId: number, quantity: string) => {
    setPendingAdds(prev => ({ ...prev, [condimentId]: quantity }));
  };

  const confirmAdd = (condiment: Condiment) => {
    const draft = pendingAdds[condiment.condiment_id];
    if (!draft || !validateCondimentQuantity(draft.trim())) return;
    if (!isCondimentSelected(condiment.condiment_id)) {
      onCondimentSelect(condiment);
    }
    onQuantityChange(condiment.condiment_id, draft.trim());
    cancelPendingAdd(condiment.condiment_id);
  };

  // Custom validation for condiment quantities based on unit type
  const validateCondimentQuantity = (quantity: string): boolean => {
    if (!quantity.trim()) return false;
    
    // Parse quantity and unit
    const match = quantity.trim().match(/^(\d*\.?\d+)\s*(.*)$/);
    if (!match) return false;
    
    const [, amount] = match;
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) return false;
    
    // Basic validation - if we have a valid number, we're good
    return true;
  };

  const CondimentQuantitySelector: React.FC<{
    value: string;
    onChange: (value: string) => void;
    unitType: string;
    className?: string;
    disabled?: boolean;
  }> = ({ value, onChange, unitType, className = "", disabled = false }) => {
    const parseQuantity = (quantityString: string) => {
      if (!quantityString.trim()) return { amt: '', unit: unitType };
      const match = quantityString.trim().match(/^(\d*\.?\d+)\s*(.*)$/);
      if (match) {
        return { amt: match[1], unit: (match[2].trim() || unitType) };
      }
      return { amt: '', unit: unitType };
    };
    const initial = parseQuantity(value);
    const [localAmount, setLocalAmount] = React.useState(initial.amt);
    const [localUnit, setLocalUnit] = React.useState(initial.unit);

    // Sync when external value changes (e.g., programmatic updates)
    React.useEffect(() => {
      const parsed = parseQuantity(value);
      setLocalAmount(parsed.amt);
      setLocalUnit(parsed.unit);
    }, [value]);

    const commit = (amt = localAmount, unit = localUnit) => {
      if (!amt) {
        onChange('');
      } else {
        onChange(`${amt} ${unit}`.trim());
      }
    };

    const handleAmountChange = (newAmount: string) => {
      if (newAmount === '' || /^\d*\.?\d*$/.test(newAmount)) {
        setLocalAmount(newAmount);
      }
    };
    const handleAmountBlur = () => commit();

    const handleUnitChange = (newUnit: string) => {
      setLocalUnit(newUnit);
      commit(localAmount, newUnit);
    };

    // Get appropriate units for this condiment type
    // Provide a universal list of accepted precise units regardless of base pricing unit.
    const getUnitsForType = (_type: string) => {
      return [
        { value: 'ml', label: 'ml' },
        { value: 'g', label: 'g' },
        { value: 'tbsp', label: 'tbsp' },
        { value: 'tsp', label: 'tsp' }
      ];
    };

    const availableUnits = getUnitsForType(unitType);

    return (
      <div className={`flex gap-1 ${className}`}>
        <Input
          type="text"
          value={localAmount}
          onChange={(e) => handleAmountChange(e.target.value)}
          onBlur={handleAmountBlur}
          placeholder="0"
          className="flex-1 min-w-0 text-sm"
          disabled={disabled}
        />
        <Select
          value={localUnit || unitType}
          onValueChange={handleUnitChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableUnits.map(unitOption => (
              <SelectItem key={unitOption.value} value={unitOption.value}>
                {unitOption.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <div className="border rounded-xl border-purple-200 bg-purple-50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-purple-800">
            Condiments (Optional)
          </h3>
          <p className="text-sm text-gray-600">Seasonings and sauces to enhance flavor</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openCreateCondimentModal}
          className="gap-2 text-purple-700 border-purple-300 hover:bg-purple-100 hover:border-purple-400"
        >
          <Plus className="w-4 h-4" />
          Add New Condiment
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search condiments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Package className="w-6 h-6 mr-2 animate-pulse" />
          Loading condiments...
        </div>
      ) : filteredCondiments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No condiments found matching your search.' : 'No condiments available.'}
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredCondiments.map((condiment) => {
            const selected = selectedCondiments.find(si => si.condiment_id === condiment.condiment_id);
            const hasQuantity = selected && selected.quantity.trim();
            const pending = pendingAdds[condiment.condiment_id] !== undefined && !hasQuantity;
            const pendingQty = pendingAdds[condiment.condiment_id] || '';
            
            return (
              <div
                key={condiment.condiment_id}
                className={`relative flex flex-col p-4 bg-white rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                  pending ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg' : 
                  isCondimentSelected(condiment.condiment_id) ? (hasQuantity ? 'border-purple-400 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-sm' : 'border-amber-300 bg-amber-50') : 
                  'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {/* Top section: Image and Info */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-inner flex-shrink-0">
                    {(condiment as any).signed_image_url || condiment.image_url ? (
                      <img
                        src={(condiment as any).signed_image_url || condiment.image_url}
                        alt={condiment.name}
                        className="w-10 h-10 object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 mb-0.5" title={condiment.name}>{condiment.name}</h4>
                    <p className="text-xs text-gray-600 font-medium">₱{condiment.price_per_unit.toFixed(2)}/{condiment.unit_type}</p>
                  </div>
                </div>

                {/* Status messages */}
                {pending && (
                  <p className="text-xs text-amber-700 mb-3 font-medium animate-pulse">Enter quantity & confirm</p>
                )}
                {selected && hasQuantity && (
                  <p className="text-[11px] text-purple-700 mb-3 font-medium">✓ Added: {selected.quantity}</p>
                )}

                {/* Bottom section: Actions */}
                {pending ? (
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <CondimentQuantitySelector
                        value={pendingQty}
                        onChange={(value) => updatePendingQuantity(condiment.condiment_id, value)}
                        unitType={condiment.unit_type}
                        className="w-full"
                      />
                      {!validateCondimentQuantity(pendingQty.trim()) && pendingQty.trim() && (
                        <div className="absolute -bottom-5 left-0 text-[10px] text-red-500 whitespace-nowrap">Invalid format</div>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => confirmAdd(condiment)}
                      disabled={!pendingQty.trim() || !validateCondimentQuantity(pendingQty.trim())}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => cancelPendingAdd(condiment.condiment_id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 shadow-sm"
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ) : selected ? (
                  <div className="flex items-center space-x-2">
                    <CondimentQuantitySelector
                      value={getCondimentQuantity(condiment.condiment_id)}
                      onChange={(value) => onQuantityChange(condiment.condiment_id, value)}
                      unitType={condiment.unit_type}
                      className="flex-1"
                    />
                    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-full bg-purple-600 text-white font-bold uppercase tracking-wide shadow-sm whitespace-nowrap">
                      <Check className="w-3 h-3" />
                      Added
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onCondimentRemove(condiment.condiment_id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 shadow-sm"
                      title="Remove condiment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => startPendingAdd(condiment.condiment_id)}
                    className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm hover:shadow-md transition-shadow px-4 py-2 w-full"
                  >
                    Add
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
