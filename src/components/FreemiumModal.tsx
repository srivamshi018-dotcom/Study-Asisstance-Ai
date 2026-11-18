import React from 'react';
import { Check, Lock, X } from 'lucide-react';
import { FREE_PLAN_LIMITS } from '../types';

interface FreemiumModalProps {
  open: boolean;
  reason?: string;
  onClose: () => void;
}

export function FreemiumModal({ open, reason, onClose }: FreemiumModalProps) {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="StudyMate AI Plans"
    >
      <div className="w-full bg-white dark:bg-[#141728] rounded-t-3xl border-t border-[#E6E7F2] dark:border-[#262A44] p-6 space-y-5 max-h-[88%] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#6256E8] dark:text-[#A49CFF]">
              StudyMate AI Plans
            </p>
            <h2 className="text-xl font-bold font-display text-[#20213A] dark:text-white">
              Free vs. Premium Preview
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#5A5D7A] dark:text-[#9CA0BD] hover:bg-[#F3F4FA] dark:hover:bg-[#1F233A] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {reason && (
          <div className="p-3.5 rounded-xl bg-[#F1EFFF] dark:bg-[#25224A] text-xs text-[#20213A] dark:text-[#EAEBFF] leading-relaxed">
            {reason}
          </div>
        )}

        <div className="space-y-3">
          {/* Free Plan */}
          <div className="rounded-2xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#181B2E] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
                Free Plan · Active
              </h3>
              <span className="text-xs font-mono font-semibold text-[#6256E8] dark:text-[#A49CFF]">
                $0 / mo
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-[#5A5D7A] dark:text-[#9CA0BD]">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{FREE_PLAN_LIMITS.dailyAiQuestions} AI Tutor questions per day</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{FREE_PLAN_LIMITS.dailyPdfSummaries} PDF summaries per day</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{FREE_PLAN_LIMITS.dailyQuizzes} Practice quizzes per day & basic flashcards</span>
              </li>
            </ul>
          </div>

          {/* Premium Plan Preview */}
          <div className="rounded-2xl border border-[#6256E8]/40 bg-[#F1EFFF]/70 dark:bg-[#221F46] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
                StudyMate Premium · Future Release
              </h3>
              <span className="text-xs font-medium text-[#6256E8] dark:text-[#A49CFF]">
                Coming Soon
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-[#3C3F5E] dark:text-[#C8CBE8]">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#6256E8] dark:text-[#A49CFF] shrink-0" />
                <span>Higher daily AI Tutor & deep code debugging limits</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#6256E8] dark:text-[#A49CFF] shrink-0" />
                <span>More PDF document summaries & exam cheat sheets</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#6256E8] dark:text-[#A49CFF] shrink-0" />
                <span>Unlimited quizzes, advanced flashcards & ad-free focus</span>
              </li>
            </ul>
          </div>
        </div>

        <button
          type="button"
          disabled
          className="w-full min-h-[48px] rounded-xl bg-[#E4E5F2] dark:bg-[#252840] text-[#5A5D7A] dark:text-[#9CA0BD] text-sm font-medium flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <Lock className="w-4 h-4" />
          <span>Subscriptions available in a future update</span>
        </button>
      </div>
    </div>
  );
}
