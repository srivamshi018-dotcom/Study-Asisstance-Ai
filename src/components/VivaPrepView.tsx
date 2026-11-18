import React, { useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Check,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { generateVivaQuestions } from '../lib/apiClient';
import { saveMaterialItem } from '../lib/firestoreService';
import {
  ENGINEERING_CS_SUBJECTS,
  type UserProfile,
  type VivaItem,
} from '../types';

interface VivaPrepViewProps {
  profile: UserProfile;
  onBack: () => void;
}

export function VivaPrepView({ profile, onBack }: VivaPrepViewProps) {
  const [subject, setSubject] = useState(
    profile.subjects?.[0] || ENGINEERING_CS_SUBJECTS[0]
  );
  const [topic, setTopic] = useState('');
  const [items, setItems] = useState<VivaItem[]>([]);
  const [mode, setMode] = useState<'list' | 'practice'>('list');
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answerDepth, setAnswerDepth] = useState<'short' | 'detailed'>('short');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSavedFlag(false);

    try {
      const res = await generateVivaQuestions({
        subject,
        topic: topic.trim() || subject,
      });
      setItems(res.items);
      setPracticeIdx(0);
      setRevealed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate viva questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveViva = async () => {
    if (savedFlag || items.length === 0) return;
    const content = items
      .map(
        (it, i) =>
          `### ${i + 1}. ${it.question}\n**Short Answer:** ${it.shortAnswer}\n\n**Detailed Answer:** ${it.detailedAnswer}\n\n**Examiner Tip:** ${it.tip}`
      )
      .join('\n\n');
    try {
      await saveMaterialItem(profile.userId, {
        type: 'revision_note',
        title: `Viva Prep: ${topic.trim() || subject}`,
        subject,
        content,
        referenceId: '',
      });
      setSavedFlag(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save viva notes.');
    }
  };

  const currentItem = items[practiceIdx];

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0F111D]">
      <header className="shrink-0 h-14 px-4 border-b border-[#E6E7F2] dark:border-[#23273E] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#20213A] dark:text-white hover:bg-[#F3F4FA] dark:hover:bg-[#191C2F] cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold font-display text-[#20213A] dark:text-white truncate">
            Viva Preparation
          </h1>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleSaveViva}
            className="inline-flex items-center gap-1 min-h-[38px] px-2.5 rounded-lg text-xs font-semibold text-[#6256E8] dark:text-[#A49CFF] cursor-pointer"
          >
            {savedFlag ? <Check className="w-4 h-4 text-emerald-600" /> : <Bookmark className="w-4 h-4" />}
            <span>{savedFlag ? 'Saved' : 'Save'}</span>
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-8">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#5A5D7A] dark:text-[#9CA0BD]">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] text-sm text-[#20213A] dark:text-white focus:outline-none focus:border-[#6256E8]"
            >
              {ENGINEERING_CS_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#5A5D7A] dark:text-[#9CA0BD]">
              Lab / Viva Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Linked Lists, CPU Scheduling, SQL Joins"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] text-sm text-[#20213A] dark:text-white focus:outline-none focus:border-[#6256E8]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-[#6256E8] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#5246D8] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Generating Viva Q&As...' : 'Generate Viva Questions'}</span>
          </button>
        </form>

        {items.length > 0 && (
          <div className="space-y-4">
            {/* Mode & Answer Length Controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F2F3FA] dark:bg-[#181B2E]">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-medium cursor-pointer ${
                    mode === 'list'
                      ? 'bg-white dark:bg-[#252842] text-[#20213A] dark:text-white shadow-xs'
                      : 'text-[#6A6E8A] dark:text-[#8E93B5]'
                  }`}
                >
                  All Q&As
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('practice');
                    setRevealed(false);
                  }}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-medium cursor-pointer ${
                    mode === 'practice'
                      ? 'bg-white dark:bg-[#252842] text-[#20213A] dark:text-white shadow-xs'
                      : 'text-[#6A6E8A] dark:text-[#8E93B5]'
                  }`}
                >
                  Practice Mode
                </button>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F2F3FA] dark:bg-[#181B2E]">
                <button
                  type="button"
                  onClick={() => setAnswerDepth('short')}
                  className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium cursor-pointer ${
                    answerDepth === 'short'
                      ? 'bg-white dark:bg-[#252842] text-[#20213A] dark:text-white shadow-xs'
                      : 'text-[#6A6E8A] dark:text-[#8E93B5]'
                  }`}
                >
                  Short
                </button>
                <button
                  type="button"
                  onClick={() => setAnswerDepth('detailed')}
                  className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium cursor-pointer ${
                    answerDepth === 'detailed'
                      ? 'bg-white dark:bg-[#252842] text-[#20213A] dark:text-white shadow-xs'
                      : 'text-[#6A6E8A] dark:text-[#8E93B5]'
                  }`}
                >
                  Detailed
                </button>
              </div>
            </div>

            {mode === 'practice' && currentItem ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-5 space-y-4">
                  <p className="text-xs font-mono text-[#6256E8] dark:text-[#A49CFF] tabular-nums">
                    Question {practiceIdx + 1} of {items.length}
                  </p>
                  <h2 className="text-base font-semibold text-[#20213A] dark:text-white leading-snug">
                    {currentItem.question}
                  </h2>

                  {revealed ? (
                    <div className="space-y-3 pt-3 border-t border-[#E6E7F2] dark:border-[#24283F]">
                      <p className="text-sm leading-relaxed text-[#2E304F] dark:text-[#D5D7EA]">
                        {answerDepth === 'short'
                          ? currentItem.shortAnswer
                          : currentItem.detailedAnswer}
                      </p>
                      <p className="text-xs text-[#6256E8] dark:text-[#A49CFF]">
                        Examiner Tip: {currentItem.tip}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5]">
                      Try answering out loud first, then reveal the model answer.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setRevealed((r) => !r)}
                    className="w-full min-h-[44px] rounded-xl bg-[#F1EFFF] dark:bg-[#25224A] text-[#6256E8] dark:text-[#A49CFF] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{revealed ? 'Hide Answer' : 'Reveal Answer'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPracticeIdx((i) => Math.max(0, i - 1));
                      setRevealed(false);
                    }}
                    disabled={practiceIdx === 0}
                    className="flex-1 min-h-[44px] rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] text-sm font-medium disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPracticeIdx((i) => Math.min(items.length - 1, i + 1));
                      setRevealed(false);
                    }}
                    disabled={practiceIdx === items.length - 1}
                    className="flex-1 min-h-[44px] rounded-xl bg-[#6256E8] text-white text-sm font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Next Question
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-4 space-y-2"
                  >
                    <p className="text-sm font-semibold text-[#20213A] dark:text-white">
                      {idx + 1}. {item.question}
                    </p>
                    <p className="text-sm leading-relaxed text-[#2E304F] dark:text-[#D5D7EA]">
                      {answerDepth === 'short' ? item.shortAnswer : item.detailedAnswer}
                    </p>
                    <p className="text-xs text-[#6256E8] dark:text-[#A49CFF] pt-1">
                      Tip: {item.tip}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
