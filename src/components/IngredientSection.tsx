import React, { useState, useEffect } from 'react';
import { Search, Plus, Package } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useModal } from '../contexts/ModalContext';
import { getIngredientsByCategory } from '../lib/supabaseQueries';
import { createImageObjectURL } from '../lib/imageUtils';
import type { Ingredient, IngredientCategory } from '../types';

interface IngredientSectionProps {
  category: IngredientCategory;
  selectedIngredients: { ingredient_id: number; quantity: string }[];
  onIngredientSelect: (ingredient: Ingredient) => void;
  onIngredientRemove: (ingredientId: number) => void;
  onQuantityChange: (ingredientId: number, quantity: string) => void;
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
  onIngredientRemove,
  onQuantityChange
}) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Get modal functions from context
  const { openAddIngredientModal } = useModal();

  const categoryInfo = getCategoryInfo(category);

  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadIngredients = async () => {
    setIsLoading(true);
    const result = await getIngredientsByCategory(category);
    if (result.success && result.data) {
      setIngredients(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadIngredients();
  }, [category]);

  // Listen for ingredient added events
  useEffect(() => {
    const handleIngredientAdded = () => {
      loadIngredients();
    };

    window.addEventListener('ingredientAdded', handleIngredientAdded);
    return () => window.removeEventListener('ingredientAdded', handleIngredientAdded);
  }, []);

  const isIngredientSelected = (ingredientId: number) => {
    return selectedIngredients.some(item => item.ingredient_id === ingredientId);
  };

  const getIngredientQuantity = (ingredientId: number) => {
    const selected = selectedIngredients.find(item => item.ingredient_id === ingredientId);
    return selected?.quantity || '';
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
          onClick={() => openAddIngredientModal(category)}
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
            onClick={() => openAddIngredientModal(category)}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Add the first ingredient
          </Button>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredIngredients.map((ingredient) => (
            <div
              key={ingredient.ingredient_id}
              className={`flex items-center justify-between p-3 bg-white rounded-lg border transition-colors ${
                isIngredientSelected(ingredient.ingredient_id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  {ingredient.image_data && ingredient.image_mime_type ? (
                    <img
                      src={createImageObjectURL(ingredient.image_data, ingredient.image_mime_type)}
                      alt={ingredient.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <Package className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{ingredient.name}</h4>
                  <p className="text-sm text-gray-500">₱{ingredient.price_per_kilo.toFixed(2)}/kg</p>
                </div>
              </div>

              {isIngredientSelected(ingredient.ingredient_id) ? (
                <div className="flex items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="250g"
                    value={getIngredientQuantity(ingredient.ingredient_id)}
                    onChange={(e) => onQuantityChange(ingredient.ingredient_id, e.target.value)}
                    className="w-20 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onIngredientRemove(ingredient.ingredient_id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onIngredientSelect(ingredient)}
                  className={categoryInfo.buttonColor}
                >
                  Add
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
