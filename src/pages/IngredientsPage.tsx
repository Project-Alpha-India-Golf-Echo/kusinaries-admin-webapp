import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useModal } from '../contexts/ModalContext';
import { IngredientCard } from '../components/IngredientCard';
import { IngredientFiltersComponent } from '../components/IngredientFiltersComponent';
import {
    getAllIngredients,
    getArchivedIngredients,
    archiveIngredient,
    restoreIngredient
} from '../lib/supabaseQueries';
import type { Ingredient, IngredientCategory } from '../types';
import { Plus } from 'lucide-react';

interface IngredientFilters {
    search?: string;
    category?: IngredientCategory;
}

// Custom hook for debounced search
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

export const IngredientsPage = () => {
    const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<IngredientFilters>({});
    const [showArchived, setShowArchived] = useState(false);
    const { openCreateIngredientModal, openEditIngredientModal } = useModal();

    // Debounce the search term to avoid excessive API calls
    const debouncedSearch = useDebounce(filters.search || '', 300);

    // Load ingredients based on archived view
    const loadIngredients = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = showArchived 
                ? await getArchivedIngredients()
                : await getAllIngredients();

            if (result.success) {
                setAllIngredients(result.data || []);
            } else {
                setError(result.error || 'Failed to load ingredients');
                console.error(result.error || 'Failed to load ingredients');
            }
        } catch (err) {
            const errorMessage = 'An unexpected error occurred while loading ingredients';
            setError(errorMessage);
            console.error(errorMessage, err);
        } finally {
            setLoading(false);
        }
    };

    // Filter ingredients locally for better performance
    const filteredIngredients = useMemo(() => {
        let filtered = allIngredients;

        // Apply search filter
        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            filtered = filtered.filter(ingredient =>
                ingredient.name.toLowerCase().includes(searchLower)
            );
        }

        // Apply category filter
        if (filters.category) {
            filtered = filtered.filter(ingredient => ingredient.category === filters.category);
        }

        return filtered;
    }, [allIngredients, debouncedSearch, filters.category]);

    // Load ingredients on component mount and when showArchived changes
    useEffect(() => {
        loadIngredients();
    }, [showArchived]);

    // Listen for ingredient saved events
    useEffect(() => {
        const handleIngredientSaved = () => {
            loadIngredients();
        };

        window.addEventListener('ingredientSaved', handleIngredientSaved);
        return () => {
            window.removeEventListener('ingredientSaved', handleIngredientSaved);
        };
    }, []);

    // Handle filter changes
    const handleFiltersChange = (newFilters: IngredientFilters) => {
        setFilters(newFilters);
    };

    // Handle creating a new ingredient
    const handleCreateIngredient = () => {
        openCreateIngredientModal();
    };

    // Handle editing an ingredient
    const handleEditIngredient = (ingredient: Ingredient) => {
        openEditIngredientModal(ingredient);
    };

    // Handle archiving an ingredient
    const handleArchiveIngredient = async (ingredientId: number) => {
        try {
            const result = await archiveIngredient(ingredientId);

            if (result.success) {
                console.log('Ingredient archived successfully!');
                loadIngredients();
            } else {
                console.error(result.error || 'Failed to archive ingredient');
                alert(result.error || 'Failed to archive ingredient');
            }
        } catch (error) {
            console.error('An unexpected error occurred while archiving the ingredient', error);
            alert('An unexpected error occurred while archiving the ingredient');
        }
    };

    // Handle restoring an ingredient
    const handleRestoreIngredient = async (ingredientId: number) => {
        try {
            const result = await restoreIngredient(ingredientId);

            if (result.success) {
                console.log('Ingredient restored successfully!');
                loadIngredients();
            } else {
                console.error(result.error || 'Failed to restore ingredient');
                alert(result.error || 'Failed to restore ingredient');
            }
        } catch (error) {
            console.error('An unexpected error occurred while restoring the ingredient', error);
            alert('An unexpected error occurred while restoring the ingredient');
        }
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({});
    };

    // Toggle archived view
    const handleToggleArchived = () => {
        setShowArchived(!showArchived);
        setFilters({}); // Reset filters when switching views
    };

    // Get filtered ingredients count for display
    const filteredCount = filteredIngredients.length;
    const hasActiveFilters = !!(filters.search || filters.category);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading ingredients...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="max-w-md mx-auto">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-red-600 mb-4">{error}</p>
                            <Button onClick={loadIngredients} variant="outline">
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                <div>
                    <h2 className="text-3xl font-semibold text-gray-900">
                        Ingredients{showArchived && ' - Archived'}</h2>
                    <p className="text-gray-600">
                        {showArchived 
                            ? 'Manage archived ingredients' 
                            : 'Manage your ingredients database'
                        }
                        {hasActiveFilters && (
                            <span className="ml-2">
                                ({filteredCount} {filteredCount === 1 ? 'result' : 'results'} found)
                            </span>
                        )}
                    </p>
                </div>
                {!showArchived && (
                    <Button
                        onClick={handleCreateIngredient}
                        className="mt-4 sm:mt-0"
                    >
                    <Plus className="w-4 h-4" />
                        Add New Ingredient
                    </Button>
                )}
            </div>

            {/* Filters */}
     
                    <IngredientFiltersComponent
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        showArchived={showArchived}
                        onToggleArchived={handleToggleArchived}
                    />
                    {hasActiveFilters && (
                        <div className="mt-4 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={clearFilters}
                                size="sm"
                            >
                                Clear All Filters
                            </Button>
                        </div>
                    )}
        

            {/* Ingredients Grid */}
            {filteredIngredients.length === 0 ? (
                <Card>
                    <CardContent className="pt-8 pb-8">
                        <div className="text-center">
                            <p className="text-gray-500 text-lg mb-4">
                                {hasActiveFilters
                                    ? 'No ingredients match your current filters.'
                                    : showArchived
                                        ? 'No archived ingredients found. Archived ingredients will appear here.'
                                        : 'No ingredients found. Start by adding your first ingredient!'
                                }
                            </p>
                            {hasActiveFilters ? (
                                <Button variant="outline" onClick={clearFilters}>
                                    Clear Filters
                                </Button>
                            ) : !showArchived ? (
                                <Button onClick={handleCreateIngredient}>
                                    Add Your First Ingredient
                                </Button>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredIngredients.map((ingredient: Ingredient) => (
                        <IngredientCard
                            key={ingredient.ingredient_id}
                            ingredient={ingredient}
                            onEdit={handleEditIngredient}
                            onArchive={showArchived ? undefined : handleArchiveIngredient}
                            onRestore={showArchived ? handleRestoreIngredient : undefined}
                            isArchived={showArchived}
                        />
                    ))}
                </div>
            )}

            {/* Results Summary */}
            {filteredIngredients.length > 0 && (
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                        Showing {filteredIngredients.length} {filteredIngredients.length === 1 ? 'ingredient' : 'ingredients'}
                        {showArchived ? ' archived' : ''}
                        {hasActiveFilters && ' matching your filters'}
                    </p>
                </div>
            )}
        </div>
    );
}
