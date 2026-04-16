import { useState } from 'react';
import { Star, X, MessageSquare, Send, MapPin, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useReviews, useSettings } from '@/hooks/useStore';
import { Review } from '@/types';

// ── Star display ─────────────────────────────────────────────────
function Stars({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`${sz} ${s <= value ? 'fill-amber-400 text-amber-400' : 'fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700'}`}
        />
      ))}
    </div>
  );
}

// ── Review card for modal ────────────────────────────────────────
function ReviewModalCard({ review }: { review: Review }) {
  const date = new Date(review.created_at).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-white flex items-center justify-center font-bold text-sm shadow flex-shrink-0">
            {review.first_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100 leading-tight">
              {review.first_name}
              {review.username && <span className="text-[#2ba3e3] font-medium ml-1 text-xs">@{review.username}</span>}
            </p>
            <Stars value={review.rating} size="sm" />
          </div>
        </div>
        <span className="text-[10px] text-zinc-400 whitespace-nowrap">{date}</span>
      </div>
      {review.comment && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-1">
          "{review.comment}"
        </p>
      )}
    </div>
  );
}

// ── All Reviews Modal ────────────────────────────────────────────
interface AllReviewsModalProps {
    onClose: () => void;
    telegramUser: { id: string; first_name: string; username?: string } | null;
    onLoginRequired: () => void;
}

function AllReviewsModal({ onClose, telegramUser, onLoginRequired }: AllReviewsModalProps) {
  const { reviews, loading, addReview } = useReviews(); // all reviews
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const PER_PAGE = 10;

  const totalPages = Math.ceil(reviews.length / PER_PAGE);
  const paginated = reviews.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramUser) { onLoginRequired(); return; }
    if (rating === 0) return;
    setSubmitting(true);
    const ok = await addReview(
      null, // general review
      telegramUser.id,
      telegramUser.first_name,
      rating,
      comment,
      telegramUser.username,
    );
    if (ok) {
        setRating(0);
        setComment('');
        setShowForm(false);
    }
    setSubmitting(false);
  };

  const avg = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const counts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col bg-zinc-50 dark:bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 to-rose-500 px-6 py-5 flex items-start justify-between gap-4 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> All Customer Reviews
            </h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <Stars value={Math.round(avg)} size="sm" />
                <span className="text-white/90 text-sm font-semibold">
                  {avg.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rating Breakdown */}
        {reviews.length > 0 && (
          <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
            <div className="space-y-1.5">
              {counts.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 w-3">{star}</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Write Review Section */}
          <div className="mb-2">
            {!showForm ? (
                <button
                    onClick={() => {
                        if (!telegramUser) { onLoginRequired(); return; }
                        setShowForm(true);
                    }}
                    className="w-full py-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 hover:text-pink-500 hover:border-pink-200 dark:hover:border-pink-900 transition-all font-bold text-sm bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col items-center justify-center gap-1"
                >
                    <Star className="w-5 h-5 mb-1" />
                    Share your experience
                    <span className="text-[10px] font-normal opacity-70">Write a review about AHA SWEETS</span>
                </button>
            ) : (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-pink-100 dark:border-pink-900/50 shadow-lg shadow-pink-500/5 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-widest text-[#2ba3e3]">General Feedback</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setRating(s)}
                                    className="transform hover:scale-125 transition-transform"
                                >
                                    <Star className={`w-6 h-6 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'fill-zinc-100 text-zinc-100 dark:fill-zinc-800 dark:text-zinc-800'}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="What do you love about our bakery?"
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none h-24 resize-none transition-all dark:text-white"
                    />
                    <div className="flex gap-2 mt-3">
                        <button
                            type="submit"
                            disabled={rating === 0 || submitting}
                            className="flex-1 bg-gradient-to-r from-pink-600 to-rose-500 text-white rounded-xl py-2.5 text-xs font-black tracking-widest uppercase disabled:opacity-50 flex items-center justify-center"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sumbit Review'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-3">⭐</div>
              <p className="text-zinc-500 dark:text-zinc-400 font-semibold">No reviews yet</p>
              <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">Be the first to leave one!</p>
            </div>
          ) : (
            paginated.map(r => <ReviewModalCard key={r.id} review={r} />)
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 flex-shrink-0">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 text-sm font-semibold text-zinc-600 dark:text-zinc-400 disabled:opacity-30 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs text-zinc-400 font-medium">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 text-sm font-semibold text-zinc-600 dark:text-zinc-400 disabled:opacity-30 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Footer ──────────────────────────────────────────────────
interface FooterProps {
    telegramUser?: { id: string; first_name: string; username?: string } | null;
    onLoginRequired?: () => void;
}

export function Footer({ telegramUser = null, onLoginRequired = () => {} }: FooterProps) {
  const [showReviews, setShowReviews] = useState(false);
  const { reviews } = useReviews();
  const avg = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const { settings } = useSettings();
  const telegramName = settings.telegram_bot_name || import.meta.env.VITE_TELEGRAM_BOT_NAME || 'AHAINNOVATION_bot';
  const facebookUrl = settings.facebook_url || 'https://www.facebook.com';
  const facebookName = settings.facebook_name || 'AHA SWEETS';

  return (
    <>
      <footer className="mt-8 w-full bg-zinc-900 dark:bg-zinc-950 text-white relative overflow-hidden">
        {/* Decorative waves */}
        <div className="absolute top-0 left-0 right-0 h-8 overflow-hidden">
          <svg viewBox="0 0 1440 32" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,32 C360,0 1080,0 1440,32 L1440,0 L0,0 Z"
              fill="currentColor"
              className="text-zinc-50 dark:text-zinc-950"
            />
          </svg>
        </div>

        {/* Pink accent top-line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-rose-400 to-orange-400" />

        <div className="container max-w-4xl mx-auto px-5 pt-14 pb-8">
          {/* Top section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-2xl shadow-lg shadow-pink-900/30">
                  🧁
                </div>
                <div>
                  <h3 className="font-display text-xl italic font-bold text-white leading-tight">
                    AHA SWEETS
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium tracking-wider">Made with love, baked fresh 🩷</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
                Freshly baked goods crafted with care. Order online via Telegram and get your favorite treats delivered.
              </p>

              {/* Review Summary Button */}
              <button
                onClick={() => setShowReviews(true)}
                className="mt-4 group flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/40 rounded-2xl px-4 py-3 transition-all w-full sm:w-auto"
              >
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <Stars value={Math.round(avg)} size="sm" />
                    {reviews.length > 0 && (
                      <span className="text-amber-400 font-black text-sm">{avg.toFixed(1)}</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-400 group-hover:text-pink-400 transition-colors mt-0.5 font-semibold flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {reviews.length > 0
                      ? `View all ${reviews.length} review${reviews.length !== 1 ? 's' : ''}`
                      : 'No reviews yet — be first!'}
                  </span>
                </div>
              </button>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">
                Contact Us
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href={`https://t.me/${telegramName.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#2ba3e3]/20 group-hover:bg-[#2ba3e3]/30 flex items-center justify-center transition-colors flex-shrink-0">
                      <Send className="w-3.5 h-3.5 text-[#2ba3e3]" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium">Telegram</p>
                      <p className="text-sm text-white group-hover:text-[#2ba3e3] transition-colors font-semibold">
                        @{telegramName.replace('@', '')}
                      </p>
                    </div>
                  </a>
                </li>
                <li>
                  <a
                    href={facebookUrl.startsWith('http') ? facebookUrl : `https://${facebookUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-600/20 group-hover:bg-blue-600/30 flex items-center justify-center transition-colors flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium">Facebook</p>
                      <p className="text-sm text-white group-hover:text-blue-400 transition-colors font-semibold">
                        {facebookName}
                      </p>
                    </div>
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 font-medium">Location</p>
                    <p className="text-sm text-white font-semibold">Philippines 🇵🇭</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              © {new Date().getFullYear()} AHA SWEETS. All rights reserved.
            </p>
            <p className="text-xs text-zinc-600 flex items-center gap-1">
              Made with <span className="text-pink-500">❤️</span> &amp; lots of butter 🧈
            </p>
          </div>
        </div>
      </footer>

      {/* All Reviews Modal */}
      {showReviews && (
        <AllReviewsModal 
          onClose={() => setShowReviews(false)} 
          telegramUser={telegramUser}
          onLoginRequired={onLoginRequired}
        />
      )}
    </>
  );
}
