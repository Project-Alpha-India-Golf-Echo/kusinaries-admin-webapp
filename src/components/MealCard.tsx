import { Archive, Clock, Edit, RotateCcw, Tag, Utensils } from 'lucide-react';
import React from 'react';
import type { Meal } from '../types';
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
import { Button } from './ui/button';

interface MealCardProps {
  meal: Meal;
  onEdit: (meal: Meal) => void;
  onArchive: (mealId: number) => void;
  onRestore?: (mealId: number) => void;
  isArchived?: boolean;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Best for Breakfast':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Best for Lunch':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Best for Dinner':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Best for Snacks':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  onEdit,
  onArchive,
  onRestore,
  isArchived = false
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getIngredientCounts = () => {
    if (!meal.meal_ingredients) return { go: 0, grow: 0, glow: 0 };
    
    return meal.meal_ingredients.reduce((counts, mealIngredient) => {
      // Handle both nested and flat ingredient data structures
      const ingredient = mealIngredient.ingredient || mealIngredient.ingredients;
      if (!ingredient) {
        console.warn('No ingredient data found for:', mealIngredient);
        return counts;
      }
      
      const category = ingredient.category;
      if (category === 'Go') counts.go++;
      else if (category === 'Grow') counts.grow++;
      else if (category === 'Glow') counts.glow++;
      return counts;
    }, { go: 0, grow: 0, glow: 0 });
  };

  const calculateEstimatedPrice = () => {
    let total = 0;
    
    // Calculate ingredient costs using the same logic as CreateEditMealModal
    if (meal.meal_ingredients) {
      meal.meal_ingredients.forEach(mealIngredient => {
        const ingredient = mealIngredient.ingredient || mealIngredient.ingredients;
        if (!ingredient) return;

        const quantityStr = mealIngredient.quantity.toLowerCase().trim();
        let quantityInKg = 0;

        if (quantityStr.includes('kg')) {
          quantityInKg = parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0;
        } else if (quantityStr.includes('g')) {
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) / 1000;
        } else if (quantityStr.includes('cup')) {
          // Rough estimate: 1 cup ≈ 240g for most ingredients
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.24;
        } else if (quantityStr.includes('piece')) {
          // Rough estimate: 1 piece ≈ 100g
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.1;
        } else if (quantityStr.includes('tbsp') || quantityStr.includes('tablespoon')) {
          // 1 tablespoon ≈ 15g
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.015;
        } else if (quantityStr.includes('tsp') || quantityStr.includes('teaspoon')) {
          // 1 teaspoon ≈ 5g
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.005;
        } else {
          // If no unit specified, assume grams
          const numValue = parseFloat(quantityStr.replace(/[^0-9.]/g, ''));
          if (!isNaN(numValue)) {
            quantityInKg = numValue / 1000;
          }
        }

        total += quantityInKg * ingredient.price_per_kilo;
      });
    }

    // Calculate condiment costs using the same logic as CreateEditMealModal
    const condimentsArr = (meal as any).meal_condiments || meal.meal_condiments;
    if (condimentsArr) {
      const convertCondimentQuantity = (raw: string, baseUnit: string): number => {
        const q = raw.toLowerCase().trim();
        const value = parseFloat(q.replace(/[^0-9.]/g, '')) || 0;
        if (value === 0) return 0;
        const has = (u: string) => q.includes(u);
        // Volume conversions
        if (baseUnit === 'ml') {
          if (has('ml')) return value;
          if (has('tbsp')) return value * 15; // 1 tbsp = 15 ml
          if (has('tsp')) return value * 5;  // 1 tsp = 5 ml
          return 0;
        }
        if (baseUnit === 'g') {
          if (has('g')) return value;
          if (has('tbsp')) return value * 15; // assume 1 tbsp ~15g (rough)
          if (has('tsp')) return value * 5;  // assume 1 tsp ~5g
          return 0;
        }
        if (baseUnit === 'tbsp') {
          if (has('tbsp')) return value;
          if (has('tsp')) return value / 3; // 1 tbsp = 3 tsp
          if (has('ml')) return value / 15; // inverse of 15ml per tbsp
          return 0;
        }
        if (baseUnit === 'tsp') {
          if (has('tsp')) return value;
          if (has('tbsp')) return value * 3;
          if (has('ml')) return value / 5; // 5ml per tsp
          return 0;
        }
        // piece & bottle removed from allowed units
        return 0;
      };

      condimentsArr.forEach((mc: any) => {
        if (!mc.quantity || !mc.quantity.trim()) return;
        const condiment = mc.condiment || mc.condiments;
        if (!condiment) return;
        const converted = convertCondimentQuantity(mc.quantity, condiment.unit_type);
        total += converted * condiment.price_per_unit;
      });
    }
    
    return total;
  };

  const ingredientCounts = getIngredientCounts();
  const estimatedPrice = meal.estimated_price || calculateEstimatedPrice();

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
      isArchived ? 'border-gray-200 opacity-75' : 'border-gray-200'
    }`}>
      {/* Image */}
      <div className="h-48 bg-gray-100 relative overflow-hidden">
        {(meal as any).signed_image_url || meal.image_url ? (
          <img
            src={(meal as any).signed_image_url || meal.image_url}
            alt={meal.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Utensils className="w-12 h-12" />
          </div>
        )}
        
        {/* Category Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1 max-w-[calc(100%-6rem)]">
          {Array.isArray(meal.category) ? (
            meal.category.map((cat, index) => (
              <div key={index} className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(cat)}`}>
                {cat}
              </div>
            ))
          ) : (
            <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(meal.category)}`}>
              {meal.category}
            </div>
          )}
        </div>

        {isArchived && (
          <div className="absolute top-3 right-3 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium border border-red-200">
            Archived
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
          {meal.name}
        </h3>

        {/* Pinggang Pinoy Summary */}
        <div className="flex items-center space-x-4 mb-3 text-sm">
          <div className="flex items-center text-yellow-600">
            <div className="w-3 h-3 bg-yellow-400 rounded-full mr-1"></div>
            Go: {ingredientCounts.go}
          </div>
          <div className="flex items-center text-red-600">
            <div className="w-3 h-3 bg-red-400 rounded-full mr-1"></div>
            Grow: {ingredientCounts.grow}
          </div>
          <div className="flex items-center text-green-600">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-1"></div>
            Glow: {ingredientCounts.glow}
          </div>
        </div>

        {/* Price and Date */}
        <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="text-lg font-medium mr-1">₱</span>
            {estimatedPrice.toFixed(2)}
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {formatDate(meal.created_at)}
          </div>
        </div>

        {/* Dietary Tags */}
        {((meal as any).meal_dietary_tags || meal.dietary_tags) && ((meal as any).meal_dietary_tags || meal.dietary_tags).length > 0 && (
          <div className="mb-3">
            <div className="flex items-center mb-1">
              <Tag className="w-3 h-3 mr-1 text-gray-400" />
              <span className="text-xs text-gray-500">Tags:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {((meal as any).meal_dietary_tags || meal.dietary_tags).slice(0, 3).map((tagData: any, index: number) => {
                // Possible shapes:
                // 1. Direct tag object { tag_id, tag_name }
                // 2. meal_dietary_tags row { meal_id, tag_id, ... , dietary_tag: { tag_id, tag_name } }
                // 3. Legacy shape { dietary_tags: { tag_id, tag_name } }
                const direct = tagData.tag_id && tagData.tag_name ? tagData : null;
                const nested1 = (tagData as any).dietary_tag; // new alias
                const nested2 = (tagData as any).dietary_tags; // legacy alias
                const tagObj = direct || nested1 || nested2 || tagData;
                const tagId = tagObj.tag_id || tagObj.id || index;
                const tagName = tagObj.tag_name || tagObj.name || 'Unknown';
                return (
                  <span key={tagId} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {tagName}
                  </span>
                );
              })}
              {((meal as any).meal_dietary_tags || meal.dietary_tags).length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  +{((meal as any).meal_dietary_tags || meal.dietary_tags).length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Recipe Preview */}
        {meal.recipe && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {meal.recipe}
          </p>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(meal)}
            className="flex-1 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          
          {isArchived ? (
            onRestore && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Restore
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restore Meal</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to restore "{meal.name}"? The meal will be moved back to the active meals section.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onRestore(meal.meal_id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Restore Meal
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                >
                  <Archive className="w-3 h-3 mr-1" />
                  Archive
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive Meal</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to archive "{meal.name}"? The meal will be moved to the archived section and can be restored later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onArchive(meal.meal_id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Archive Meal
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
};
