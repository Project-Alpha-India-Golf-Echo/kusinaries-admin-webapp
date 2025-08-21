import { Archive, Edit, Package, RefreshCw, Search, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useModal } from '../contexts/ModalContext';
import { getAllCondiments, toggleCondimentArchiveStatus } from '../lib/supabaseQueries';
import type { Condiment, CondimentUnitType } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface CondimentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CondimentManagementModal: React.FC<CondimentManagementModalProps> = ({
  isOpen,
  onClose
}) => {
  const [condiments, setCondiments] = useState<Condiment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitType, setSelectedUnitType] = useState<CondimentUnitType | 'All'>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { openEditCondimentModal, openCreateCondimentModal } = useModal();

  const loadCondiments = async () => {
    setIsLoading(true);
    try {
      const result = await getAllCondiments();
      
      if (result.success && result.data) {
        setCondiments(result.data);
      } else {
        toast.error(result.error || 'Failed to load condiments');
      }
    } catch (error) {
      toast.error('Error loading condiments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCondiments();
    }
  }, [isOpen]);

  // Listen for condiment updates
  useEffect(() => {
    const handleCondimentUpdate = () => {
      loadCondiments();
    };

    window.addEventListener('condimentSaved', handleCondimentUpdate);
    window.addEventListener('condimentAdded', handleCondimentUpdate);
    
    return () => {
      window.removeEventListener('condimentSaved', handleCondimentUpdate);
      window.removeEventListener('condimentAdded', handleCondimentUpdate);
    };
  }, []);

  const handleArchive = async (condimentId: number) => {
    try {
      const result = await toggleCondimentArchiveStatus(condimentId, true);
      if (result.success) {
        toast.success('Condiment archived successfully');
        loadCondiments();
      } else {
        toast.error(result.error || 'Failed to archive condiment');
      }
    } catch (error) {
      toast.error('Error archiving condiment');
    }
  };

  const handleRestore = async (condimentId: number) => {
    try {
      const result = await toggleCondimentArchiveStatus(condimentId, false);
      if (result.success) {
        toast.success('Condiment restored successfully');
        loadCondiments();
      } else {
        toast.error(result.error || 'Failed to restore condiment');
      }
    } catch (error) {
      toast.error('Error restoring condiment');
    }
  };

  const handleEdit = (condiment: Condiment) => {
    openEditCondimentModal(condiment);
  };

  const filteredCondiments = condiments.filter(condiment => {
    // Show/hide archived
    if (showArchived && !condiment.is_archived) return false;
    if (!showArchived && condiment.is_archived) return false;

    // Search filter
    if (searchTerm && !condiment.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Unit type filter
    if (selectedUnitType !== 'All' && condiment.unit_type !== selectedUnitType) {
      return false;
    }

    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Condiment Management</h2>
            <p className="text-sm text-gray-600">Manage, edit, and archive condiments</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openCreateCondimentModal}
              className="gap-2 bg-white hover:bg-purple-50 border-purple-200 hover:border-purple-300"
            >
              <Package className="w-4 h-4" />
              Add New Condiment
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-white/70">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b bg-gray-50/50">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search condiments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Unit Type Filter */}
            <select
              value={selectedUnitType}
              onChange={(e) => setSelectedUnitType(e.target.value as CondimentUnitType | 'All')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="All">All Units</option>
              <option value="ml">ml</option>
              <option value="g">grams</option>
              <option value="tbsp">tbsp</option>
              <option value="tsp">tsp</option>
              <option value="piece">piece</option>
              <option value="sachet">sachet</option>
              <option value="bottle">bottle</option>
            </select>

            {/* Show Archived Toggle */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              Show Archived
            </label>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadCondiments}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-500">
                <Package className="w-6 h-6 animate-pulse" />
                <span>Loading condiments...</span>
              </div>
            </div>
          ) : filteredCondiments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No condiments found</p>
              <p className="text-sm">
                {searchTerm || selectedUnitType !== 'All'
                  ? 'Try adjusting your filters'
                  : showArchived
                  ? 'No archived condiments available'
                  : 'No condiments available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCondiments.map((condiment) => (
                <div
                  key={condiment.condiment_id}
                  className={`bg-white rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                    condiment.is_archived
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-purple-200 hover:border-purple-300'
                  }`}
                >
                  {/* Condiment Image */}
                  <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    {condiment.signed_image_url || condiment.image_url ? (
                      <img
                        src={condiment.signed_image_url || condiment.image_url}
                        alt={condiment.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-gray-400" />
                    )}
                  </div>

                  {/* Condiment Info */}
                  <div className="space-y-2">
                    <h3 className={`font-semibold text-sm ${condiment.is_archived ? 'text-gray-500' : 'text-gray-900'}`} title={condiment.name}>
                      {condiment.name}
                    </h3>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className={condiment.is_archived ? 'text-gray-400' : 'text-purple-600'}>
                        ₱{condiment.price_per_unit.toFixed(2)}/{condiment.unit_type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                        condiment.is_archived
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {condiment.unit_type}
                      </span>
                    </div>

                    {condiment.is_archived && (
                      <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        Archived
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(condiment)}
                      className="flex-1 text-xs py-1.5 gap-1 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                    
                    {condiment.is_archived ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(condiment.condiment_id)}
                        className="flex-1 text-xs py-1.5 gap-1 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Restore
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchive(condiment.condiment_id)}
                        className="flex-1 text-xs py-1.5 gap-1 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                      >
                        <Archive className="w-3 h-3" />
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50/50">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              {filteredCondiments.length} condiment{filteredCondiments.length !== 1 ? 's' : ''} 
              {showArchived ? ' (archived)' : ''}
            </span>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
