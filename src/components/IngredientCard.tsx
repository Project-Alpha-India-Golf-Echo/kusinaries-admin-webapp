import React from 'react';
import { Edit, Package, Archive, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import type { Ingredient } from '../types';

interface IngredientCardProps {
  ingredient: Ingredient;
  onEdit?: (ingredient: Ingredient) => void;
  onArchive?: (ingredientId: number) => void;
  onRestore?: (ingredientId: number) => void;
  isArchived?: boolean;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Go':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Grow':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Glow':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const IngredientCard: React.FC<IngredientCardProps> = ({
  ingredient,
  onEdit,
  onArchive,
  onRestore,
  isArchived = false
}) => {
  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 hover:border-gray-300 ${
      isArchived ? 'border-gray-200 opacity-75' : 'border-gray-200'
    }`}>
      {/* Image */}
      <div className="h-32 bg-gray-100 relative overflow-hidden rounded-t-xl">
        {ingredient.image_url ? (
          <img
            src={ingredient.image_url}
            alt={ingredient.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Package className="w-8 h-8" />
          </div>
        )}
        
        {/* Category Badge */}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(ingredient.category)}`}>
          {ingredient.category}
        </div>

        {isArchived && (
          <div className="absolute top-2 right-2 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium border border-red-200">
            Archived
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
            {ingredient.name}
          </h3>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="font-medium text-green-600">
              ₱{ingredient.price_per_kilo.toFixed(2)}/kg
            </span>
          </div>
        </div>

        {/* Description based on category */}
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          {ingredient.category === 'Go' && 'Energy-giving foods rich in carbohydrates'}
          {ingredient.category === 'Grow' && 'Body-building foods rich in proteins'}
          {ingredient.category === 'Glow' && 'Body-regulating foods rich in vitamins & minerals'}
        </p>

        {/* Actions */}
        <div className="flex space-x-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(ingredient)}
              className="flex-1 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
          
          {isArchived ? (
            onRestore && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Restore
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restore Ingredient</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to restore "{ingredient.name}"? The ingredient will be moved back to the active ingredients section.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onRestore(ingredient.ingredient_id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Restore Ingredient
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          ) : (
            onArchive && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Archive className="w-3 h-3 mr-1" />
                    Archive
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive Ingredient</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to archive "{ingredient.name}"? The ingredient will be moved to the archived section and can be restored later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onArchive(ingredient.ingredient_id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Archive Ingredient
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          )}
        </div>
      </div>
    </div>
  );
};
