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
  role?: UserRole;
    [key: string]: any;
  };
}

export type UserRole = 'admin' | 'user' | 'family_head' | 'cook';

// Meal Curation System Types
export type MealCategory = 'Best for Breakfast' | 'Best for Lunch' | 'Best for Dinner' | 'Best for Snacks';
export type IngredientCategory = 'Go' | 'Grow' | 'Glow';
export type IngredientUnitType = 'kg' | 'g';

export interface Ingredient {
  ingredient_id: number;
  name: string;
  category: IngredientCategory;
  image_url?: string; // storage object path or legacy URL
  signed_image_url?: string; // transient signed URL for rendering
  price_per_unit: number; // price per unit (either per kilo or per gram)
  unit_type: IngredientUnitType; // 'kg' or 'g'
  price_per_kilo: number; // calculated field for backward compatibility
  package_price?: number; // total price of the package (optional stored)
  package_quantity?: number; // quantity basis for per-unit (optional stored)
  is_disabled: boolean;
  created_at: string;
  glow_subcategory?: 'Vegetables' | 'Fruits' | null; // Only for category 'Glow'
  isbycook?: boolean; // true if created by cook
  profile_id?: string; // uuid of cook's profile
}

export interface DietaryTag {
  tag_id: number;
  tag_name: string;
  is_disabled?: boolean;
}

// Allowed precise condiment units (removed sachet, bottle, piece for consistency)
export type CondimentUnitType = 'ml' | 'g' | 'tbsp' | 'tsp';

export interface Condiment {
  condiment_id: number;
  name: string;
  price_per_unit: number;
  unit_type: CondimentUnitType;
  package_price?: number; // total price used to derive per-unit (optional stored)
  package_quantity?: number; // quantity basis for per-unit
  image_url?: string;
  signed_image_url?: string; // transient signed URL for rendering
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  isbycook?: boolean; // true if created by cook
  profile_id?: string; // uuid of cook's profile
}

export interface MealCondiment {
  meal_condiment_id: number;
  meal_id: number;
  condiment_id: number;
  quantity: string;
  condiment?: Condiment; // Populated when joining tables
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
  category: MealCategory[]; // Changed to array to support multiple categories
  recipe?: string;
  image_url?: string; // storage object path or legacy URL
  signed_image_url?: string; // transient signed URL for rendering
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
  meal_ingredients?: MealIngredient[];
  meal_condiments?: MealCondiment[];
  dietary_tags?: DietaryTag[];
  estimated_price?: number; // Calculated field
  ai_generated?: boolean; // Marks AI-seeded meals for safe cleanup
  ai_batch_id?: string | null; // UUID grouping for batch operations
  isbycook?: boolean; // true if created by cook
  profile_id?: string; // uuid of cook's profile
  forreview?: boolean; // true when meal is submitted for admin review
  rejected?: boolean; // true when meal has been rejected by admin
  rejection_reason?: string; // reason provided when meal is rejected
  is_approved?: boolean; // true when meal has been approved by admin
  profiles?: {
    email: string;
    full_name?: string;
  }; // Cook profile information when joined
}

export interface CreateMealData {
  name: string;
  category: MealCategory[]; // Changed to array to support multiple categories
  recipe?: string;
  image_url?: string; // storage object path
  ingredients: {
    ingredient_id: number;
    quantity: string;
  }[];
  condiments?: {
    condiment_id: number;
    quantity: string;
  }[];
  dietary_tag_ids: number[];
  ai_generated?: boolean; // optional when creating via script
  ai_batch_id?: string; // optional batch grouping
  isbycook?: boolean;
  profile_id?: string;
}

export interface MealFilters {
  category?: MealCategory; // Keep as single category for filtering simplicity
  dietary_tags?: number[];
  search?: string;
  sort_by?: 'name' | 'created_at' | 'estimated_price';
  sort_order?: 'asc' | 'desc';
  status?: 'all' | 'pending' | 'approved' | 'rejected';
}

// Audit Trail Types
export type AuditAction = 'created' | 'updated' | 'archived' | 'restored' | 'approved' | 'rejected' | 'reopened';
export type EntityType = 'meal' | 'ingredient' | 'cook';

export interface ActivityLog {
  log_id: number;
  entity_type: EntityType;
  entity_id: number | string; // allow string for cook UUIDs
  entity_name: string;
  action: AuditAction;
  changed_by: string;
  changed_at: string;
  changes?: Record<string, any>;
  notes?: string;
}

// ================================
// Cook Verification (Grants) Types
// ================================
// NOTE: Schema assumptions (adjust to actual DB schema):
// Table name: cooks
// Columns: id (uuid), user_id (uuid, FK to auth.users / profiles), full_name (text), bio (text),
//   specialty (text), years_experience (int), avatar_url (text), government_id_url (text),
//   certificates (json[] or text[]), location (text), created_at (timestamptz), updated_at (timestamptz),
//   for_review (boolean), is_verified (boolean), verified_at (timestamptz), rejection_reason (text)
// If your actual columns differ, update the Cook interface & related queries accordingly.
export interface Cook {
  id: string;
  profile_id: string;
  username?: string;
  home_address?: string;
  contact_number?: string;
  gender?: string;
  cook_type?: string; // e.g., home_cook, professional, etc.
  learn_to_cook?: string[] | null;
  learn_to_cook_other?: string | null;
  wears_ppe?: boolean | null;
  not_wearing_ppe_reason?: string | null;
  available_days?: string[] | null;
  available_times?: string[] | null;
  experience?: any; // jsonb structure (array/object)
  certificate_image_url?: string | null;
  kitchen_image_url?: string | null;
  is_verified: boolean;
  is_rejected?: boolean | null;
  for_review?: boolean | null;
  created_at?: string;
  updated_at?: string;
}
