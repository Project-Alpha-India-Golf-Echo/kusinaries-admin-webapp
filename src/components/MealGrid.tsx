import React from 'react';
import { MealCard } from './MealCard';
import { MealCardList } from './MealCardList';
import type { ViewMode } from './ViewModeSelector';
import type { Meal } from '../types';

interface MealGridProps {
  meals: Meal[];
  viewMode: ViewMode;
  onEdit: (meal: Meal) => void;
  onArchive: (mealId: number) => void;
  onRestore?: (mealId: number) => void;
  onDuplicate?: (meal: Meal) => void;
  isArchived?: boolean;
}

export const MealGrid: React.FC<MealGridProps> = ({
  meals,
  viewMode,
  onEdit,
  onArchive,
  onRestore,
  onDuplicate,
  isArchived = false
}) => {
  const getGridClasses = () => {
    switch (viewMode) {
      case 'list':
        return 'space-y-3';
      case 'compact':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';
      case 'medium':
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
      case 'grid':
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
    }
  };

  const getCardSize = () => {
    switch (viewMode) {
      case 'compact':
        return 'compact';
      case 'medium':
        return 'medium';
      default:
        return 'default';
    }
  };

  if (viewMode === 'list') {
    return (
      <div className={getGridClasses()}>
        {meals.map((meal: Meal) => (
          <MealCardList
            key={meal.meal_id}
            meal={meal}
            onEdit={onEdit}
            onArchive={onArchive}
            onRestore={onRestore}
            onDuplicate={onDuplicate}
            isArchived={isArchived}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={getGridClasses()}>
      {meals.map((meal: Meal) => (
        <MealCard
          key={meal.meal_id}
          meal={meal}
          onEdit={onEdit}
          onArchive={onArchive}
          onRestore={onRestore}
          onDuplicate={onDuplicate}
          isArchived={isArchived}
          size={getCardSize()}
        />
      ))}
    </div>
  );
};