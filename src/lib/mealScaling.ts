import type { Meal, MealCondiment, MealIngredient } from '../types';
import { scaleQuantityString } from './quantity';
import { aggregateFamilyFactor, type FamilyMembers } from './servingScale';

export interface ScaledMealItem {
  id: number;
  name: string;
  quantity: string; // scaled, formatted
}

export interface ScaledMeal {
  meal_id: number;
  name: string;
  factor: number;
  ingredients: ScaledMealItem[];
  condiments: ScaledMealItem[];
}

export function scaleMeal(meal: Meal, factor: number): ScaledMeal {
  const ingredients = (meal.meal_ingredients || []).map((mi: MealIngredient) => {
    const ingredient = mi.ingredient || (mi as any).ingredients;
    const name = ingredient?.name || `Ingredient #${mi.ingredient_id}`;
    return {
      id: mi.ingredient_id,
      name,
      quantity: scaleQuantityString(mi.quantity, factor)
    };
  });
  const condiments = (meal.meal_condiments || []).map((mc: MealCondiment) => {
    const condiment = mc.condiment;
    const name = condiment?.name || `Condiment #${mc.condiment_id}`;
    return {
      id: mc.condiment_id,
      name,
      quantity: scaleQuantityString(mc.quantity, factor)
    };
  });
  return { meal_id: meal.meal_id, name: meal.name, factor, ingredients, condiments };
}

export function scaleMealForFamily(meal: Meal, members: FamilyMembers): ScaledMeal {
  const factor = aggregateFamilyFactor(members);
  return scaleMeal(meal, factor);
}
