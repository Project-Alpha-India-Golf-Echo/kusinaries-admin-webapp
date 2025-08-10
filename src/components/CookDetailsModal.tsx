import { supabase } from '@/lib/supabase';
import { approveCook, rejectCook } from '@/lib/supabaseQueries';
import type { Cook } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Button } from './ui/button';

interface CookDetailsModalProps {
  cook: Cook | null;
  open: boolean;
  onClose: () => void;
}

// Simple utility to format arrays
const list = (arr?: string[] | null) => (arr && arr.length ? arr.join(', ') : '—');

export const CookDetailsModal = ({ cook, open, onClose }: CookDetailsModalProps) => {
  const [consentNeeded, setConsentNeeded] = useState(true);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [viewGranted, setViewGranted] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [certificateImages, setCertificateImages] = useState<{ key: string; url: string }[]>([]);
  const [kitchenImages, setKitchenImages] = useState<{ key: string; url: string }[]>([]);
  const [expanded, setExpanded] = useState<{ [k: string]: boolean }>({ profile: true, availability: true, documents: true });
  const [activeImage, setActiveImage] = useState<{ key: string; url: string; group: 'cert' | 'kitchen'; index: number } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  // Recursive lister adapted from cook app (depth-limited)
  const listAllFiles = useCallback(async (prefix: string, depth = 4): Promise<string[]> => {
    if (!prefix || depth <= 0) return [];
    try {
      const { data: entries, error } = await supabase.storage
        .from('images')
        .list(prefix, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
      if (error || !entries || entries.length === 0) return [];
      const keys: string[] = [];
      for (const item of entries) {
        const name = item.name;
        const path = `${prefix}/${name}`;
        const isImage = /\.(png|jpg|jpeg|gif|webp|heic|heif)$/i.test(name);
        if (isImage) {
          keys.push(path);
          continue;
        }
        const probe = await supabase.storage.from('images').list(path, { limit: 1 });
        if (!probe.error && probe.data && probe.data.length > 0) {
          const nested = await listAllFiles(path, depth - 1);
          keys.push(...nested);
        } else {
          // unknown file (maybe missing extension) - include
          keys.push(path);
        }
      }
      return keys;
    } catch {
      return [];
    }
  }, []);

  const loadImages = useCallback(async () => {
    if (!cook?.profile_id) return;
    setLoadingImages(true);
    setImagesError(null);
    setCertificateImages([]);
    setKitchenImages([]);
    try {
      // List only the specific subfolders to reduce noise if they exist
      const certPrefix = `${cook.profile_id}/certificates`;
      const kitchenPrefix = `${cook.profile_id}/kitchen`;

      const [certKeys, kitchenKeys] = await Promise.all([
        listAllFiles(certPrefix, 2),
        listAllFiles(kitchenPrefix, 2)
      ]);

      const allKeys = [...certKeys, ...kitchenKeys];
      if (allKeys.length === 0) {
        setLoadingImages(false);
        return;
      }
      const { data: signed, error: signErr } = await supabase.storage.from('images').createSignedUrls(allKeys, 600); // 10 min
      if (signErr) {
        setImagesError(signErr.message);
      } else if (signed) {
        const certItems: { key: string; url: string }[] = [];
        const kitItems: { key: string; url: string }[] = [];
        signed.forEach((s, idx) => {
          if (!s?.signedUrl) return;
            const key = allKeys[idx];
            if (key.includes('/certificates/')) certItems.push({ key, url: s.signedUrl });
            else if (key.includes('/kitchen/')) kitItems.push({ key, url: s.signedUrl });
        });
        setCertificateImages(certItems);
        setKitchenImages(kitItems);
      }
    } catch (e: any) {
      setImagesError(e?.message || 'Failed to load images');
    } finally {
      setLoadingImages(false);
    }
  }, [cook?.profile_id, listAllFiles]);

  useEffect(() => {
    if (open) {
      setConsentNeeded(true);
      setViewGranted(false);
      setCertificateImages([]);
      setKitchenImages([]);
  setImagesError(null);
  setExpanded({ profile: true, availability: true, documents: true });
    }
  }, [open, cook?.id]);

  // When consent granted, fetch images
  useEffect(() => {
    if (viewGranted && open) {
      loadImages();
    }
  }, [viewGranted, open, loadImages]);

  // Keyboard close / escape & focus return (must run every render regardless of cook to preserve hook order)
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeImage) {
          setActiveImage(null);
        } else {
          onClose();
        }
      }
      if (activeImage && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const imgs = activeImage.group === 'cert' ? certificateImages : kitchenImages;
        if (!imgs.length) return;
        let newIndex = activeImage.index + (e.key === 'ArrowRight' ? 1 : -1);
        if (newIndex < 0) newIndex = imgs.length - 1;
        if (newIndex >= imgs.length) newIndex = 0;
        setActiveImage({ ...imgs[newIndex], group: activeImage.group, index: newIndex });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, activeImage, certificateImages, kitchenImages, onClose]);

  if (!cook) return null; // after hook definitions to avoid hook order mismatch when cook is initially null

  const blurred = consentNeeded && !viewGranted;

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const copyId = async () => {
    if (!cook?.id) return;
    try {
      await navigator.clipboard.writeText(cook.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label="Cook application details"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-start justify-center py-10 px-4 overflow-hidden">
        <div className={`relative w-full max-w-4xl bg-white rounded-xl shadow-xl border border-gray-200 transition-all duration-300 ${open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} focus:outline-none flex flex-col max-h-[min(90vh,1000px)]`}>
          <div className="sticky top-0 rounded-lg flex items-start justify-between gap-4 p-6 pb-4 border-b bg-white/90 backdrop-blur z-10">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600  text-white text-xs">👨‍🍳</span>
                Cook Application Details
              </h2>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <button onClick={copyId} className="group inline-flex items-center gap-1 hover:text-gray-700 transition" aria-label="Copy Cook ID">
                  ID: <span className="font-mono text-gray-800 group-hover:underline" data-testid="cook-id">{cook.id}</span>
                  <span className="text-[10px] px-1 py-0.5 border rounded bg-gray-50">{copied ? 'Copied' : 'Copy'}</span>
                </button>
                {viewGranted && (
                  <span className="inline-flex items-center gap-1 text-green-600" title="Images unlocked">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Access Granted
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {viewGranted && (
                <Button size="sm" variant="outline" onClick={loadImages} disabled={loadingImages} title="Refresh signed image URLs">
                  {loadingImages ? 'Refreshing…' : 'Refresh Images'}
                </Button>
              )}
              <Button ref={closeButtonRef} variant="ghost" size="sm" onClick={onClose} aria-label="Close details modal">✕</Button>
            </div>
          </div>
          <div className="p-6 space-y-8 pb-8 flex-1 overflow-y-auto">            
            {/* Consent Banner */}
            {blurred && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-sm text-amber-800 flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10A8 8 0 11.001 9.999 8 8 0 0118 10zM9 9V5a1 1 0 112 0v4a1 1 0 01-.293.707L9.414 12H11a1 1 0 110 2H7a1 1 0 01-.707-1.707L9 9.586V9z" clipRule="evenodd" /></svg>
                  <span>Images & sensitive details are blurred until you confirm you will not copy, share, or tamper with this applicant's information.</span>
                </div>
                <Button size="sm" onClick={() => setShowConsentDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">I Understand</Button>
              </div>
            )}
            {/* Sections */}
            <section className="space-y-2">
              <button onClick={() => toggle('profile')} className="w-full flex items-center justify-between text-left group">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-pink-100 text-pink-700 text-xs font-medium">1</span>
                  Profile
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500">Basic</span>
                </h3>
                <span className="text-xs text-gray-500 group-hover:text-gray-700 transition">{expanded.profile ? 'Hide' : 'Show'}</span>
              </button>
              {expanded.profile && (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-sm ${blurred ? 'blur-sm select-none pointer-events-none' : ''}`} aria-hidden={blurred}>
                  <div className="space-y-1">
                    <p className="text-gray-500">Username</p>
                    <p className="font-medium text-gray-900">{cook.username || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500">Cook Type</p>
                    <p className="font-medium text-gray-900">{cook.cook_type || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500">Gender</p>
                    <p className="font-medium text-gray-900">{cook.gender || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500">Contact</p>
                    <p className="font-medium text-gray-900">{cook.contact_number || '—'}</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-gray-500">Home Address</p>
                    <p className="font-medium text-gray-900 break-words">{cook.home_address || '—'}</p>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-2">
              <button onClick={() => toggle('availability')} className="w-full flex items-center justify-between text-left group">
                <h3 className="text-sm font-semibold text-gray-700 mb-0 flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-pink-100 text-pink-700 text-xs font-medium">2</span>
                  Availability & Experience
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500">Schedule</span>
                </h3>
                <span className="text-xs text-gray-500 group-hover:text-gray-700 transition">{expanded.availability ? 'Hide' : 'Show'}</span>
              </button>
              {expanded.availability && (
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 text-sm ${blurred ? 'blur-sm select-none pointer-events-none' : ''}`} aria-hidden={blurred}>
                  <div className="space-y-1">
                    <p className="text-gray-500">Available Days</p>
                    <p className="font-medium text-gray-900">{list(cook.available_days)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500">Available Times</p>
                    <p className="font-medium text-gray-900">{list(cook.available_times)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500">Wears PPE</p>
                    <p className="font-medium text-gray-900">{cook.wears_ppe === null || cook.wears_ppe === undefined ? '—' : cook.wears_ppe ? 'Yes' : 'No'}</p>
                  </div>
                  {cook.not_wearing_ppe_reason && (
                    <div className="space-y-1 md:col-span-3">
                      <p className="text-gray-500">PPE Reason</p>
                      <p className="font-medium text-gray-900 break-words">{cook.not_wearing_ppe_reason}</p>
                    </div>
                  )}
                  {cook.learn_to_cook && (
                    <div className="space-y-1 md:col-span-3">
                      <p className="text-gray-500">Learned To Cook</p>
                      <p className="font-medium text-gray-900 break-words">{cook.learn_to_cook.join(', ')}</p>
                    </div>
                  )}
                  {cook.learn_to_cook_other && (
                    <div className="space-y-1 md:col-span-3">
                      <p className="text-gray-500">Other Learning</p>
                      <p className="font-medium text-gray-900 break-words">{cook.learn_to_cook_other}</p>
                    </div>
                  )}
                  {cook.experience && (
                    <div className="space-y-3 md:col-span-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-gray-500 flex items-center gap-2">
                          <span>Experience</span>
                          {Array.isArray(cook.experience) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                              {cook.experience.length} roles
                            </span>
                          )}
                          {Array.isArray(cook.experience) && cook.experience.some((e: any) => typeof e?.yearsOfExperience === 'number') && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                              {cook.experience.reduce((acc: number, cur: any) => acc + (typeof cur?.yearsOfExperience === 'number' ? cur.yearsOfExperience : 0), 0)} yrs total
                            </span>
                          )}
                        </p>
                      </div>

                      {Array.isArray(cook.experience) ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {cook.experience.map((exp: any, idx: number) => {
                            const title = exp?.jobTitle || exp?.title || 'Role';
                            const company = exp?.companyName || exp?.company || exp?.organization;
                            const years = typeof exp?.yearsOfExperience === 'number' ? exp.yearsOfExperience : exp?.years;
                            const desc = exp?.description || exp?.summary;
                            return (
                              <div
                                key={idx}
                                className="relative rounded-lg border bg-white/60 backdrop-blur-sm p-3 text-xs shadow-sm hover:shadow transition flex flex-col gap-1"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-800 truncate" title={title}>{title}</p>
                                    {company && <p className="text-[10px] text-gray-500 truncate" title={company}>{company}</p>}
                                  </div>
                                  {years !== undefined && (
                                    <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] font-medium">{years}y</span>
                                  )}
                                </div>
                                {desc && <p className="text-[10px] text-gray-600 line-clamp-3 leading-snug">{desc}</p>}
                                {/* Additional generic key-values for unknown fields */}
                                <div className="mt-1 space-y-0.5">
                                  {Object.entries(exp || {}).filter(([k]) => !['jobTitle','title','companyName','company','organization','yearsOfExperience','years','description','summary'].includes(k)).slice(0,4).map(([k,v]) => (
                                    <p key={k} className="text-[10px] text-gray-500 truncate"><span className="font-medium text-gray-600">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          {Object.entries(cook.experience as any).map(([k,v]) => (
                            <div key={k} className="rounded border p-3 bg-white/60 backdrop-blur-sm">
                              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">{k}</p>
                              <p className="text-gray-800 break-words text-[11px]">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <button onClick={() => toggle('documents')} className="w-full flex items-center justify-between text-left group">
                <h3 className="text-sm font-semibold text-gray-700 mb-0 flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-pink-100 text-pink-700 text-xs font-medium">3</span>
                  Documents & Images
                  {viewGranted && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                      {certificateImages.length + kitchenImages.length} files
                    </span>
                  )}
                </h3>
                <span className="text-xs text-gray-500 group-hover:text-gray-700 transition">{expanded.documents ? 'Hide' : 'Show'}</span>
              </button>
              {expanded.documents && (
                <div>
                  {!viewGranted && (
                    <p className="text-xs text-gray-500 mb-4">Grant view to load and display certificate & kitchen images.</p>
                  )}
                  {viewGranted && (
                    <div className={`space-y-8 ${blurred ? 'blur-sm select-none pointer-events-none' : ''}`} aria-hidden={blurred}>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">Certificates {certificateImages.length > 0 && <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-gray-100 text-gray-600">{certificateImages.length}</span>}</h4>
                          {imagesError && certificateImages.length === 0 && (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={loadImages}>Retry</Button>
                          )}
                        </div>
                        {loadingImages && certificateImages.length === 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4" aria-label="Loading certificate images">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className="h-40 rounded-lg border bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                                <div className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.6)_50%,rgba(255,255,255,0)_100%)] bg-[length:200%_100%]" />
                              </div>
                            ))}
                          </div>
                        )}
                        {imagesError && certificateImages.length === 0 && (
                          <div className="text-xs text-red-600 flex items-center gap-2">
                            <span>Failed: {imagesError}</span>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={loadImages}>Retry</Button>
                          </div>
                        )}
                        {!loadingImages && certificateImages.length === 0 && !imagesError && (
                          <p className="text-xs text-gray-400">No certificate images.</p>
                        )}
                        {certificateImages.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {certificateImages.map((img, idx) => (
                              <button
                                key={img.key}
                                onClick={() => setActiveImage({ ...img, group: 'cert', index: idx })}
                                className="relative group border rounded-lg overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Open preview"
                              >
                                <img src={img.url} alt={`Certificate ${idx + 1}`} className="w-full h-40 object-cover group-hover:brightness-105" loading="lazy" />
                                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">Preview</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">Kitchen {kitchenImages.length > 0 && <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-gray-100 text-gray-600">{kitchenImages.length}</span>}</h4>
                          {imagesError && kitchenImages.length === 0 && (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={loadImages}>Retry</Button>
                          )}
                        </div>
                        {loadingImages && kitchenImages.length === 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4" aria-label="Loading kitchen images">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className="h-40 rounded-lg border bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                                <div className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.6)_50%,rgba(255,255,255,0)_100%)] bg-[length:200%_100%]" />
                              </div>
                            ))}
                          </div>
                        )}
                        {imagesError && kitchenImages.length === 0 && (
                          <div className="text-xs text-red-600 flex items-center gap-2">
                            <span>Failed: {imagesError}</span>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={loadImages}>Retry</Button>
                          </div>
                        )}
                        {!loadingImages && kitchenImages.length === 0 && !imagesError && (
                          <p className="text-xs text-gray-400">No kitchen images.</p>
                        )}
                        {kitchenImages.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {kitchenImages.map((img, idx) => (
                              <button
                                key={img.key}
                                onClick={() => setActiveImage({ ...img, group: 'kitchen', index: idx })}
                                className="relative group border rounded-lg overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Open preview"
                              >
                                <img src={img.url} alt={`Kitchen ${idx + 1}`} className="w-full h-40 object-cover group-hover:brightness-105" loading="lazy" />
                                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">Preview</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400">Signed URLs expire in 10 minutes. Use Refresh to renew.</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
          <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
            <div className="flex-1 text-left">
              {cook.for_review && !cook.is_verified && (
                <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">Pending decision</span>
              )}
            </div>
            {cook.for_review && !cook.is_verified && viewGranted && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => setShowRejectDialog(true)}
                  className="border-red-600 text-red-700 hover:bg-red-50"
                >Reject</Button>
                <Button
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => setShowApproveDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >Approve</Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Preview */}
      {activeImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Image preview">
          <button
            onClick={() => setActiveImage(null)}
            className="absolute inset-0 w-full h-full cursor-zoom-out"
            aria-label="Close preview"
          />
          <div className="relative max-w-4xl w-full mx-4">
            <img
              src={activeImage.url}
              alt={activeImage.key}
              className="relative z-10 w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/10 bg-black/20"
            />
            <div className="absolute -top-10 left-0 flex items-center gap-2 text-xs text-white/70">
              <span className="px-2 py-0.5 bg-white/10 rounded">
                {activeImage.group === 'cert' ? 'Certificate' : 'Kitchen'} {activeImage.index + 1} / {(activeImage.group === 'cert' ? certificateImages : kitchenImages).length}
              </span>
            </div>
            <div className="absolute top-2 right-2 flex gap-2 z-20">
              <Button size="icon" variant="outline" onClick={() => setActiveImage(null)} className="!text-white !border-white/30 !bg-white/10 hover:!bg-white/20" aria-label="Close preview">✕</Button>
            </div>
            {(activeImage.group === 'cert' ? certificateImages.length : kitchenImages.length) > 1 && (
              <>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    const imgs = activeImage.group === 'cert' ? certificateImages : kitchenImages;
                    let prev = activeImage.index - 1;
                    if (prev < 0) prev = imgs.length - 1;
                    setActiveImage({ ...imgs[prev], group: activeImage.group, index: prev });
                  }}
                  className="!text-white !border-white/30 !bg-white/10 hover:!bg-white/20 absolute left-4 top-1/2 -translate-y-1/2" aria-label="Previous image"
                >◀</Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    const imgs = activeImage.group === 'cert' ? certificateImages : kitchenImages;
                    let next = activeImage.index + 1;
                    if (next >= imgs.length) next = 0;
                    setActiveImage({ ...imgs[next], group: activeImage.group, index: next });
                  }}
                  className="!text-white !border-white/30 !bg-white/10 hover:!bg-white/20 absolute right-4 top-1/2 -translate-y-1/2" aria-label="Next image"
                >▶</Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Consent Dialog */}
      <AlertDialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sensitive Information Access</AlertDialogTitle>
            <AlertDialogDescription>
              By proceeding you affirm that you will not copy, share, download, redistribute, or tamper with this applicant's personal images or data. This action is logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConsentNeeded(false);
                setViewGranted(true);
              }}
            >I Agree</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={(o) => { if (!o) { setShowRejectDialog(false); setRejectionReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription>Provide an optional reason for rejection (internal use).</AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <textarea
              className="w-full text-sm border rounded p-2 resize-none h-28 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Reason (optional)"
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              disabled={actionLoading}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                const res = await rejectCook(cook.id, rejectionReason || 'Not specified');
                if (res.success) {
                  toast.success(`${cook.username || 'Cook'} rejected`);
                  window.dispatchEvent(new CustomEvent('cookAction', { detail: { id: cook.id, type: 'rejected' } }));
                  setShowRejectDialog(false);
                  onClose();
                } else toast.error(res.error || 'Failed to reject');
                setActionLoading(false);
              }}
            >{actionLoading ? 'Processing…' : 'Reject'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={(o) => { if (!o) { setShowApproveDialog(false); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Application</AlertDialogTitle>
            <AlertDialogDescription>
              This will verify the cook and remove them from the pending review list. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                const res = await approveCook(cook.id);
                if (res.success) {
                  toast.success(`${cook.username || 'Cook'} approved`);
                  window.dispatchEvent(new CustomEvent('cookAction', { detail: { id: cook.id, type: 'approved' } }));
                  setShowApproveDialog(false);
                  onClose();
                } else toast.error(res.error || 'Failed to approve');
                setActionLoading(false);
              }}
            >{actionLoading ? 'Processing…' : 'Approve'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CookDetailsModal;
