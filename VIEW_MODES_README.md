# Multi-View Mode System

This document describes the new multi-view mode system implemented for the meal listing pages.

## Overview

The meal listing now supports four different view modes to provide users with flexible ways to browse and interact with meal data:

1. **Grid View (Default)** - Standard grid with 3-4 cards per row
2. **List View** - Vertical stacked layout with detailed information
3. **Compact Grid** - Smaller cards with 5-6 per row for quick browsing
4. **Medium Grid** - Medium-sized cards with 2-4 per row

## Components

### ViewModeSelector

Located at: `src/components/ViewModeSelector.tsx`

A toggle component that allows users to switch between different view modes. Each mode has:
- A descriptive icon from Lucide React
- Hover tooltips with descriptions
- Active state styling
- Responsive labels (hidden on small screens)

**Props:**
- `currentMode: ViewMode` - The currently active view mode
- `onModeChange: (mode: ViewMode) => void` - Callback when mode changes

### MealGrid

Located at: `src/components/MealGrid.tsx`

A flexible grid component that renders meals in different layouts based on the selected view mode.

**Props:**
- `meals: Meal[]` - Array of meals to display
- `viewMode: ViewMode` - Current view mode
- `onEdit`, `onArchive`, `onRestore`, `onDuplicate` - Action callbacks
- `isArchived?: boolean` - Whether showing archived meals

**View Mode Classes:**
- `grid`: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6`
- `list`: `space-y-3`
- `compact`: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3`
- `medium`: `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`

### MealCardList

Located at: `src/components/MealCardList.tsx`

A specialized component for rendering meals in list view with horizontal layout and expanded information.

**Features:**
- Horizontal layout with thumbnail, content, and actions
- Shows more detailed information (ingredients count, dietary tags, etc.)
- Responsive design with proper text truncation
- Consistent action buttons with other views

### Enhanced MealCard

The existing `MealCard` component has been enhanced with size support:

**New Props:**
- `size?: 'compact' | 'medium' | 'default'` - Controls the card size and styling

**Size Variations:**
- **Compact**: Smaller image (32px), smaller text (xs), reduced padding
- **Medium**: Medium image (40px), medium text (sm), medium padding  
- **Default**: Full size (48px), normal text (sm/lg), full padding

## Usage

### In MealCurationPage

```tsx
import { ViewModeSelector } from '../components/ViewModeSelector';
import { MealGrid } from '../components/MealGrid';
import type { ViewMode } from '../components/ViewModeSelector';

// Add state
const [viewMode, setViewMode] = useState<ViewMode>('grid');

// Add selector (conditionally shown when there are meals)
{filteredMeals.length > 0 && (
  <div className="flex justify-end mb-6">
    <ViewModeSelector
      currentMode={viewMode}
      onModeChange={setViewMode}
    />
  </div>
)}

// Replace meal grid
<MealGrid
  meals={filteredMeals}
  viewMode={viewMode}
  onEdit={handleEditMeal}
  onArchive={handleArchiveMeal}
  onRestore={showArchived ? handleRestoreMeal : undefined}
  onDuplicate={!showArchived ? handleDuplicateMeal : undefined}
  isArchived={showArchived}
/>
```

## Responsive Behavior

- **Grid View**: Adapts from 1 column on mobile to 4 columns on large screens
- **List View**: Single column on all screen sizes with responsive padding
- **Compact Grid**: Ranges from 2 columns on mobile to 6 columns on extra large screens
- **Medium Grid**: Ranges from 1 column on mobile to 4 columns on large screens

## Accessibility

- All buttons have proper ARIA labels
- Keyboard navigation supported
- Screen reader friendly tooltips
- High contrast active states

## Browser Compatibility

- Uses modern CSS Grid and Flexbox
- Tailwind CSS utilities for consistent styling
- CSS line-clamp utility added for text truncation
- Compatible with all modern browsers

## Future Enhancements

Potential future improvements could include:

1. **User Preferences**: Save selected view mode to localStorage or user preferences
2. **Additional Views**: Table view, timeline view, or kanban-style view
3. **View-Specific Filters**: Different filter options per view mode
4. **Bulk Actions**: Multi-select capabilities in list view
5. **Sorting Options**: View-specific sorting preferences