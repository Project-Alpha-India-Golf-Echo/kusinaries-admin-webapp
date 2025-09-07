import { Check, Package, Plus, Search, X as XIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useModal } from '../contexts/ModalContext';
import { getIngredientsByCategory, getIngredientsByCategoryForAdmin } from '../lib/supabaseQueries';
import type { Ingredient, IngredientCategory } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { QuantitySelector, validateQuantity } from './ui/quantity-selector';

interface IngredientSectionProps {
  category: IngredientCategory;
  selectedIngredients: { ingredient_id: number; quantity: string }[];
  onIngredientSelect: (ingredient: Ingredient) => void;
  onQuantityChange: (ingredientId: number, quantity: string) => void;
  userRole?: string; // Add userRole prop to filter out cook-created ingredients for admin users
}

const getCategoryInfo = (category: IngredientCategory) => {
  switch (category) {
    case 'Go':
      return {
        title: 'Go Foods (Energy)',
        description: 'Carbohydrates that provide energy',
        color: 'yellow',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
      };
    case 'Grow':
      return {
        title: 'Grow Foods (Build)',
        description: 'Proteins for muscle and tissue building',
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        buttonColor: 'bg-red-600 hover:bg-red-700'
      };
    case 'Glow':
      return {
        title: 'Glow Foods (Protect)',
        description: 'Vitamins and minerals for immunity',
        color: 'green',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        buttonColor: 'bg-green-600 hover:bg-green-700'
      };
  }
};

export const IngredientSection: React.FC<IngredientSectionProps> = ({
  category,
  selectedIngredients,
  onIngredientSelect,
  onQuantityChange,
  userRole
}) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [glowTab, setGlowTab] = useState<'Vegetables' | 'Fruits'>('Vegetables');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  // Track ingredients currently being added (pending confirmation) with local quantity drafts
  const [pendingAdds, setPendingAdds] = useState<Record<number, string>>({});

  // Get modal functions from context
  const { openCreateIngredientModal } = useModal();

  const categoryInfo = getCategoryInfo(category);

  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadIngredients = async () => {
    setIsLoading(true);
    // Use admin-filtered function for admin users to exclude cook-created ingredients
    const ingredientsFunction = userRole === 'admin' ? getIngredientsByCategoryForAdmin : getIngredientsByCategory;
    const result = await ingredientsFunction(category, category === 'Glow' ? glowTab : undefined);
    if (result.success && result.data) {
      setIngredients(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadIngredients();
  }, [category, glowTab, userRole]); // Re-load when userRole changes

  // Listen for ingredient added events
  useEffect(() => {
    const refresh = () => loadIngredients();
    window.addEventListener('ingredientAdded', refresh);
    window.addEventListener('ingredientSaved', refresh);
    return () => {
      window.removeEventListener('ingredientAdded', refresh);
      window.removeEventListener('ingredientSaved', refresh);
    };
  }, []);

  const isIngredientSelected = (ingredientId: number) => {
    return selectedIngredients.some(item => item.ingredient_id === ingredientId);
  };

  const getIngredientQuantity = (ingredientId: number) => {
    const selected = selectedIngredients.find(item => item.ingredient_id === ingredientId);
    return selected?.quantity || '';
  };

  const startPendingAdd = (ingredientId: number) => {
    setPendingAdds(prev => ({ ...prev, [ingredientId]: '' }));
  };

  const cancelPendingAdd = (ingredientId: number) => {
    setPendingAdds(prev => {
      const clone = { ...prev };
      delete clone[ingredientId];
      return clone;
    });
  };

  const updatePendingQuantity = (ingredientId: number, quantity: string) => {
    setPendingAdds(prev => ({ ...prev, [ingredientId]: quantity }));
  };

  const confirmAdd = (ingredient: Ingredient) => {
    const draft = pendingAdds[ingredient.ingredient_id];
    if (!draft || !validateQuantity(draft.trim())) return;
    if (!isIngredientSelected(ingredient.ingredient_id)) {
      onIngredientSelect(ingredient);
    }
    onQuantityChange(ingredient.ingredient_id, draft.trim());
    cancelPendingAdd(ingredient.ingredient_id);
  };

  return (
    <div className={`border rounded-xl ${categoryInfo.borderColor} ${categoryInfo.bgColor} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-lg font-semibold ${categoryInfo.textColor}`}>
            {categoryInfo.title}
          </h3>
          <p className="text-sm text-gray-600">{categoryInfo.description}</p>
        </div>
        <Button
          type="button"
          onClick={() => openCreateIngredientModal(category)}
          className={`${categoryInfo.buttonColor} text-white`}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add New
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={`Search ${category} ingredients...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {category === 'Glow' && (
          <div className="mt-3 flex gap-2">
            {(['Vegetables', 'Fruits'] as const).map(tab => (
              <Button
                key={tab}
                type="button"
                size="sm"
                variant={glowTab === tab ? 'default' : 'outline'}
                onClick={() => setGlowTab(tab)}
              >
                {tab}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Package className="w-6 h-6 mr-2 animate-pulse" />
          Loading ingredients...
        </div>
      ) : filteredIngredients.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No ingredients found matching your search.' : 'No ingredients available.'}
          <br />
          <Button
            type="button"
            onClick={() => openCreateIngredientModal(category)}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Add the first ingredient
          </Button>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredIngredients.map((ingredient) => {
            const selected = selectedIngredients.find(si => si.ingredient_id === ingredient.ingredient_id);
            const hasQuantity = selected && selected.quantity.trim();
            const pending = pendingAdds[ingredient.ingredient_id] !== undefined && !hasQuantity;
            const pendingQty = pendingAdds[ingredient.ingredient_id] || '';
            return (
              <div
                key={ingredient.ingredient_id}
                className={`relative flex flex-col p-4 bg-white rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                  pending ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg' : 
                  isIngredientSelected(ingredient.ingredient_id) ? (hasQuantity ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm' : 'border-amber-300 bg-amber-50') : 
                  'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {/* Top section: Image and Info */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-inner flex-shrink-0">
                    {(ingredient as any).signed_image_url || ingredient.image_url ? (
                      <img
                        src={(ingredient as any).signed_image_url || ingredient.image_url}
                        alt={ingredient.name}
                        className="w-10 h-10 object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 mb-0.5" title={ingredient.name}>{ingredient.name}</h4>
                    <p className="text-xs text-gray-600 font-medium">₱{ingredient.price_per_kilo.toFixed(2)}/kg</p>
                  </div>
                </div>

                {/* Status messages */}
                {pending && (
                  <p className="text-xs text-amber-700 mb-3 font-medium animate-pulse">Enter quantity & confirm</p>
                )}
                {selected && hasQuantity && (
                  <p className="text-[11px] text-blue-700 mb-3 font-medium">✓ Added: {selected.quantity}</p>
                )}

                {/* Bottom section: Actions */}
                {/* Bottom section: Actions */}
                {pending ? (
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <QuantitySelector
                        value={pendingQty}
                        onChange={(value) => updatePendingQuantity(ingredient.ingredient_id, value)}
                        className="w-full"
                      />
                      {!validateQuantity(pendingQty.trim()) && pendingQty.trim() && (
                        <div className="absolute -bottom-5 left-0 text-[10px] text-red-500 whitespace-nowrap">Invalid format</div>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => confirmAdd(ingredient)}
                      disabled={!pendingQty.trim() || !validateQuantity(pendingQty.trim())}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => cancelPendingAdd(ingredient.ingredient_id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 shadow-sm"
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ) : selected ? (
                  <div className="flex items-center space-x-3">
                    <QuantitySelector
                      value={getIngredientQuantity(ingredient.ingredient_id)}
                      onChange={(value) => onQuantityChange(ingredient.ingredient_id, value)}
                      className="flex-1"
                    />
                    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-full bg-blue-600 text-white font-bold uppercase tracking-wide shadow-sm whitespace-nowrap">
                      <Check className="w-3 h-3" />
                      Added
                    </span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => startPendingAdd(ingredient.ingredient_id)}
                    className={`${categoryInfo.buttonColor} text-white shadow-sm hover:shadow-md transition-shadow px-4 py-2 w-full`}
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
