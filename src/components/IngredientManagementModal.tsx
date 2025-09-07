import { Archive, Edit, Package, RefreshCw, Search, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { archiveIngredient, getAllIngredients, getArchivedIngredients, restoreIngredient } from '../lib/supabaseQueries';
import type { Ingredient, IngredientCategory } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface IngredientManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IngredientManagementModal: React.FC<IngredientManagementModalProps> = ({
  isOpen,
  onClose
}) => {
  const { userRole, user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | 'All'>('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<'Vegetables' | 'Fruits' | 'All'>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { openEditIngredientModal, openCreateIngredientModal } = useModal();

  const isAdmin = userRole === 'admin';
  const isCook = userRole === 'cook';

  const loadIngredients = async () => {
    setIsLoading(true);
    try {
      const result = showArchived
        ? await getArchivedIngredients()
        : await getAllIngredients();
      
      if (result.success && result.data) {
        let filteredData = result.data;
        
        // Filter based on user role
        if (isCook && user) {
          // Cooks only see their own ingredients
          filteredData = result.data.filter(ingredient => 
            ingredient.isbycook && ingredient.profile_id === user.id
          );
        } else if (isAdmin) {
          // Admins only see admin-created ingredients (not created by cooks)
          filteredData = result.data.filter(ingredient => 
            !ingredient.isbycook
          );
        }
        
        setIngredients(filteredData);
      } else {
        toast.error(result.error || 'Failed to load ingredients');
      }
    } catch (error) {
      toast.error('Error loading ingredients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadIngredients();
    }
  }, [isOpen, showArchived, userRole, user?.id]);

  // Listen for ingredient updates
  useEffect(() => {
    const handleIngredientUpdate = () => {
      loadIngredients();
    };

    window.addEventListener('ingredientSaved', handleIngredientUpdate);
    window.addEventListener('ingredientAdded', handleIngredientUpdate);
    
    return () => {
      window.removeEventListener('ingredientSaved', handleIngredientUpdate);
      window.removeEventListener('ingredientAdded', handleIngredientUpdate);
    };
  }, [showArchived, userRole, user?.id]);

  const handleArchive = async (ingredientId: number) => {
    try {
      const result = await archiveIngredient(ingredientId);
      if (result.success) {
        toast.success('Ingredient archived successfully');
        loadIngredients();
      } else {
        toast.error(result.error || 'Failed to archive ingredient');
      }
    } catch (error) {
      toast.error('Error archiving ingredient');
    }
  };

  const handleRestore = async (ingredientId: number) => {
    try {
      const result = await restoreIngredient(ingredientId);
      if (result.success) {
        toast.success('Ingredient restored successfully');
        loadIngredients();
      } else {
        toast.error(result.error || 'Failed to restore ingredient');
      }
    } catch (error) {
      toast.error('Error restoring ingredient');
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    openEditIngredientModal(ingredient);
  };

  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || ingredient.category === selectedCategory;
    const matchesSubcategory = selectedSubcategory === 'All' || 
      (ingredient.category === 'Glow' && ingredient.glow_subcategory === selectedSubcategory);
    
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  const getCategoryBadgeColor = (category: IngredientCategory) => {
    switch (category) {
      case 'Go':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Grow':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Glow':
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getSubcategoryBadgeColor = (subcategory: string) => {
    switch (subcategory) {
      case 'Vegetables':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Fruits':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 animate-in fade-in duration-200 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Ingredient Management
          </h2>
          <div className="flex items-center gap-2">
            {(isAdmin || isCook) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCreateIngredientModal()}
                className="gap-2 hover:bg-green-50 border-green-200 hover:border-green-300"
              >
                <Package className="w-4 h-4" />
                Add New Ingredient
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search ingredients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Archive Toggle - Only for admins */}
            {isAdmin && (
              <Button
                variant={showArchived ? 'default' : 'outline'}
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                {showArchived ? 'Show Active' : 'Show Archived'}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Category Filter */}
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700">Category:</span>
              {(['All', 'Go', 'Grow', 'Glow'] as const).map(category => (
                <Button
                  key={category}
                  size="sm"
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category)}
                  className="text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Glow Subcategory Filter */}
            {selectedCategory === 'Glow' && (
              <div className="flex gap-2">
                <span className="text-sm font-medium text-gray-700">Subcategory:</span>
                {(['All', 'Vegetables', 'Fruits'] as const).map(subcategory => (
                  <Button
                    key={subcategory}
                    size="sm"
                    variant={selectedSubcategory === subcategory ? 'default' : 'outline'}
                    onClick={() => setSelectedSubcategory(subcategory)}
                    className="text-xs"
                  >
                    {subcategory}
                  </Button>
                ))}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={loadIngredients}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Package className="w-8 h-8 mr-3 animate-pulse" />
              Loading ingredients...
            </div>
          ) : filteredIngredients.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No ingredients found</p>
              <p className="text-sm">
                {searchTerm 
                  ? 'Try adjusting your search or filters' 
                  : showArchived 
                    ? 'No archived ingredients' 
                    : 'No active ingredients'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredIngredients.map((ingredient) => (
                <div
                  key={ingredient.ingredient_id}
                  className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 ${
                    showArchived ? 'border-gray-300 opacity-75' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Image */}
                  <div className="h-32 bg-gray-100 relative overflow-hidden rounded-t-xl">
                    {(ingredient as any).signed_image_url || ingredient.image_url ? (
                      <img
                        src={(ingredient as any).signed_image_url || ingredient.image_url}
                        alt={ingredient.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                    {showArchived && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        Archived
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight" title={ingredient.name}>
                        {ingredient.name}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryBadgeColor(ingredient.category)}`}>
                        {ingredient.category}
                      </span>
                      {ingredient.category === 'Glow' && ingredient.glow_subcategory && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSubcategoryBadgeColor(ingredient.glow_subcategory)}`}>
                          {ingredient.glow_subcategory}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mb-4">
                      {/* Show price per unit and per kilo */}
                      <p className="text-sm text-gray-600">
                        ₱{ingredient.price_per_unit?.toFixed(2) || (ingredient.price_per_kilo || 0).toFixed(2)}/{ingredient.unit_type || 'kg'}
                      </p>
                      {ingredient.unit_type === 'g' && (
                        <p className="text-xs text-gray-500">
                          (₱{ingredient.price_per_kilo.toFixed(2)}/kg)
                        </p>
                      )}
                      {ingredient.package_price && ingredient.package_quantity && (
                        <p className="text-xs text-gray-500">
                          Package: ₱{ingredient.package_price.toFixed(2)} for {ingredient.package_quantity}{ingredient.unit_type || 'kg'}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {isAdmin || (isCook && ingredient.isbycook && ingredient.profile_id === user?.id) ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(ingredient)}
                            className="flex-1 text-xs"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          {isAdmin && (
                            <>
                              {showArchived ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestore(ingredient.ingredient_id)}
                                  className="flex-1 text-xs text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Restore
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleArchive(ingredient.ingredient_id)}
                                  className="flex-1 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                >
                                  <Archive className="w-3 h-3 mr-1" />
                                  Archive
                                </Button>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-gray-500 text-center w-full py-2">
                          {isAdmin ? 'Admin Ingredient' : 'My Ingredient'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {filteredIngredients.length} of {ingredients.length} ingredients
            {showArchived && <span className="text-red-600 ml-2">(Archived)</span>}
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
