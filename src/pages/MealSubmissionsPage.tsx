import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Clock, Eye, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MealDetailsModal } from '../components/MealDetailsModal';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getAllMeals, reopenMealReview, updateMealApprovalStatus } from '../lib/supabaseQueries';
import type { Meal } from '../types';

export const MealSubmissionsPage = () => {
  useDocumentTitle('Meal Submissions');

  const [meals, setMeals] = useState<Meal[]>([]);
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectingMeal, setRejectingMeal] = useState<Meal | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewingMeal, setViewingMeal] = useState<Meal | null>(null);
  const [showMealDetails, setShowMealDetails] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadMealSubmissions();
  }, []);

  useEffect(() => {
    filterMeals();
  }, [meals, debouncedSearch, filter]);

  const loadMealSubmissions = async () => {
    setIsLoading(true);
    try {
      // Clear cache to get fresh data
      // invalidateCache('getAllMeals'); // Uncomment if cache issues persist
      
      const result = await getAllMeals();
      if (result.success && result.data) {
        // Only show meals created by cooks
        const cookMeals = result.data.filter(meal => meal.isbycook === true);
        console.log('Cook meals loaded:', cookMeals.map(m => ({
          id: m.meal_id,
          name: m.name,
          forreview: m.forreview,
          is_approved: m.is_approved,
          rejected: m.rejected
        })));
        setMeals(cookMeals);
      } else {
        toast.error(result.error || 'Failed to load meal submissions');
      }
    } catch (error) {
      toast.error('Error loading meal submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const filterMeals = () => {
    let filtered = meals;

    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(meal =>
        meal.name.toLowerCase().includes(searchLower) ||
        (meal.recipe && meal.recipe.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter
    switch (filter) {
      case 'pending':
        filtered = filtered.filter(meal => meal.forreview === true);
        break;
      case 'approved':
        filtered = filtered.filter(meal => meal.forreview === false && meal.is_approved === true);
        break;
      case 'rejected':
        filtered = filtered.filter(meal => meal.forreview === false && meal.is_approved === false && meal.rejected === true);
        break;
      case 'all':
      default:
        // Show all meals
        break;
    }

    setFilteredMeals(filtered);
  };

  const handleApproval = async (mealId: number) => {
    setActionLoading(mealId);
    try {
      const result = await updateMealApprovalStatus(mealId, true);
      if (result.success) {
        toast.success('Meal approved successfully');
        setMeals(prev => prev.map(meal => 
          meal.meal_id === mealId 
            ? { ...meal, forreview: false, is_approved: true, rejected: false, rejection_reason: undefined }
            : meal
        ));
      } else {
        toast.error(result.error || 'Failed to approve meal');
      }
    } catch (error) {
      toast.error('Error approving meal');
    } finally {
      setActionLoading(null);
    }
  };

  const submitRejection = async () => {
    if (!rejectingMeal) return;
    setActionLoading(rejectingMeal.meal_id);
    
    try {
      const result = await updateMealApprovalStatus(rejectingMeal.meal_id, false, rejectionReason);
      if (result.success) {
        toast.success(`"${rejectingMeal.name}" rejected`);
        setMeals(prev => prev.map(meal => 
          meal.meal_id === rejectingMeal.meal_id 
            ? { ...meal, forreview: false, is_approved: false, rejected: true, rejection_reason: rejectionReason }
            : meal
        ));
        setRejectingMeal(null);
        setRejectionReason('');
      } else {
        toast.error(result.error || 'Failed to reject meal');
      }
    } catch (error) {
      toast.error('Error rejecting meal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopen = async (meal: Meal) => {
    setActionLoading(meal.meal_id);
    try {
      const result = await reopenMealReview(meal.meal_id);
      if (result.success) {
        toast.success(`"${meal.name}" moved back to review`);
        setMeals(prev => prev.map(m => 
          m.meal_id === meal.meal_id 
            ? { ...m, forreview: true, is_approved: false, rejected: false, rejection_reason: undefined }
            : m
        ));
      } else {
        toast.error(result.error || 'Failed to reopen meal');
      }
    } catch (error) {
      toast.error('Error reopening meal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewMeal = (meal: Meal) => {
    setViewingMeal(meal);
    setShowMealDetails(true);
  };

  const handleCloseMealDetails = () => {
    setShowMealDetails(false);
    setViewingMeal(null);
  };

  const handleMealUpdated = () => {
    loadMealSubmissions();
  };

  const getStatusBadge = (meal: Meal) => {
    if (meal.forreview === true) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800 border border-pink-200">
          <Clock className="w-3 h-3 mr-1" />
          Pending Review
        </span>
      );
    } else if (meal.forreview === false && meal.is_approved === true) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
    } else if (meal.forreview === false && meal.is_approved === false && meal.rejected === true) {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return null;
  };

  const formatPrice = (price: number | undefined) => {
    if (price === null || price === undefined) return 'N/A';
    return `₱${price.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingCount = meals.filter(m => m.forreview === true).length;
  const approvedCount = meals.filter(m => m.forreview === false && m.is_approved === true).length;
  const rejectedCount = meals.filter(m => m.forreview === false && m.is_approved === false && m.rejected === true).length;

  return (
    <div className="min-h-screen animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Meal Submissions</CardTitle>
            <CardDescription>Review, approve, reject, or reopen cook meal submissions</CardDescription>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 py-1.5 px-3 rounded-md border">
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-gray-900">{meals.length}</span>
            <span className="text-gray-600">total</span>

            <Select value={filter} onValueChange={(value) => setFilter(value as 'pending' | 'approved' | 'rejected' | 'all')}>
              <SelectTrigger className="border rounded px-2 py-1 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
                <SelectItem value="approved">Approved ({approvedCount})</SelectItem>
                <SelectItem value="rejected">Rejected ({rejectedCount})</SelectItem>
                <SelectItem value="all">All ({meals.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <Card>
        <CardContent>
          <div className="mb-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative flex flex-col gap-1 md:col-span-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              <Input 
                placeholder="Search meals..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-10" 
              />
              {debouncedSearch && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="self-end h-7 px-2 -mt-1" 
                  onClick={() => setSearchTerm('')}
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              Showing {filteredMeals.length} of {meals.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm py-16 flex justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600"></div>
            <p className="text-sm text-gray-500">Loading meal submissions...</p>
          </div>
        </div>
      )}

      {/* Meals List */}
      {!isLoading && (
        <div className="space-y-6">
          {filteredMeals.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm text-center py-16">
              <div className="w-12 h-12 mx-auto text-gray-400 mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No meal submissions</h3>
              <p className="text-sm text-gray-500">
                {searchTerm || filter !== 'all'
                  ? 'No meals match your current filters.'
                  : 'Meal submissions awaiting review will appear here.'}
              </p>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-gray-100">
                {filteredMeals.map((meal) => (
                  <div key={meal.meal_id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {meal.image_url && (
                          <img
                            src={meal.image_url}
                            alt={meal.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-semibold text-gray-900">{meal.name}</h3>
                            {getStatusBadge(meal)}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-xl">
                            {meal.recipe ? meal.recipe.slice(0, 100) + '...' : 'No recipe provided.'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-medium text-gray-600">
                            <span className="px-2 py-1 rounded bg-gray-100 border">
                              Cook: {meal.profiles?.email?.split('@')[0] || 'Unknown'}
                            </span>
                            <span className="px-2 py-1 rounded bg-gray-100 border">
                              Category: {Array.isArray(meal.category) ? meal.category.join(', ') : meal.category}
                            </span>
                            <span className="px-2 py-1 rounded bg-gray-100 border">
                              Price: {formatPrice(meal.estimated_price)}
                            </span>
                            <span className="px-2 py-1 rounded bg-gray-100 border">
                              Submitted: {formatDate(meal.created_at)}
                            </span>
                            {meal.rejection_reason && (
                              <span className="px-2 py-1 rounded bg-red-100 border border-red-200 text-red-700">
                                Reason: {meal.rejection_reason}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Always show View button */}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewMeal(meal)}
                          disabled={actionLoading === meal.meal_id}
                          className="border-blue-600 text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>

                        {/* Quick action buttons for pending meals */}
                        {meal.forreview === true && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => handleApproval(meal.meal_id)}
                              disabled={actionLoading === meal.meal_id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setRejectingMeal(meal)}
                              disabled={actionLoading === meal.meal_id}
                              className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}

                        {/* Reopen button for approved/rejected meals */}
                        {(meal.forreview === false && (meal.is_approved === true || meal.rejected === true)) && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            disabled={actionLoading === meal.meal_id} 
                            onClick={() => handleReopen(meal)} 
                            className="border-blue-600 text-blue-700 hover:bg-blue-50"
                          >
                            Reopen
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Reject Dialog */}
      <AlertDialog open={!!rejectingMeal} onOpenChange={(open) => { 
        if (!open) { 
          setRejectingMeal(null); 
          setRejectionReason(''); 
        } 
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Meal Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for rejection. The cook will be able to resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Input 
              placeholder="Reason (required)" 
              value={rejectionReason} 
              onChange={e => setRejectionReason(e.target.value)} 
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading === rejectingMeal?.meal_id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              disabled={!rejectionReason || actionLoading === rejectingMeal?.meal_id} 
              onClick={submitRejection} 
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Meal Details Modal */}
      <MealDetailsModal
        isOpen={showMealDetails}
        onClose={handleCloseMealDetails}
        meal={viewingMeal}
        onMealUpdated={handleMealUpdated}
      />
    </div>
  );
};
