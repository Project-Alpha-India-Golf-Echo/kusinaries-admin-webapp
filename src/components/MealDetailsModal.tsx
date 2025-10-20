import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Clock, Eye, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { reopenMealReview, updateMealApprovalStatus } from '../lib/supabaseQueries';
import type { Meal } from '../types';

interface MealDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  meal: Meal | null;
  onMealUpdated: () => void;
}

export const MealDetailsModal: React.FC<MealDetailsModalProps> = ({
  isOpen,
  onClose,
  meal,
  onMealUpdated
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApproval = async () => {
    if (!meal) return;
    setActionLoading(true);
    try {
      const result = await updateMealApprovalStatus(meal.meal_id, true);
      if (result.success) {
        toast.success('Meal approved successfully');
        onMealUpdated();
        onClose();
      } else {
        toast.error(result.error || 'Failed to approve meal');
      }
    } catch (error) {
      toast.error('Error approving meal');
    } finally {
      setActionLoading(false);
    }
  };

  const submitRejection = async () => {
    if (!meal) return;
    setActionLoading(true);
    try {
      const result = await updateMealApprovalStatus(meal.meal_id, false, rejectionReason);
      if (result.success) {
        toast.success(`"${meal.name}" rejected`);
        onMealUpdated();
        setShowRejectDialog(false);
        setRejectionReason('');
        onClose();
      } else {
        toast.error(result.error || 'Failed to reject meal');
      }
    } catch (error) {
      toast.error('Error rejecting meal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!meal) return;
    setActionLoading(true);
    try {
      const result = await reopenMealReview(meal.meal_id);
      if (result.success) {
        toast.success(`"${meal.name}" moved back to review`);
        onMealUpdated();
        onClose();
      } else {
        toast.error(result.error || 'Failed to reopen meal');
      }
    } catch (error) {
      toast.error('Error reopening meal');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (meal: Meal) => {
    if (meal.forreview && !meal.rejected) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800 border border-pink-200">
          <Clock className="w-3 h-3 mr-1" />
          Pending Review
        </span>
      );
    } else if (!meal.forreview && !meal.rejected) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
    } else if (meal.rejected) {
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

  if (!isOpen || !meal) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-white to-gray-50">
            <div className="flex items-center space-x-3">
              <Eye className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Meal Details</h3>
              {getStatusBadge(meal)}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Name:</span> {meal.name}</div>
                    <div><span className="font-medium">Category:</span> {Array.isArray(meal.category) ? meal.category.join(', ') : meal.category}</div>
                    <div><span className="font-medium">Cook:</span> {meal.profiles?.email?.split('@')[0] || 'Unknown'}</div>
                    <div><span className="font-medium">Submitted:</span> {formatDate(meal.created_at)}</div>
                    {meal.estimated_price !== null && meal.estimated_price !== undefined && (
                      <div><span className="font-medium">Estimated Price:</span> {formatPrice(meal.estimated_price)}</div>
                    )}
                    {meal.rejection_reason && (
                      <div className="mt-2">
                        <span className="font-medium text-red-700">Rejection Reason:</span>
                        <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                          {meal.rejection_reason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recipe */}
                {meal.recipe && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Recipe Instructions</h4>
                    <div className="bg-gray-50 p-3 rounded-lg text-xs leading-relaxed max-h-32 overflow-y-auto">
                      {meal.recipe}
                    </div>
                  </div>
                )}

                {/* Dietary Tags */}
                {meal.dietary_tags && meal.dietary_tags.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Dietary Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {meal.dietary_tags.map((tag) => (
                        <span key={tag.tag_id} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {tag.tag_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Image */}
              <div>
                {meal.image_url ? (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Meal Image</h4>
                    <img 
                      src={meal.signed_image_url || meal.image_url} 
                      alt={meal.name}
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  </div>
                ) : (
                  <div className="bg-gray-100 h-48 rounded-lg flex items-center justify-center text-gray-500">
                    No image provided
                  </div>
                )}
              </div>
            </div>

            {/* Ingredients */}
            {meal.meal_ingredients && meal.meal_ingredients.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Ingredients ({meal.meal_ingredients.length})</h4>
                <div className="grid md:grid-cols-2 gap-2">
                  {meal.meal_ingredients.map((mealIngredient, index) => {
                    const ingredient = mealIngredient.ingredient || (mealIngredient as any).ingredients;
                    return (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                        <span className="font-medium">{ingredient?.name || 'Unknown Ingredient'}</span>
                        <span className="text-gray-600">{mealIngredient.quantity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Condiments */}
            {meal.meal_condiments && meal.meal_condiments.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Condiments ({meal.meal_condiments.length})</h4>
                <div className="grid md:grid-cols-2 gap-2">
                  {meal.meal_condiments.map((mealCondiment, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                      <span className="font-medium">{mealCondiment.condiment?.name || 'Unknown Condiment'}</span>
                      <span className="text-gray-600">{mealCondiment.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer with Action Buttons */}
          <div className="px-6 py-4 border-t bg-white flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={actionLoading}
            >
              Close
            </Button>
            
            {meal.forreview && !meal.rejected && (
              <>
                <Button
                  onClick={handleApproval}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={actionLoading}
                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}

            {(!meal.forreview || meal.rejected) && (
              <Button
                variant="outline"
                onClick={handleReopen}
                disabled={actionLoading}
                className="flex-1 border-blue-600 text-blue-700 hover:bg-blue-50"
              >
                Reopen for Review
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={(open) => { 
        if (!open) { 
          setShowRejectDialog(false); 
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
            <AlertDialogCancel disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              disabled={!rejectionReason || actionLoading} 
              onClick={submitRejection} 
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
