import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { IngredientCategory } from '../types';

interface IngredientFilters {
  search?: string;
  category?: IngredientCategory;
}

interface IngredientFiltersComponentProps {
  filters: IngredientFilters;
  onFiltersChange: (filters: IngredientFilters) => void;
  showArchived: boolean;
  onToggleArchived: () => void;
}

export const IngredientFiltersComponent: React.FC<IngredientFiltersComponentProps> = ({
  filters,
  onFiltersChange,
  showArchived,
  onToggleArchived
}) => {
  const [localSearch, setLocalSearch] = useState(filters.search || '');

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

  const handleCategoryChange = (category: IngredientCategory | undefined) => {
    onFiltersChange({ ...filters, category });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filter Ingredients</h3>
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-gray-600 hover:text-gray-900"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search ingredients..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <div>
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) => handleCategoryChange(value === 'all' ? undefined : value as IngredientCategory)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Go">Go (Energy - Carbohydrates)</SelectItem>
              <SelectItem value="Grow">Grow (Build - Proteins)</SelectItem>
              <SelectItem value="Glow">Glow (Protect - Vitamins & Minerals)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Category Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant={!filters.category ? "default" : "outline"}
          size="sm"
          onClick={() => handleCategoryChange(undefined)}
          className={!filters.category ? "bg-green-600 hover:bg-green-700" : ""}
        >
          All
        </Button>
        <Button
          variant={filters.category === 'Go' ? "default" : "outline"}
          size="sm"
          onClick={() => handleCategoryChange('Go')}
          className={filters.category === 'Go' ? "bg-yellow-600 hover:bg-yellow-700" : "border-yellow-300 text-yellow-700 hover:bg-yellow-50"}
        >
          Go Foods
        </Button>
        <Button
          variant={filters.category === 'Grow' ? "default" : "outline"}
          size="sm"
          onClick={() => handleCategoryChange('Grow')}
          className={filters.category === 'Grow' ? "bg-red-600 hover:bg-red-700" : "border-red-300 text-red-700 hover:bg-red-50"}
        >
          Grow Foods
        </Button>
        <Button
          variant={filters.category === 'Glow' ? "default" : "outline"}
          size="sm"
          onClick={() => handleCategoryChange('Glow')}
          className={filters.category === 'Glow' ? "bg-green-600 hover:bg-green-700" : "border-green-300 text-green-700 hover:bg-green-50"}
        >
          Glow Foods
        </Button>
      </div>
    </div>
  );
};
