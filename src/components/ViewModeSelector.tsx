import { Grid2X2, Grid3X3, LayoutGrid, List } from 'lucide-react';
import React from 'react';
import { Button } from './ui/button';

export type ViewMode = 'grid' | 'list' | 'compact' | 'medium';

interface ViewModeSelectorProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  currentMode,
  onModeChange
}) => {
  const viewModes = [
    {
      id: 'grid' as ViewMode,
      label: 'Grid View',
      icon: LayoutGrid,
      description: '3-4 items per row'
    },
    {
      id: 'list' as ViewMode,
      label: 'List View',
      icon: List,
      description: 'Stacked vertically'
    },
    {
      id: 'compact' as ViewMode,
      label: 'Compact Grid',
      icon: Grid3X3,
      description: 'Small cards'
    },
    {
      id: 'medium' as ViewMode,
      label: 'Medium Grid',
      icon: Grid2X2,
      description: 'Medium cards'
    }
  ];

  return (
    <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1">
      {viewModes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;
        
        return (
          <Button
            key={mode.id}
            size="sm"
            variant={isActive ? 'default' : 'ghost'}
            onClick={() => onModeChange(mode.id)}
            className={`
              px-3 py-2 transition-all duration-200
              ${isActive 
                ? 'bg-green-600 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
            title={`${mode.label} - ${mode.description}`}
          >
            <Icon className="w-4 h-4" />
            <span className="ml-1 hidden sm:inline text-xs font-medium">
              {mode.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
};