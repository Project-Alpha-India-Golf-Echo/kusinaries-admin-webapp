import {supabase} from './supabase';
import type { User } from '../types';

// Check if current user is admin
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return false;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }

    return profile?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Get current user's role
export const getCurrentUserRole = async (): Promise<string | null> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return profile?.role || 'user';
  } catch (error) {
    console.error('Error in getCurrentUserRole:', error);
    return null;
  }
};

// Create a new user account
export const createUserAccount = async (
  email: string, 
  password: string, 
  fullName: string, 
  role: 'admin' | 'user' = 'user'
): Promise<{ success: boolean; error?: string; user?: any }> => {
  try {
    // Check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Only admins can create user accounts' };
    }

    // Store current session to restore later
    const { data: currentSession } = await supabase.auth.getSession();
    
    // Create user using regular signup (this will work with anon key)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'User creation failed - no user returned' };
    }

    // Wait a moment for the profile to be created by the trigger
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update the user's role in the profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', data.user.id);

    if (updateError) {
      console.error('Error updating user role:', updateError);
      // Don't return error here, user was created successfully
    }

    // Sign out the newly created user to avoid session conflicts
    if (data.session) {
      await supabase.auth.signOut();
    }

    // Restore the original admin session
    if (currentSession.session) {
      await supabase.auth.setSession(currentSession.session);
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Error in createUserAccount:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export const fetchUsersFromProfiles = async (): Promise<User[]> => {
  try {
    // First check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    console.log('Current user:', user.email);
    console.log('User metadata:', user.app_metadata);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error details:', error);
      throw error;
    }

    console.log('Fetched profiles:', data);

    // Transform profiles data to User type
    return data.map((profile: any) => ({
      id: profile.id,
      email: profile.email || '',
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      last_sign_in_at: profile.last_sign_in_at,
      user_metadata: {
        full_name: profile.full_name,
        avatar_url: profile.avatar_url
      },
      app_metadata: {
        role: profile.role
      }
    }));
  } catch (error) {
    console.error('Error fetching users from profiles:', error);
    throw error;
  }
};

// Update user profile information
export const updateUserProfile = async (updates: {
  fullName?: string;
  email?: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Update user metadata (full name)
    if (updates.fullName !== undefined) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name: updates.fullName }
      });
      
      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        return { success: false, error: metadataError.message };
      }

      // Also update the full_name in the profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: updates.fullName })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile full_name:', profileError);
        return { success: false, error: profileError.message };
      }
    }

    // Update email if provided
    if (updates.email !== undefined && updates.email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: updates.email
      });
      
      if (emailError) {
        console.error('Error updating email:', emailError);
        return { success: false, error: emailError.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: 'Failed to update profile' };
  }
};

// Change user password
export const changeUserPassword = async (
  currentPassword: string, 
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // First verify the current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (verifyError) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: 'Failed to change password' };
  }
};

// Update user role (admin only)
export const updateUserRole = async (
  userId: string,
  newRole: 'admin' | 'user'
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Only admins can update user roles' };
    }

    // Update the user's role in the profiles table
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    return { success: false, error: 'Failed to update user role' };
  }
};

// ============================================
// MEAL CURATION SYSTEM QUERIES
// ============================================

import type { 
  Meal, 
  CreateMealData, 
  Ingredient, 
  DietaryTag, 
  IngredientCategory 
} from '../types';

// ===== INGREDIENT QUERIES =====

// Get all ingredients (only active/non-archived by default)
export const getAllIngredients = async (): Promise<{ success: boolean; data?: Ingredient[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('is_disabled', false)
      .order('name');

    if (error) {
      console.error('Error fetching ingredients:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getAllIngredients:', error);
    return { success: false, error: 'Failed to fetch ingredients' };
  }
};

// Get ingredients by category (only active/non-archived by default)
export const getIngredientsByCategory = async (category: IngredientCategory): Promise<{ success: boolean; data?: Ingredient[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('category', category)
      .eq('is_disabled', false)
      .order('name');

    if (error) {
      console.error('Error fetching ingredients by category:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getIngredientsByCategory:', error);
    return { success: false, error: 'Failed to fetch ingredients by category' };
  }
};

// Create a new ingredient
export const createIngredient = async (ingredientData: {
  name: string;
  category: IngredientCategory;
  image_url?: string;
  price_per_kilo: number;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .insert([
        {
          name: ingredientData.name,
          category: ingredientData.category,
          image_url: ingredientData.image_url,
          price_per_kilo: ingredientData.price_per_kilo,
          created_at: new Date().toISOString()
        }
      ])
      .select('ingredient_id, name')
      .single();

    if (error) {
      console.error('Error creating ingredient:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'ingredient',
        data.ingredient_id,
        data.name,
        'created',
        { category: ingredientData.category, price_per_kilo: ingredientData.price_per_kilo }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in createIngredient:', error);
    return { success: false, error: 'Failed to create ingredient' };
  }
};

// Update an existing ingredient
export const updateIngredient = async (id: number, ingredientData: {
  name?: string;
  category?: IngredientCategory;
  image_url?: string;
  price_per_kilo?: number;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .update(ingredientData)
      .eq('ingredient_id', id)
      .select('ingredient_id, name')
      .single();

    if (error) {
      console.error('Error updating ingredient:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'ingredient',
        data.ingredient_id,
        data.name,
        'updated',
        ingredientData
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateIngredient:', error);
    return { success: false, error: 'Failed to update ingredient' };
  }
};

// Archive an ingredient (soft delete)
export const archiveIngredient = async (id: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .update({ is_disabled: true })
      .eq('ingredient_id', id)
      .select('ingredient_id, name')
      .single();

    if (error) {
      console.error('Error archiving ingredient:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'ingredient',
        data.ingredient_id,
        data.name,
        'archived'
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in archiveIngredient:', error);
    return { success: false, error: 'Failed to archive ingredient' };
  }
};

// Restore an archived ingredient
export const restoreIngredient = async (id: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .update({ is_disabled: false })
      .eq('ingredient_id', id)
      .select('ingredient_id, name')
      .single();

    if (error) {
      console.error('Error restoring ingredient:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'ingredient',
        data.ingredient_id,
        data.name,
        'restored'
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in restoreIngredient:', error);
    return { success: false, error: 'Failed to restore ingredient' };
  }
};

// Get archived ingredients
export const getArchivedIngredients = async (): Promise<{ success: boolean; data?: Ingredient[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('is_disabled', true)
      .order('name');

    if (error) {
      console.error('Error fetching archived ingredients:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getArchivedIngredients:', error);
    return { success: false, error: 'Failed to fetch archived ingredients' };
  }
};

// ===== MEAL QUERIES =====

// Get all meals
export const getAllMeals = async (): Promise<{ success: boolean; data?: Meal[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select(`
        *,
        meal_ingredients(
          *,
          ingredients(*)
        ),
        meal_dietary_tags(
          *,
          dietary_tags(*)
        )
      `)
      .eq('is_disabled', false) // Only get active (non-archived) meals
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching meals:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getAllMeals:', error);
    return { success: false, error: 'Failed to fetch meals' };
  }
};

// Get meal by ID
export const getMealById = async (id: string): Promise<{ success: boolean; data?: Meal; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select(`
        *,
        ingredients:meal_ingredients(
          *,
          ingredient:ingredients(
            name
          )
        ),
        dietary_tags:meal_dietary_tags(
          *,
          dietary_tag:dietary_tags(
            name
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching meal by ID:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getMealById:', error);
    return { success: false, error: 'Failed to fetch meal' };
  }
};

// Create a new meal
export const createMeal = async (mealData: CreateMealData): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .insert([
        {
          name: mealData.name,
          category: mealData.category,
          recipe: mealData.recipe,
          image_url: mealData.image_url,
          is_disabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select('meal_id, name')
      .single();

    if (error) {
      console.error('Error creating meal:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'meal',
        data.meal_id,
        data.name,
        'created',
        { category: mealData.category, recipe: mealData.recipe }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in createMeal:', error);
    return { success: false, error: 'Failed to create meal' };
  }
};

// Update an existing meal
export const updateMeal = async (id: string, mealData: Partial<CreateMealData>): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .update({
        name: mealData.name,
        category: mealData.category,
        recipe: mealData.recipe,
        image_url: mealData.image_url,
        updated_at: new Date().toISOString()
      })
      .eq('meal_id', id)
      .select('meal_id, name')
      .single();

    if (error) {
      console.error('Error updating meal:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'meal',
        data.meal_id,
        data.name,
        'updated',
        { name: mealData.name, category: mealData.category, recipe: mealData.recipe }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateMeal:', error);
    return { success: false, error: 'Failed to update meal' };
  }
};

// Delete a meal
export const deleteMeal = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting meal:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteMeal:', error);
    return { success: false, error: 'Failed to delete meal' };
  }
};

// Get all dietary tags
export const getAllDietaryTags = async (): Promise<{ success: boolean; data?: DietaryTag[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('dietary_tags')
      .select('*')
      .order('tag_name');

    if (error) {
      console.error('Error getting dietary tags:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getAllDietaryTags:', error);
    return { success: false, error: 'Failed to get dietary tags' };
  }
};

// Get archived meals (meals marked as disabled)
export const getArchivedMeals = async (): Promise<{ success: boolean; data?: Meal[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select(`
        *,
        meal_ingredients(
          *,
          ingredients(*)
        ),
        meal_dietary_tags(
          *,
          dietary_tags(*)
        )
      `)
      .eq('is_disabled', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error getting archived meals:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getArchivedMeals:', error);
    return { success: false, error: 'Failed to get archived meals' };
  }
};

// Archive a meal (set is_disabled to true)
export const archiveMeal = async (id: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .update({ is_disabled: true, updated_at: new Date().toISOString() })
      .eq('meal_id', id)
      .select('meal_id, name')
      .single();

    if (error) {
      console.error('Error archiving meal:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'meal',
        data.meal_id,
        data.name,
        'archived'
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in archiveMeal:', error);
    return { success: false, error: 'Failed to archive meal' };
  }
};

// Restore a meal (set is_disabled to false)
export const restoreMeal = async (id: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .update({ is_disabled: false, updated_at: new Date().toISOString() })
      .eq('meal_id', id)
      .select('meal_id, name')
      .single();

    if (error) {
      console.error('Error restoring meal:', error);
      return { success: false, error: error.message };
    }

    // Log the activity
    if (data) {
      await createActivityLogEntry(
        'meal',
        data.meal_id,
        data.name,
        'restored'
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in restoreMeal:', error);
    return { success: false, error: 'Failed to restore meal' };
  }
};

// ================================
// AUDIT TRAIL FUNCTIONS
// ================================

// Create activity log entry
export const createActivityLogEntry = async (
  entityType: 'meal' | 'ingredient',
  entityId: number,
  entityName: string,
  action: 'created' | 'updated' | 'archived' | 'restored',
  changes?: Record<string, any>,
  notes?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('activity_log')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        action: action,
        changed_by: user.email || 'Unknown User',
        changes: changes,
        notes: notes
      });

    if (error) {
      console.error('Error creating activity log entry:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in createActivityLogEntry:', error);
    return { success: false, error: 'Failed to create activity log entry' };
  }
};

// Get all activity logs with pagination
export const getActivityLogs = async (
  limit: number = 50,
  offset: number = 0
): Promise<{ success: boolean; data?: any[]; error?: string; total?: number }> => {
  try {
    // Get total count
    const { count, error: countError } = await supabase
      .from('activity_log')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting activity log count:', countError);
      return { success: false, error: countError.message };
    }

    // Get logs with pagination
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching activity logs:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [], total: count || 0 };
  } catch (error) {
    console.error('Error in getActivityLogs:', error);
    return { success: false, error: 'Failed to fetch activity logs' };
  }
};

// ================================