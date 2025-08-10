
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useModal } from '@/contexts/ModalContext';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { approveCook, getCooksByStatus, rejectCook, reopenCookReview } from '../lib/supabaseQueries';
import type { Cook } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const GrantPage = () => {
  useDocumentTitle('Cook Verification');

  const [cooks, setCooks] = useState<Cook[]>([]);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingCook, setRejectingCook] = useState<Cook | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const { openCookDetails } = useModal();
  const PAGE_SIZE = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Initial + search load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setPage(1);
      const res = await getCooksByStatus({ status, search: debouncedSearch, page: 1, pageSize: PAGE_SIZE });
      if (res.success) {
        setCooks(res.data || []);
        setHasMore(!!res.hasMore);
        if (typeof res.total === 'number') setTotal(res.total);
      } else {
        toast.error(res.error || 'Failed to load cooks');
      }
      setLoading(false);
    };
    load();
  }, [debouncedSearch, status]);

  // Pagination load
  useEffect(() => {
    if (page === 1) return;
    (async () => {
      const res = await getCooksByStatus({ status, search: debouncedSearch, page, pageSize: PAGE_SIZE });
      if (res.success) {
        setCooks(prev => [...prev, ...(res.data || [])]);
        setHasMore(!!res.hasMore);
      }
    })();
  }, [page, status]);

  const loadMore = () => { if (!loading && hasMore) setPage(p => p + 1); };

  const handleApprove = async (cook: Cook) => {
    setActionLoading(cook.id);
    const res = await approveCook(cook.id);
    if (res.success) {
      toast.success(`${cook.username || 'Cook'} approved`);
      setCooks(prev => prev.map(c => c.id === cook.id ? { ...c, is_verified: true, is_rejected: false, for_review: true } : c));
    } else toast.error(res.error || 'Failed to approve');
    setActionLoading(null);
  };

  const submitRejection = async () => {
    if (!rejectingCook) return;
    setActionLoading(rejectingCook.id);
    const res = await rejectCook(rejectingCook.id, rejectionReason || 'Not specified');
    if (res.success) {
      toast.success(`${rejectingCook.username || 'Cook'} rejected`);
      setCooks(prev => prev.map(c => c.id === rejectingCook.id ? { ...c, is_verified: false, is_rejected: true, for_review: true } : c));
      setRejectingCook(null);
      setRejectionReason('');
    } else toast.error(res.error || 'Failed to reject');
    setActionLoading(null);
  };

  const handleReopen = async (cook: Cook) => {
    setActionLoading(cook.id);
    const res = await reopenCookReview(cook.id);
    if (res.success) {
      toast.success(`${cook.username || 'Cook'} moved back to review`);
      setCooks(prev => prev.map(c => c.id === cook.id ? { ...c, for_review: true, is_verified: false, is_rejected: false } : c));
    } else toast.error(res.error || 'Failed to reopen');
    setActionLoading(null);
  };

  return (
    <div className="min-h-screen animate-in fade-in duration-500 space-y-6">
      <Card>

        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Cook Verification</CardTitle>
            <CardDescription>Review, approve, reject, or reopen cook applications</CardDescription>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 py-1.5 px-3 rounded-md border">
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
            <span className="font-semibold text-gray-900">{total}</span>
            <span className="text-gray-600">total</span>

            <Select value={status} onValueChange={(value) => setStatus(value as 'pending' | 'approved' | 'rejected' | 'all')}>
              <SelectTrigger className="border rounded px-2 py-1 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardContent>
          {/* Filters */}
          <div className="mb-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative flex flex-col gap-1 md:col-span-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18.5a7.5 7.5 0 006.15-3.85z" /></svg>
              </div>
              <Input placeholder="Search name, specialty, location..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              {debouncedSearch && <Button variant="ghost" size="sm" className="self-end h-7 px-2 -mt-1" onClick={() => setSearch('')}>Clear</Button>}
            </div>
            <div className="text-xs text-gray-500 flex items-center">Showing {cooks.length} of {total}</div>

          </div>
        </CardContent>
      </Card>

      {/* (Duplicate filter block removed – filters now inside header Card) */}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm py-16 flex justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600"></div>
            <p className="text-sm text-gray-500">Loading applications...</p>
          </div>
        </div>
      )}

      {/* List */}
      {!loading && (
        <div className="space-y-6">
          {cooks.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm text-center py-16">
              <div className="w-12 h-12 mx-auto text-gray-400 mb-4"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg></div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No pending applications</h3>
              <p className="text-sm text-gray-500">Cook applications awaiting review will appear here.</p>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-gray-100">
                {cooks.map(cook => (
                  <div key={cook.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 border border-pink-300 flex items-center justify-center text-pink-700 font-semibold text-sm">
                          {(cook.username || '??').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-semibold text-gray-900">{cook.username || 'Unnamed Cook'}</h3>
                            {cook.for_review && !cook.is_verified && !cook.is_rejected && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800 border border-pink-200">Pending Review</span>
                            )}
                            {cook.for_review && cook.is_verified && !cook.is_rejected && (
                              <Badge variant="success">Approved</Badge>
                            )}
                            {cook.for_review && cook.is_rejected && (
                              <Badge variant="destructive">Rejected</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-xl">{cook.home_address || 'No address provided.'}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-medium text-gray-600">
                            {cook.cook_type && <span className="px-2 py-1 rounded bg-gray-100 border">Type: {cook.cook_type}</span>}
                            {cook.gender && <span className="px-2 py-1 rounded bg-gray-100 border">Gender: {cook.gender}</span>}
                            {cook.available_days && cook.available_days.length > 0 && <span className="px-2 py-1 rounded bg-gray-100 border">Days: {cook.available_days.join(', ')}</span>}
                            {cook.available_times && cook.available_times.length > 0 && <span className="px-2 py-1 rounded bg-gray-100 border">Times: {cook.available_times.join(', ')}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="secondary" onClick={() => openCookDetails(cook)} className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">Review</Button>
                        {(cook.for_review && (cook.is_verified || cook.is_rejected)) && (
                          <Button size="sm" variant="outline" disabled={actionLoading === cook.id} onClick={() => handleReopen(cook)} className="border-blue-600 text-blue-700 hover:bg-blue-50">Reopen</Button>
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

      {/* Load More */}
      {!loading && hasMore && (
        <div className="flex justify-center mt-6">
          <Button onClick={loadMore} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">Load more</Button>
        </div>
      )}

      {/* Reject Dialog */}
      <AlertDialog open={!!rejectingCook} onOpenChange={(open) => { if (!open) { setRejectingCook(null); setRejectionReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Cook Application</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for rejection. The cook will be able to reapply.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Input placeholder="Reason (required)" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading === rejectingCook?.id}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!rejectionReason || actionLoading === rejectingCook?.id} onClick={submitRejection} className="bg-red-600 hover:bg-red-700">Reject</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cook details modal is mounted globally in App */}
    </div>
  );
};
