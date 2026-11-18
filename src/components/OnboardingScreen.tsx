import React, { useState } from 'react';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { StudyMateLogo } from './StudyMateLogo';

interface OnboardingScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const SLIDES = [
  {
    title: 'Your personal AI tutor',
    description:
      'Ask tough engineering or computer science questions in plain English and get step-by-step explanations with code walkthroughs.',
    image: '/src/assets/images/onboarding_tutor_1795007940816.jpg',
    alt: 'Open smart study notebook with connected knowledge paths',
  },
  {
    title: 'Summarize your study PDFs',
    description:
      'Upload lecture slides or lab manuals to extract short, medium, or detailed summaries, key definitions, and quick revision notes.',
    image: '/src/assets/images/onboarding_pdf_1795007934865.jpg',
    alt: 'Academic PDF pages transforming into structured study summaries',
  },
  {
    title: 'Practise with AI-generated quizzes',
    description:
      'Test your mastery with custom difficulty MCQs, oral viva preparation, and interactive flashcards that track what needs practice.',
    image: '/src/assets/images/onboarding_quiz_1795007935838.jpg',
    alt: 'Interactive quiz cards, flashcards, and progress milestones',
  },
];

export function OnboardingScreen({ onGetStarted, onLogin }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});
  const slide = SLIDES[step];

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-white dark:bg-[#0F111D]">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <StudyMateLogo size="sm" />
          <span className="text-base font-bold font-display text-[#20213A] dark:text-white">
            StudyMate AI
          </span>
        </div>
        <button
          type="button"
          onClick={onLogin}
          className="min-h-[44px] px-3 text-sm font-medium text-[#6256E8] dark:text-[#A49CFF] hover:underline cursor-pointer"
        >
          Skip
        </button>
      </div>

      {/* Slide Content */}
      <div className="my-auto py-4 space-y-6">
        <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#F1EFFF] dark:bg-[#1B1E33] border border-[#E6E7F2] dark:border-[#262A44] flex items-center justify-center">
          {!imgError[step] ? (
            <img
              src={slide.image}
              alt={slide.alt}
              referrerPolicy="no-referrer"
              onError={() => setImgError((prev) => ({ ...prev, [step]: true }))}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="p-6 text-center space-y-2">
              <StudyMateLogo size="lg" />
              <p className="text-sm font-medium text-[#6256E8]">{slide.title}</p>
            </div>
          )}
        </div>

        <div className="space-y-2 text-center px-2">
          <p className="text-xs font-medium text-[#6256E8] dark:text-[#A49CFF]">
            Step {step + 1} of {SLIDES.length}
          </p>
          <h2 className="text-2xl font-bold font-display text-[#20213A] dark:text-white leading-snug text-balance">
            {slide.title}
          </h2>
          <p className="text-sm leading-relaxed text-[#5A5D7A] dark:text-[#9CA0BD]">
            {slide.description}
          </p>
        </div>

        {/* Slide Dots */}
        <div className="flex items-center justify-center gap-2">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Slide ${idx + 1}`}
              onClick={() => setStep(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === step
                  ? 'w-7 bg-[#6256E8]'
                  : 'w-2 bg-[#DCDFF0] dark:bg-[#2E324F]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2.5">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              aria-label="Previous slide"
              className="min-h-[48px] w-12 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] flex items-center justify-center text-[#20213A] dark:text-white hover:bg-[#F7F7FC] dark:hover:bg-[#191C2F] transition-colors cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {step < SLIDES.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 min-h-[48px] px-5 rounded-xl bg-[#6256E8] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#5246D8] active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onGetStarted}
              className="flex-1 min-h-[48px] px-5 rounded-xl bg-[#6256E8] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#5246D8] active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onLogin}
          className="w-full min-h-[44px] rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] text-sm font-medium text-[#20213A] dark:text-white hover:bg-[#F1EFFF] dark:hover:bg-[#222540] transition-colors cursor-pointer"
        >
          Already have an account? Login
        </button>
      </div>
    </div>
  );
}
