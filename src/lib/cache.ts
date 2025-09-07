// Comprehensive caching utility for Supabase API calls
// Reduces API calls by caching responses with TTL and invalidation strategies

import { performanceMonitor } from './performance';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  defaultTTL: number; // Default TTL in milliseconds
  maxSize: number; // Maximum number of entries
  enableLocalStorage: boolean; // Whether to persist to localStorage
}

type CacheKey = string;

class ApiCache {
  private cache = new Map<CacheKey, CacheEntry<any>>();
  private config: CacheConfig;
  private storagePrefix = 'kusinaries_cache_';

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      enableLocalStorage: true,
      ...config
    };

    // Load from localStorage on initialization
    if (this.config.enableLocalStorage) {
      this.loadFromStorage();
    }

    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), 60 * 1000); // Every minute
  }

  // Generate a cache key from function name and parameters
  private generateKey(functionName: string, params: any[] = []): CacheKey {
    const paramString = params.length > 0 ? JSON.stringify(params) : '';
    return `${functionName}:${paramString}`;
  }

  // Get data from cache
  get<T>(functionName: string, params: any[] = []): T | null {
    const key = this.generateKey(functionName, params);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.removeFromStorage(key);
      return null;
    }

    // Record cache hit for performance monitoring
    performanceMonitor.recordCacheHit();
    return entry.data;
  }

  // Set data in cache
  set<T>(functionName: string, params: any[], data: T, customTTL?: number): void {
    const key = this.generateKey(functionName, params);
    const ttl = customTTL || this.config.defaultTTL;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    // Enforce max size
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.removeFromStorage(oldestKey);
      }
    }

    this.cache.set(key, entry);
    
    // Persist to localStorage
    if (this.config.enableLocalStorage) {
      this.saveToStorage(key, entry);
    }
  }

  // Invalidate specific cache entries
  invalidate(patterns: string[]): void {
    for (const pattern of patterns) {
      const keysToDelete: string[] = [];
      
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => {
        this.cache.delete(key);
        this.removeFromStorage(key);
      });
    }
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    if (this.config.enableLocalStorage) {
      this.clearStorage();
    }
  }

  // Clean up expired entries
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.removeFromStorage(key);
    });
  }

  // Load cache from localStorage
  private loadFromStorage(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.storagePrefix)
      );

      for (const storageKey of keys) {
        const cacheKey = storageKey.replace(this.storagePrefix, '');
        const entryData = localStorage.getItem(storageKey);
        
        if (entryData) {
          const entry: CacheEntry<any> = JSON.parse(entryData);
          
          // Check if still valid
          if (Date.now() <= entry.timestamp + entry.ttl) {
            this.cache.set(cacheKey, entry);
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  // Save entry to localStorage
  private saveToStorage(key: CacheKey, entry: CacheEntry<any>): void {
    try {
      localStorage.setItem(
        this.storagePrefix + key,
        JSON.stringify(entry)
      );
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  // Remove entry from localStorage
  private removeFromStorage(key: CacheKey): void {
    try {
      localStorage.removeItem(this.storagePrefix + key);
    } catch (error) {
      console.warn('Failed to remove cache from localStorage:', error);
    }
  }

  // Clear all cache from localStorage
  private clearStorage(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.storagePrefix)
      );
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear cache from localStorage:', error);
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        isExpired: Date.now() > entry.timestamp + entry.ttl
      }))
    };
  }
}

// Cache configurations for different types of data
const cacheConfigs = {
  // Static data that rarely changes
  static: {
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    maxSize: 50,
    enableLocalStorage: true
  },
  // Dynamic data that changes frequently
  dynamic: {
    defaultTTL: 2 * 60 * 1000, // 2 minutes
    maxSize: 100,
    enableLocalStorage: false
  },
  // User-specific data
  user: {
    defaultTTL: 10 * 60 * 1000, // 10 minutes
    maxSize: 30,
    enableLocalStorage: true
  }
};

// Create cache instances
export const staticCache = new ApiCache(cacheConfigs.static);
export const dynamicCache = new ApiCache(cacheConfigs.dynamic);
export const userCache = new ApiCache(cacheConfigs.user);

// Cache invalidation patterns for different operations
export const cacheInvalidationPatterns = {
  // Meal-related operations
  mealCreated: ['getAllMeals', 'getArchivedMeals', 'getDashboardStats'],
  mealUpdated: ['getAllMeals', 'getArchivedMeals', 'getMealById', 'getDashboardStats'],
  mealArchived: ['getAllMeals', 'getArchivedMeals', 'getDashboardStats'],
  mealRestored: ['getAllMeals', 'getArchivedMeals', 'getDashboardStats'],
  mealDeleted: ['getAllMeals', 'getArchivedMeals', 'getMealById', 'getDashboardStats'],

  // Ingredient-related operations
  ingredientCreated: ['getAllIngredients', 'getAllIngredientsForAdmin', 'getArchivedIngredients', 'getDashboardStats'],
  ingredientUpdated: ['getAllIngredients', 'getAllIngredientsForAdmin', 'getArchivedIngredients', 'getDashboardStats'],
  ingredientArchived: ['getAllIngredients', 'getAllIngredientsForAdmin', 'getArchivedIngredients', 'getDashboardStats'],
  ingredientRestored: ['getAllIngredients', 'getAllIngredientsForAdmin', 'getArchivedIngredients', 'getDashboardStats'],

  // User-related operations
  userCreated: ['fetchUsers', 'fetchUsersFromProfiles', 'getDashboardStats'],
  userUpdated: ['fetchUsers', 'fetchUsersFromProfiles', 'getCurrentUserRole', 'isCurrentUserAdmin'],
  userRoleChanged: ['fetchUsers', 'fetchUsersFromProfiles', 'getCurrentUserRole', 'isCurrentUserAdmin'],

  // Dietary tag operations
  dietaryTagCreated: ['getAllDietaryTags'],
  dietaryTagUpdated: ['getAllDietaryTags'],
  dietaryTagDisabled: ['getAllDietaryTags'],

  // Activity log operations
  activityLogged: ['getActivityLogs', 'getRecentActivities', 'getDashboardStats']
};

// Utility function to invalidate cache based on operation
export const invalidateCache = (operation: keyof typeof cacheInvalidationPatterns) => {
  const patterns = cacheInvalidationPatterns[operation];
  if (patterns) {
    staticCache.invalidate(patterns);
    dynamicCache.invalidate(patterns);
    userCache.invalidate(patterns);
  }
};

// Wrapper function to add caching to any async function
export const withCache = <T extends any[], R>(
  cache: ApiCache,
  functionName: string,
  fn: (...args: T) => Promise<R>,
  customTTL?: number
) => {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    
    // Try to get from cache first
    const cached = cache.get<R>(functionName, args);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, execute function
    const result = await fn(...args);
    const responseTime = Date.now() - startTime;
    
    // Record cache miss for performance monitoring
    performanceMonitor.recordCacheMiss(responseTime);
    
    // Cache the result if it's successful
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      cache.set(functionName, args, result, customTTL);
    }

    return result;
  };
};

export default { staticCache, dynamicCache, userCache, invalidateCache, withCache };
