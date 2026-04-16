import { useState } from 'react';
import { Star, MessageSquare, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useReviews } from '@/hooks/useStore';
import { Review } from '@/types';
import { toast } from 'sonner';

interface ProductReviewsProps {
  productId: string;
  productName: string;
  telegramUser: { id: string; first_name: string; username?: string } | null;
  onLoginRequired: () => void;
}

function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md';
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={`transition-transform ${!readOnly ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          onClick={() => onChange && onChange(star)}
        >
          <Star
            className={`${sz} transition-colors ${
              star <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review, telegramUser, onDelete }: {
  review: Review;
  telegramUser: { id: string } | null;
  onDelete: (id: string) => void;
}) {
  const isOwner = telegramUser?.id === review.telegram_id;
  const date = new Date(review.created_at).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="flex gap-3 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 group">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
        {review.first_name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 leading-tight">
              {review.first_name}
              {review.username && (
                <span className="text-[#2ba3e3] font-medium ml-1 text-xs">@{review.username}</span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating value={review.rating} readOnly size="sm" />
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{date}</span>
            </div>
          </div>
          {isOwner && (
            <button
              onClick={() => onDelete(review.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 p-1 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {review.comment && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
            {review.comment}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProductReviews({ productId, productName, telegramUser, onLoginRequired }: ProductReviewsProps) {
  const { reviews, loading, addReview, deleteReview } = useReviews(productId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const hasAlreadyReviewed = telegramUser
    ? reviews.some(r => r.telegram_id === telegramUser.id)
    : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramUser) { onLoginRequired(); return; }
    
    if (rating === 0) {
      toast('How about 5 stars? 🍬', {
        description: 'Please select a rating before submitting your sweet review!',
        action: {
          label: '5 STARS! 🌟',
          onClick: () => setRating(5)
        },
      });
      return;
    }

    setSubmitting(true);
    const ok = await addReview(
      productId,
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

  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800 mt-3 pt-3">
      {/* Summary Row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(prev => !prev)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(prev => !prev); } }}
        className="w-full flex items-center justify-between text-left group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-1.5 -m-1.5 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
          <div className="flex items-center gap-1.5">
            {reviews.length > 0 ? (
              <StarRating value={Math.round(avgRating)} readOnly size="sm" />
            ) : (
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">No reviews yet</span>
            )}
          </div>
          {reviews.length > 0 && (
            <span className="text-[10px] text-zinc-400">({reviews.length})</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        )}
      </div>

      {/* Expanded Review Panel */}
      {isExpanded && (
        <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Write Review Button */}
          {!hasAlreadyReviewed && !showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!telegramUser) { onLoginRequired(); return; }
                setShowForm(true);
              }}
              className="w-full mb-3 h-8 text-xs rounded-xl border-pink-200 dark:border-pink-900 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/30"
            >
              <Star className="w-3 h-3 mr-1.5" />
              Write a Review
            </Button>
          )}

          {hasAlreadyReviewed && !showForm && (
            <p className="text-[10px] text-center text-zinc-400 mb-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg py-2">
              ✅ You've already reviewed this product
            </p>
          )}

          {/* Review Form */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="mb-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 space-y-3 border border-zinc-200 dark:border-zinc-700 animate-in fade-in zoom-in-95 duration-200"
            >
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Rate <span className="text-pink-600 dark:text-pink-400">{productName}</span>
              </p>
              <div className="flex items-center gap-2">
                <StarRating value={rating} onChange={setRating} />
                {rating > 0 && (
                  <span className="text-xs text-zinc-500">{['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}</span>
                )}
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts… (optional)"
                className="text-sm resize-none h-20 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                maxLength={500}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  size="sm"
                  className="flex-1 bg-pink-600 hover:bg-pink-500 text-white rounded-xl h-9 text-xs font-bold"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit Review'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowForm(false); setRating(0); setComment(''); }}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Review List */}
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-center text-xs text-zinc-400 py-4">
              Be the first to review this! 🌟
            </p>
          ) : (
            <div className="space-y-0 max-h-64 overflow-y-auto pr-1">
              {reviews.map(review => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  telegramUser={telegramUser}
                  onDelete={deleteReview}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
