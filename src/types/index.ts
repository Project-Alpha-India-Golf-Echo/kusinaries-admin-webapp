export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  phone?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  app_metadata?: {
    role?: string;
    [key: string]: any;
  };
}

// Meal Curation System Types
export type MealCategory = 'Best for Breakfast' | 'Best for Lunch' | 'Best for Dinner' | 'Best for Snacks';
export type IngredientCategory = 'Go' | 'Grow' | 'Glow';

export interface Ingredient {
  ingredient_id: number;
  name: string;
  category: IngredientCategory;
  image_url?: string; // URL to image in Supabase storage
  price_per_kilo: number;
  is_disabled: boolean;
  created_at: string;
}

export interface DietaryTag {
  tag_id: number;
  tag_name: string;
}

export interface MealIngredient {
  meal_ingredient_id: number;
  meal_id: number;
  ingredient_id: number;
  quantity: string;
  ingredient?: Ingredient; // Populated when joining tables
  ingredients?: Ingredient; // Alternative field name from Supabase queries
}

export interface Meal {
  meal_id: number;
  name: string;
  category: MealCategory;
  recipe?: string;
  image_url?: string; // URL to image in Supabase storage
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
  meal_ingredients?: MealIngredient[];
  dietary_tags?: DietaryTag[];
  estimated_price?: number; // Calculated field
}

export interface CreateMealData {
  name: string;
  category: MealCategory;
  recipe?: string;
  image_url?: string; // URL to image in Supabase storage
  ingredients: {
    ingredient_id: number;
    quantity: string;
  }[];
  dietary_tag_ids: number[];
}

export interface MealFilters {
  category?: MealCategory;
  dietary_tags?: number[];
  search?: string;
  sort_by?: 'name' | 'created_at' | 'estimated_price';
  sort_order?: 'asc' | 'desc';
}

// Audit Trail Types
export type AuditAction = 'created' | 'updated' | 'archived' | 'restored';
export type EntityType = 'meal' | 'ingredient';

export interface ActivityLog {
  log_id: number;
  entity_type: EntityType;
  entity_id: number;
  entity_name: string;
  action: AuditAction;
  changed_by: string;
  changed_at: string;
  changes?: Record<string, any>;
  notes?: string;
}
