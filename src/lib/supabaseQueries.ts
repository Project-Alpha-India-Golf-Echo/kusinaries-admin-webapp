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
  MealFilters,
  IngredientCategory 
} from '../types';

// ===== INGREDIENT QUERIES =====

// Get all ingredients
export const getAllIngredients = async (): Promise<{ success: boolean; data?: Ingredient[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
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

// Get ingredients by category
export const getIngredientsByCategory = async (category: IngredientCategory): Promise<{ success: boolean; data?: Ingredient[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('category', category)
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

// Create new ingredient
export const createIngredient = async (
  name: string,
  category: IngredientCategory,
  pricePerKilo: number,
  imageFile?: File
): Promise<{ success: boolean; data?: Ingredient; error?: string }> => {
  try {
    let imageUrl = null;

    if (imageFile) {
      // Upload image to storage first
      const { uploadImageToStorage } = await import('./storageUtils');
      const uploadResult = await uploadImageToStorage(imageFile, 'ingredients');
      
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || 'Failed to upload image' };
      }
      
      imageUrl = uploadResult.url;
    }

    const { data, error } = await supabase
      .from('ingredients')
      .insert({
        name,
        category,
        price_per_kilo: pricePerKilo,
        image_url: imageUrl
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ingredient:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in createIngredient:', error);
    return { success: false, error: 'Failed to create ingredient' };
  }
};

// ===== DIETARY TAG QUERIES =====

// Get all dietary tags
export const getAllDietaryTags = async (): Promise<{ success: boolean; data?: DietaryTag[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('dietary_tags')
      .select('*')
      .order('tag_name');

    if (error) {
      console.error('Error fetching dietary tags:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getAllDietaryTags:', error);
    return { success: false, error: 'Failed to fetch dietary tags' };
  }
};

// ===== MEAL QUERIES =====

// Get all meals with filters
export const getMealsWithFilters = async (filters: MealFilters = {}): Promise<{ success: boolean; data?: Meal[]; error?: string }> => {
  try {
    let query = supabase
      .from('meals')
      .select(`
        *,
        meal_ingredients (
          meal_ingredient_id,
          ingredient_id,
          quantity,
          ingredients (*)
        ),
        meal_dietary_tags (
          dietary_tags (*)
        )
      `)
      .eq('is_disabled', false);

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    // Apply sorting
    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching meals:', error);
      return { success: false, error: error.message };
    }

    // Calculate estimated prices and format data
    const mealsWithPrice = data?.map((meal: any) => {
      const estimatedPrice = meal.meal_ingredients?.reduce((total: number, mealIngredient: any) => {
        const ingredient = mealIngredient.ingredients;
        if (!ingredient) return total;

        // Simple quantity parsing (assumes format like "250g", "1 cup", etc.)
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

        return total + (quantityInKg * ingredient.price_per_kilo);
      }, 0) || 0;

      return {
        ...meal,
        estimated_price: estimatedPrice,
        dietary_tags: meal.meal_dietary_tags?.map((mdt: any) => mdt.dietary_tags).filter(Boolean) || []
      };
    }) || [];

    // Apply dietary tag filter after data processing
    let filteredMeals = mealsWithPrice;
    if (filters.dietary_tags && filters.dietary_tags.length > 0) {
      filteredMeals = mealsWithPrice.filter((meal: any) =>
        filters.dietary_tags!.some((tagId: number) =>
          meal.dietary_tags?.some((tag: any) => tag.tag_id === tagId)
        )
      );
    }

    // Apply price sorting if needed
    if (filters.sort_by === 'estimated_price') {
      filteredMeals.sort((a, b) => {
        const aPrice = a.estimated_price || 0;
        const bPrice = b.estimated_price || 0;
        return filters.sort_order === 'asc' ? aPrice - bPrice : bPrice - aPrice;
      });
    }

    return { success: true, data: filteredMeals };
  } catch (error) {
    console.error('Error in getMealsWithFilters:', error);
    return { success: false, error: 'Failed to fetch meals' };
  }
};

// Get single meal by ID
export const getMealById = async (mealId: number): Promise<{ success: boolean; data?: Meal; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select(`
        *,
        meal_ingredients (
          meal_ingredient_id,
          ingredient_id,
          quantity,
          ingredients (*)
        ),
        meal_dietary_tags (
          dietary_tags (*)
        )
      `)
      .eq('meal_id', mealId)
      .single();

    if (error) {
      console.error('Error fetching meal:', error);
      return { success: false, error: error.message };
    }

    // Calculate estimated price
    const estimatedPrice = data.meal_ingredients?.reduce((total: number, mealIngredient: any) => {
      const ingredient = mealIngredient.ingredients;
      if (!ingredient) return total;

      const quantityStr = mealIngredient.quantity.toLowerCase().trim();
      let quantityInKg = 0;

      if (quantityStr.includes('kg')) {
        quantityInKg = parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0;
      } else if (quantityStr.includes('g')) {
        quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) / 1000;
      } else if (quantityStr.includes('cup')) {
        quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.24;
      } else if (quantityStr.includes('piece')) {
        quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.1;
      } else if (quantityStr.includes('tbsp') || quantityStr.includes('tablespoon')) {
        quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.015;
      } else if (quantityStr.includes('tsp') || quantityStr.includes('teaspoon')) {
        quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.005;
      } else {
        const numValue = parseFloat(quantityStr.replace(/[^0-9.]/g, ''));
        if (!isNaN(numValue)) {
          quantityInKg = numValue / 1000;
        }
      }

      return total + (quantityInKg * ingredient.price_per_kilo);
    }, 0) || 0;

    const mealWithPrice = {
      ...data,
      estimated_price: estimatedPrice,
      dietary_tags: data.meal_dietary_tags?.map((mdt: any) => mdt.dietary_tags).filter(Boolean) || []
    };

    return { success: true, data: mealWithPrice };
  } catch (error) {
    console.error('Error in getMealById:', error);
    return { success: false, error: 'Failed to fetch meal' };
  }
};

// Create new meal
export const createMeal = async (mealData: CreateMealData): Promise<{ success: boolean; data?: Meal; error?: string }> => {
  try {
    // Start a transaction by creating the meal first
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .insert({
        name: mealData.name,
        category: mealData.category,
        recipe: mealData.recipe,
        image_url: mealData.image_url
      })
      .select()
      .single();

    if (mealError) {
      console.error('Error creating meal:', mealError);
      return { success: false, error: mealError.message };
    }

    // Add meal ingredients
    if (mealData.ingredients.length > 0) {
      const mealIngredients = mealData.ingredients.map(ingredient => ({
        meal_id: meal.meal_id,
        ingredient_id: ingredient.ingredient_id,
        quantity: ingredient.quantity
      }));

      const { error: ingredientsError } = await supabase
        .from('meal_ingredients')
        .insert(mealIngredients);

      if (ingredientsError) {
        console.error('Error adding meal ingredients:', ingredientsError);
        // Clean up the meal if ingredients failed
        await supabase.from('meals').delete().eq('meal_id', meal.meal_id);
        return { success: false, error: ingredientsError.message };
      }
    }

    // Add dietary tags
    if (mealData.dietary_tag_ids.length > 0) {
      const mealDietaryTags = mealData.dietary_tag_ids.map(tagId => ({
        meal_id: meal.meal_id,
        tag_id: tagId
      }));

      const { error: tagsError } = await supabase
        .from('meal_dietary_tags')
        .insert(mealDietaryTags);

      if (tagsError) {
        console.error('Error adding meal dietary tags:', tagsError);
        // Note: We don't clean up here as tags are optional
      }
    }

    // Fetch the complete meal data
    const result = await getMealById(meal.meal_id);
    return result;
  } catch (error) {
    console.error('Error in createMeal:', error);
    return { success: false, error: 'Failed to create meal' };
  }
};

// Update meal
export const updateMeal = async (mealId: number, mealData: CreateMealData): Promise<{ success: boolean; data?: Meal; error?: string }> => {
  try {
    // Update meal basic info
    const { error: mealError } = await supabase
      .from('meals')
      .update({
        name: mealData.name,
        category: mealData.category,
        recipe: mealData.recipe,
        image_url: mealData.image_url,
        updated_at: new Date().toISOString()
      })
      .eq('meal_id', mealId);

    if (mealError) {
      console.error('Error updating meal:', mealError);
      return { success: false, error: mealError.message };
    }

    // Delete existing ingredients and tags
    await supabase.from('meal_ingredients').delete().eq('meal_id', mealId);
    await supabase.from('meal_dietary_tags').delete().eq('meal_id', mealId);

    // Add new ingredients
    if (mealData.ingredients.length > 0) {
      const mealIngredients = mealData.ingredients.map(ingredient => ({
        meal_id: mealId,
        ingredient_id: ingredient.ingredient_id,
        quantity: ingredient.quantity
      }));

      const { error: ingredientsError } = await supabase
        .from('meal_ingredients')
        .insert(mealIngredients);

      if (ingredientsError) {
        console.error('Error updating meal ingredients:', ingredientsError);
        return { success: false, error: ingredientsError.message };
      }
    }

    // Add new dietary tags
    if (mealData.dietary_tag_ids.length > 0) {
      const mealDietaryTags = mealData.dietary_tag_ids.map(tagId => ({
        meal_id: mealId,
        tag_id: tagId
      }));

      const { error: tagsError } = await supabase
        .from('meal_dietary_tags')
        .insert(mealDietaryTags);

      if (tagsError) {
        console.error('Error updating meal dietary tags:', tagsError);
      }
    }

    // Fetch the updated meal data
    const result = await getMealById(mealId);
    return result;
  } catch (error) {
    console.error('Error in updateMeal:', error);
    return { success: false, error: 'Failed to update meal' };
  }
};

// Archive/disable meal
export const archiveMeal = async (mealId: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('meals')
      .update({ is_disabled: true })
      .eq('meal_id', mealId);

    if (error) {
      console.error('Error archiving meal:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in archiveMeal:', error);
    return { success: false, error: 'Failed to archive meal' };
  }
};

// Restore archived meal
export const restoreMeal = async (mealId: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('meals')
      .update({ is_disabled: false })
      .eq('meal_id', mealId);

    if (error) {
      console.error('Error restoring meal:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in restoreMeal:', error);
    return { success: false, error: 'Failed to restore meal' };
  }
};

// Get archived meals
export const getArchivedMeals = async (): Promise<{ success: boolean; data?: Meal[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select(`
        *,
        meal_ingredients (
          meal_ingredient_id,
          ingredient_id,
          quantity,
          ingredients (*)
        ),
        meal_dietary_tags (
          dietary_tags (*)
        )
      `)
      .eq('is_disabled', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching archived meals:', error);
      return { success: false, error: error.message };
    }

    const mealsWithPrice = data?.map((meal: any) => {
      const estimatedPrice = meal.meal_ingredients?.reduce((total: number, mealIngredient: any) => {
        const ingredient = mealIngredient.ingredients;
        if (!ingredient) return total;

        const quantityStr = mealIngredient.quantity.toLowerCase().trim();
        let quantityInKg = 0;

        if (quantityStr.includes('kg')) {
          quantityInKg = parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0;
        } else if (quantityStr.includes('g')) {
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) / 1000;
        } else if (quantityStr.includes('cup')) {
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.24;
        } else if (quantityStr.includes('piece')) {
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.1;
        } else if (quantityStr.includes('tbsp') || quantityStr.includes('tablespoon')) {
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.015;
        } else if (quantityStr.includes('tsp') || quantityStr.includes('teaspoon')) {
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.005;
        } else {
          const numValue = parseFloat(quantityStr.replace(/[^0-9.]/g, ''));
          if (!isNaN(numValue)) {
            quantityInKg = numValue / 1000;
          }
        }

        return total + (quantityInKg * ingredient.price_per_kilo);
      }, 0) || 0;

      return {
        ...meal,
        estimated_price: estimatedPrice,
        dietary_tags: meal.meal_dietary_tags?.map((mdt: any) => mdt.dietary_tags).filter(Boolean) || []
      };
    }) || [];

    return { success: true, data: mealsWithPrice };
  } catch (error) {
    console.error('Error in getArchivedMeals:', error);
    return { success: false, error: 'Failed to fetch archived meals' };
  }
};