import { Calendar, Clock, DollarSign, Tag } from 'lucide-react';
import React from 'react';
import type { Meal } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface MealCardListProps {
  meal: Meal;
  onEdit: (meal: Meal) => void;
  onArchive: (mealId: number) => void;
  onRestore?: (mealId: number) => void;
  onDuplicate?: (meal: Meal) => void;
  isArchived?: boolean;
}

export const MealCardList: React.FC<MealCardListProps> = ({
  meal,
  onEdit,
  onArchive,
  onRestore,
  onDuplicate,
  isArchived = false
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = () => {
    if (!meal.isbycook) return null;
    
    if (meal.forreview) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Review</Badge>;
    }
    
    if (meal.is_approved) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
    }
    
    if (meal.rejected) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
    }
    
    return null;
  };

  const getCategoryDisplay = () => {
    if (Array.isArray(meal.category)) {
      return meal.category.join(', ');
    }
    return meal.category || 'No category';
  };

  const getDietaryTags = () => {
    const tags = (meal as any).meal_dietary_tags || meal.dietary_tags || [];
    return tags.map((tagData: any) => {
      if (typeof tagData === 'object' && tagData !== null) {
        if (tagData.dietary_tags && tagData.dietary_tags.name) {
          return tagData.dietary_tags.name;
        }
        if (tagData.name) {
          return tagData.name;
        }
      }
      return null;
    }).filter(Boolean);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 p-4">
      <div className="flex items-start space-x-4">
        {/* Image */}
        <div className="flex-shrink-0">
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
            {((meal as any).signed_image_url || meal.image_url) ? (
              <img
                src={(meal as any).signed_image_url || meal.image_url}
                alt={meal.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <span className="text-2xl">🍽️</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {meal.name}
                </h3>
                {getStatusBadge()}
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                <div className="flex items-center space-x-1">
                  <Tag className="w-4 h-4" />
                  <span>{getCategoryDisplay()}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(meal.created_at)}</span>
                </div>
                
                {meal.estimated_price && (
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-4 h-4" />
                    <span>₱{meal.estimated_price.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Recipe Preview */}
              {meal.recipe && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {meal.recipe}
                </p>
              )}

              {/* Dietary Tags */}
              {getDietaryTags().length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {getDietaryTags().slice(0, 3).map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {getDietaryTags().length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{getDietaryTags().length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Ingredients Count */}
              {meal.meal_ingredients && (
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{meal.meal_ingredients.length} ingredients</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 ml-4">
              <Button
                size="sm"
                onClick={() => onEdit(meal)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {meal.rejected ? 'Resubmit' : 'Edit'}
              </Button>
              
              {!isArchived && onDuplicate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDuplicate(meal)}
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  Duplicate
                </Button>
              )}
              
              {isArchived ? (
                onRestore && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRestore(meal.meal_id)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    Restore
                  </Button>
                )
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onArchive(meal.meal_id)}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Archive
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};