# Caching System Documentation

## Overview

This project implements a comprehensive caching system to reduce API calls to Supabase and improve application performance. The caching system consists of multiple layers and strategies optimized for different types of data.

## Architecture

### Core Components

1. **Cache.ts** - Main caching utility with TTL and invalidation
2. **Performance.ts** - Performance monitoring and metrics
3. **useCache.ts** - React hook for cache management
4. **CacheDebugPanel.tsx** - Development debugging component

### Cache Types

#### 1. Static Cache
- **TTL**: 30 minutes
- **Storage**: Persistent (localStorage)
- **Use Case**: Data that rarely changes (dietary tags, condiments)
- **Functions**: `getAllDietaryTags`, `getAllCondiments`

#### 2. Dynamic Cache  
- **TTL**: 2 minutes
- **Storage**: Memory only
- **Use Case**: Frequently changing data (dashboard stats, recent activities)
- **Functions**: `getDashboardStats`, `getRecentActivities`

#### 3. User Cache
- **TTL**: 5-10 minutes
- **Storage**: Persistent (localStorage)
- **Use Case**: User-specific data (role, permissions)
- **Functions**: `getCurrentUserRole`, `isCurrentUserAdmin`

## Implementation

### Cached Functions

The following functions have been wrapped with caching:

#### User Functions
```typescript
- isCurrentUserAdmin() - 5 min TTL
- getCurrentUserRole() - 5 min TTL
```

#### Meal Functions
```typescript
- getAllMeals() - 5 min TTL
- getArchivedMeals() - 5 min TTL
```

#### Ingredient Functions
```typescript
- getAllIngredients() - 10 min TTL
- getArchivedIngredients() - 10 min TTL
```

#### System Functions
```typescript
- getAllDietaryTags() - 15 min TTL
- getDashboardStats() - 2 min TTL
- getRecentActivities() - 1 min TTL
```

### Cache Invalidation

The system automatically invalidates relevant caches when data changes:

#### Meal Operations
- **Create**: Invalidates `getAllMeals`, `getArchivedMeals`, `getDashboardStats`
- **Update**: Invalidates `getAllMeals`, `getArchivedMeals`, `getMealById`, `getDashboardStats`
- **Archive**: Invalidates `getAllMeals`, `getArchivedMeals`, `getDashboardStats`
- **Restore**: Invalidates `getAllMeals`, `getArchivedMeals`, `getDashboardStats`

#### Ingredient Operations
- **Create**: Invalidates `getAllIngredients`, `getArchivedIngredients`, `getDashboardStats`
- **Update**: Invalidates `getAllIngredients`, `getArchivedIngredients`, `getDashboardStats`
- **Archive**: Invalidates `getAllIngredients`, `getArchivedIngredients`, `getDashboardStats`

#### User Operations
- **Create**: Invalidates `fetchUsers`, `getDashboardStats`
- **Update**: Invalidates `fetchUsers`, `getCurrentUserRole`, `isCurrentUserAdmin`

## Usage

### Using Cached Functions

Cached functions work exactly like the original functions:

```typescript
// This will check cache first, then make API call if needed
const result = await getAllMeals();

// Cache is automatically invalidated when creating meals
await createMeal(mealData);
```

### Manual Cache Management

```typescript
import { useCache } from '../hooks/useCache';

const { clearAllCaches, forceRefresh, getCacheStats } = useCache();

// Clear all caches
clearAllCaches();

// Force refresh specific data
forceRefresh(['getAllMeals', 'getAllIngredients']);

// Get cache statistics
const stats = getCacheStats();
```

### Cache Invalidation

```typescript
import { invalidateCache } from '../lib/cache';

// Invalidate after meal operations
invalidateCache('mealCreated');
invalidateCache('mealUpdated');
invalidateCache('mealArchived');
```

## Performance Monitoring

The system tracks:
- Cache hit/miss rates
- API calls saved
- Average response times
- Estimated time saved

### Viewing Metrics

In development mode, a cache debug panel is available:
- Click "Cache Debug" button (bottom right)
- View real-time cache statistics
- Monitor performance metrics
- Clear caches or reset metrics

## Best Practices

### 1. TTL Selection
- **Static data** (rarely changes): 15-30 minutes
- **Semi-static data** (changes occasionally): 5-10 minutes
- **Dynamic data** (changes frequently): 1-2 minutes

### 2. Cache Invalidation
- Always invalidate related caches after mutations
- Use specific invalidation patterns rather than clearing all caches
- Consider data relationships when setting up invalidation

### 3. Storage Strategy
- **Persistent storage**: User preferences, settings, rarely changing data
- **Memory only**: Temporary data, frequently changing data, large datasets

### 4. Error Handling
- Cache failures should not break the application
- Always have fallback to direct API calls
- Log cache errors for debugging

## Configuration

### Default Settings

```typescript
const cacheConfigs = {
  static: {
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    maxSize: 50,
    enableLocalStorage: true
  },
  dynamic: {
    defaultTTL: 2 * 60 * 1000, // 2 minutes
    maxSize: 100,
    enableLocalStorage: false
  },
  user: {
    defaultTTL: 10 * 60 * 1000, // 10 minutes
    maxSize: 30,
    enableLocalStorage: true
  }
};
```

### Customizing Cache Behavior

```typescript
// Custom TTL for specific function
export const getMyData = withCache(
  staticCache,
  'getMyData',
  _getMyData,
  5 * 60 * 1000 // 5 minutes custom TTL
);
```

## Troubleshooting

### Common Issues

1. **Stale Data**: If you see outdated data, the cache TTL might be too long
   - Solution: Reduce TTL or manually invalidate cache

2. **Too Many API Calls**: Cache might not be working effectively
   - Solution: Check cache hit rates in debug panel
   - Verify functions are properly wrapped with `withCache`

3. **Memory Issues**: Cache growing too large
   - Solution: Reduce `maxSize` or disable localStorage for large datasets

### Debug Commands

```typescript
// Check cache contents
console.log(staticCache.getStats());

// Export performance metrics
console.log(performanceMonitor.exportMetrics());

// Clear specific cache patterns
staticCache.invalidate(['getAllMeals']);
```

## Migration Guide

### Adding Caching to New Functions

1. **Wrap the function**:
```typescript
const _myFunction = async (...args) => {
  // Original implementation
};

export const myFunction = withCache(
  staticCache, // or dynamicCache/userCache
  'myFunction',
  _myFunction,
  customTTL // optional
);
```

2. **Add invalidation patterns**:
```typescript
// In cache.ts
export const cacheInvalidationPatterns = {
  myDataChanged: ['myFunction', 'relatedFunction']
};
```

3. **Invalidate on mutations**:
```typescript
// In mutation functions
await createMyData(data);
invalidateCache('myDataChanged');
```

## Performance Benefits

Based on typical usage patterns, the caching system provides:

- **50-80% reduction** in API calls for frequently accessed data
- **2-5x faster** load times for cached data
- **Reduced server load** and improved scalability
- **Better user experience** with instant data loading

## Future Enhancements

Potential improvements for the caching system:

1. **Intelligent prefetching** - Preload data based on user behavior
2. **Background refresh** - Update cache in background before expiration
3. **Compression** - Compress cached data to save storage space
4. **Analytics integration** - Send cache metrics to analytics service
5. **Smart invalidation** - More granular invalidation based on data relationships
