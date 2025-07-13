import React from 'react';
import { Edit, Archive, RotateCcw, Clock, Tag, Utensils } from 'lucide-react';
import { Button } from './ui/button';
import { createImageObjectURL } from '../lib/imageUtils';
import type { Meal } from '../types';

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

  const ingredientCounts = getIngredientCounts();

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
      isArchived ? 'border-gray-200 opacity-75' : 'border-gray-200'
    }`}>
      {/* Image */}
      <div className="h-48 bg-gray-100 relative overflow-hidden">
        {meal.picture_data && meal.picture_mime_type ? (
          <img
            src={createImageObjectURL(meal.picture_data, meal.picture_mime_type)}
            alt={meal.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Utensils className="w-12 h-12" />
          </div>
        )}
        
        {/* Category Badge */}
        <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(meal.category)}`}>
          {meal.category}
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
            {(meal.estimated_price || 0).toFixed(2)}
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {formatDate(meal.created_at)}
          </div>
        </div>

        {/* Dietary Tags */}
        {meal.dietary_tags && meal.dietary_tags.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center mb-1">
              <Tag className="w-3 h-3 mr-1 text-gray-400" />
              <span className="text-xs text-gray-500">Tags:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {meal.dietary_tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.tag_id}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {tag.tag_name}
                </span>
              ))}
              {meal.dietary_tags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  +{meal.dietary_tags.length - 3} more
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRestore(meal.meal_id)}
                className="flex-1 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Restore
              </Button>
            )
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onArchive(meal.meal_id)}
              className="flex-1 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
            >
              <Archive className="w-3 h-3 mr-1" />
              Archive
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
