import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Filter, Plus, Search, SortAsc, SortDesc, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createDietaryTag, disableDietaryTag } from '../lib/supabaseQueries';
import type { DietaryTag, MealCategory, MealFilters } from '../types';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';


interface MealFiltersComponentProps {
  filters: MealFilters;
  onFiltersChange: (filters: MealFilters) => void;
  dietaryTags: DietaryTag[];
  showArchived: boolean;
  onToggleArchived: () => void;
  userRole?: string;
  isVerifiedCook?: boolean;
  readOnly?: boolean;
}

export const MealFiltersComponent: React.FC<MealFiltersComponentProps> = ({
  filters,
  onFiltersChange,
  dietaryTags,
  showArchived,
  onToggleArchived,
  userRole,
  isVerifiedCook,
  readOnly = false
}) => {
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [tagError, setTagError] = useState('');
  const [tagToDisable, setTagToDisable] = useState<DietaryTag | null>(null);
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const guardReadOnly = (description: string) => {
    if (!readOnly) return false;
    toast.info('Read-only mode enabled', { description });
    return true;
  };

  // Update local search when filters change (e.g., when cleared)
  useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmedSearch = localSearch.trim();
      if (trimmedSearch !== (filters.search || '')) {
        onFiltersChange({ ...filters, search: trimmedSearch || undefined });
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localSearch, filters, onFiltersChange]);

  const handleSearchChange = (search: string) => {
    setLocalSearch(search);
  };

  const handleCategoryChange = (category: string) => {
    onFiltersChange({
      ...filters,
      category: category === 'all' ? undefined : category as MealCategory
    });
  };

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    onFiltersChange({
      ...filters,
      sort_by: sortBy as any,
      sort_order: sortOrder as 'asc' | 'desc'
    });
  };

  const handleDietaryTagToggle = (tagId: number) => {
    const currentTags = filters.dietary_tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];

    onFiltersChange({
      ...filters,
      dietary_tags: newTags.length > 0 ? newTags : undefined
    });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: status === 'all' ? undefined : status as 'pending' | 'approved' | 'rejected'
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = filters.search || filters.category || (filters.dietary_tags && filters.dietary_tags.length > 0) || filters.status;

  const handleAddDietaryTag = async () => {
    if (guardReadOnly('Guest access cannot create dietary tags.')) {
      setIsAddOpen(false);
      return;
    }
    const name = newTagName.trim();
    if (!name) {
      setTagError('Enter a tag name');
      return;
    }
    setTagError('');
    setIsCreatingTag(true);
    try {
      const result = await createDietaryTag(name);
      if (result.success && result.data) {
        // fire event so parent page reloads tags
        window.dispatchEvent(new CustomEvent('dietaryTagChanged'));
        setNewTagName('');
        setIsAddOpen(false);
      } else {
        setTagError(result.error || 'Failed to add tag');
      }
    } finally {
      setIsCreatingTag(false);
    }
  };

  const openDisableDialog = (tag: DietaryTag) => {
    if (guardReadOnly('Guest access cannot disable dietary tags.')) return;
    setTagToDisable(tag);
    setIsDisableOpen(true);
  };

  const confirmDisableTag = async () => {
    if (guardReadOnly('Guest access cannot disable dietary tags.')) {
      setIsDisableOpen(false);
      return;
    }
    if (!tagToDisable) return;
    setIsDisabling(true);
    const res = await disableDietaryTag(tagToDisable.tag_id);
    if (res.success) {
      if (filters.dietary_tags?.includes(tagToDisable.tag_id)) {
        onFiltersChange({ ...filters, dietary_tags: filters.dietary_tags.filter(id => id !== tagToDisable.tag_id) });
      }
      window.dispatchEvent(new CustomEvent('dietaryTagChanged'));
      setIsDisableOpen(false);
      setTagToDisable(null);
    }
    setIsDisabling(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filters & Search
        </h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-600 hover:text-gray-700"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleArchived}
            className={showArchived ? 'bg-red-50 text-red-700 border-red-200' : ''}
          >
            {showArchived ? 'Show Active' : 'Show Archived'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Meals
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by meal name..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meal Category
          </label>

          <Select
            value={filters.category || 'all'}
            onValueChange={(value) => handleCategoryChange(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Best for Breakfast">Best for Breakfast</SelectItem>
              <SelectItem value="Best for Lunch">Best for Lunch</SelectItem>
              <SelectItem value="Best for Dinner">Best for Dinner</SelectItem>
              <SelectItem value="Best for Snacks">Best for Snacks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <div className="flex space-x-2">
            <Select
              value={filters.sort_by || 'created_at'}
              onValueChange={(value) => handleSortChange(value, filters.sort_order || 'desc')}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="estimated_price">Price</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => handleSortChange(filters.sort_by || 'created_at', filters.sort_order === 'asc' ? 'desc' : 'asc')}
              className="px-3"
            >
              {filters.sort_order === 'asc' ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Status Filter (for cooks only) */}
        {userRole === 'cook' && isVerifiedCook && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Submission Status
            </label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleStatusChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Dietary Tags */}
      {dietaryTags.length > 0 && (
        <div className="mt-4">
          <div className="flex items-cente mb-2 gap-2">
            <label className="block text-sm font-medium text-gray-700">
              Dietary Tags
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {dietaryTags.map((tag) => (
              <div key={tag.tag_id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors mr-1 ${filters.dietary_tags?.includes(tag.tag_id)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => handleDietaryTagToggle(tag.tag_id)}
                    className="flex-1"
                  >
                    {tag.tag_name}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDisableDialog(tag);
                    }}
                    className="text-gray-400 hover:text-red-600 transition-colors ml-1 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={readOnly}
                    aria-label="Disable tag"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                if (guardReadOnly('Guest access cannot create dietary tags.')) return;
                setIsAddOpen(true);
                setTagError('');
              }}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors mr-1 bg-green-100 text-green-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60`}
              disabled={readOnly}
            >
              <Plus className="w-4 h-4" /> Add new dietary tag
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600 font-medium">Active filters:</span>
            {filters.search && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Search: "{filters.search}"
              </span>
            )}
            {filters.category && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                Category: {filters.category}
              </span>
            )}
            {filters.dietary_tags && filters.dietary_tags.length > 0 && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Tags: {filters.dietary_tags.length} selected
              </span>
            )}
          </div>
        </div>
      )}
      <AlertDialog open={isDisableOpen} onOpenChange={setIsDisableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable dietary tag</AlertDialogTitle>
            <AlertDialogDescription>
              {tagToDisable ? (
                <>Are you sure you want to disable the tag <span className="font-medium">{tagToDisable.tag_name}</span>? It will be hidden from selection but remain historically associated with meals.</>
              ) : 'Are you sure?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisabling} onClick={() => setTagToDisable(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDisabling || readOnly}
              onClick={(e) => { e.preventDefault(); confirmDisableTag(); }}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDisabling ? 'Disabling...' : 'Disable'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Dietary Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new dietary tag to classify meals (e.g., "Low Sodium", "Keto").
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 mt-2">
            <Input
              autoFocus
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Enter tag name"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDietaryTag(); } }}
            />
            {tagError && <p className="text-xs text-red-600">{tagError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreatingTag} onClick={() => { setNewTagName(''); setTagError(''); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCreatingTag || readOnly}
              onClick={(e) => { e.preventDefault(); handleAddDietaryTag(); }}
            >
              {isCreatingTag ? 'Adding...' : 'Add Tag'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
