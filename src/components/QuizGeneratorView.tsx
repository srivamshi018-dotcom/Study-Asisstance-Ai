import React, { useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Loader2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { generateQuiz } from '../lib/apiClient';
import {
  createQuizRecord,
  createQuizResultRecord,
  incrementUsageStats,
  saveMaterialItem,
} from '../lib/firestoreService';
import {
  ENGINEERING_CS_SUBJECTS,
  FREE_PLAN_LIMITS,
  type QuizQuestion,
  type QuizResultDoc,
  type UserProfile,
} from '../types';

interface QuizGeneratorViewProps {
  profile: UserProfile;
  quizResults: QuizResultDoc[];
  onBack: () => void;
  onLimitReached: (reason: string) => void;
}

const COUNTS: (5 | 10 | 15 | 20)[] = [5, 10, 15, 20];
const DIFFICULTIES: ('Easy' | 'Medium' | 'Hard')[] = ['Easy', 'Medium', 'Hard'];

export function QuizGeneratorView({
  profile,
  quizResults,
  onBack,
  onLimitReached,
}: QuizGeneratorViewProps) {
  const [subject, setSubject] = useState(
    profile.subjects?.[0] || ENGINEERING_CS_SUBJECTS[0]
  );
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState<5 | 10 | 15 | 20>(5);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [weakAreas, setWeakAreas] = useState<string[]>([]);
  const [savedQuizFlag, setSavedQuizFlag] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((profile.dailyQuizzes || 0) >= FREE_PLAN_LIMITS.dailyQuizzes) {
      onLimitReached(
        `You have generated ${FREE_PLAN_LIMITS.dailyQuizzes} free quizzes today. Come back tomorrow for more!`
      );
      return;
    }

    const effectiveTopic = topic.trim() || subject;
    setError(null);
    setLoading(true);
    setSubmitted(false);
    setSavedQuizFlag(false);

    try {
      const res = await generateQuiz({
        subject,
        topic: effectiveTopic,
        count,
        difficulty,
      });
      const quizId = await createQuizRecord(profile.userId, {
        subject,
        topic: effectiveTopic,
        difficulty,
        questionCount: count,
        questions: res.questions,
      });

      await incrementUsageStats(profile.userId, profile, { quizzes: 1 });

      setActiveQuizId(quizId);
      setQuestions(res.questions);
      setSelectedAnswers(new Array(res.questions.length).fill(-1));
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate quiz.');
    } finally {
      setLoading(false);
    }
  };

  const selectOption = (optionIdx: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = optionIdx;
      return next;
    });
  };

  const handleFinishQuiz = async () => {
    let score = 0;
    const missedSubtopics = new Set<string>();
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score += 1;
      } else if (q.subtopic) {
        missedSubtopics.add(q.subtopic);
      }
    });

    const areas = Array.from(missedSubtopics).slice(0, 10);
    setWeakAreas(areas);
    setSubmitted(true);

    const pct = Math.round((score / questions.length) * 100);
    const feedback =
      pct >= 80
        ? `Strong command of ${topic || subject} (${pct}%). Keep reinforcing edge cases.`
        : pct >= 50
          ? `Solid foundation (${pct}%). Review the missed explanations below to sharpen accuracy.`
          : `Good starting practice (${pct}%). Revisit the core concepts in ${areas.join(', ') || subject} using AI Tutor.`;

    if (activeQuizId) {
      try {
        await createQuizResultRecord(profile.userId, {
          quizId: activeQuizId,
          subject,
          topic: topic.trim() || subject,
          score,
          totalQuestions: questions.length as 5 | 10 | 15 | 20,
          selectedAnswers,
          weakAreas: areas,
          feedback,
        });
        await incrementUsageStats(profile.userId, profile, { quizzesCompleted: 1 });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save quiz score.');
      }
    }
  };

  const handleSaveQuiz = async () => {
    if (savedQuizFlag || questions.length === 0) return;
    const formatted = questions
      .map(
        (q, i) =>
          `### Q${i + 1}. ${q.question}\n${q.options
            .map((opt, idx) => `${idx === q.correctIndex ? '✓' : '·'} ${opt}`)
            .join('\n')}\n**Explanation:** ${q.explanation}`
      )
      .join('\n\n');
    try {
      await saveMaterialItem(profile.userId, {
        type: 'quiz',
        title: `${topic.trim() || subject} (${difficulty} · ${questions.length} Qs)`,
        subject,
        content: formatted,
        referenceId: activeQuizId || '',
      });
      setSavedQuizFlag(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save quiz.');
    }
  };

  const resetQuiz = () => {
    setQuestions([]);
    setActiveQuizId(null);
    setSubmitted(false);
    setWeakAreas([]);
  };

  const currentQuestion = questions[currentIndex];
  const scoreCount = questions.reduce(
    (acc, q, i) => acc + (selectedAnswers[i] === q.correctIndex ? 1 : 0),
    0
  );

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0F111D]">
      <header className="shrink-0 h-14 px-4 border-b border-[#E6E7F2] dark:border-[#23273E] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={questions.length > 0 ? resetQuiz : onBack}
            aria-label="Back"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#20213A] dark:text-white hover:bg-[#F3F4FA] dark:hover:bg-[#191C2F] cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold font-display text-[#20213A] dark:text-white truncate">
            Quiz Generator
          </h1>
        </div>
        {questions.length > 0 && !submitted && (
          <span className="text-xs font-mono font-semibold text-[#6256E8] dark:text-[#A49CFF] tabular-nums shrink-0">
            {currentIndex + 1} / {questions.length}
          </span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-8">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {questions.length === 0 ? (
          <>
            <form onSubmit={handleGenerate} className="space-y-4">
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
                  Specific Topic (Optional)
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={140}
                  placeholder="e.g. Dijkstra's Algorithm, Deadlocks, B+ Trees"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] text-sm text-[#20213A] dark:text-white focus:outline-none focus:border-[#6256E8]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#5A5D7A] dark:text-[#9CA0BD]">
                  Number of Questions
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COUNTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCount(c)}
                      className={`min-h-[44px] rounded-xl border text-sm font-mono font-semibold tabular-nums transition-colors cursor-pointer ${
                        count === c
                          ? 'bg-[#6256E8] border-[#6256E8] text-white'
                          : 'bg-[#F8F8FC] dark:bg-[#16192A] border-[#E2E4F0] dark:border-[#2A2E47] text-[#20213A] dark:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#5A5D7A] dark:text-[#9CA0BD]">
                  Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTIES.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`min-h-[44px] rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                        difficulty === lvl
                          ? 'bg-[#F1EFFF] dark:bg-[#25224A] border-[#6256E8] text-[#6256E8] dark:text-[#A49CFF]'
                          : 'bg-[#F8F8FC] dark:bg-[#16192A] border-[#E2E4F0] dark:border-[#2A2E47] text-[#5A5D7A] dark:text-[#9CA0BD]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] rounded-xl bg-[#6256E8] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#5246D8] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? 'Generating Quiz...' : 'Start Practice Quiz'}</span>
              </button>
            </form>

            {/* Recent Quiz Scores */}
            <section className="space-y-2.5 pt-2">
              <h2 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
                Recent Quiz Scores
              </h2>
              {quizResults.length === 0 ? (
                <div className="p-4 rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] text-xs text-[#6A6E8A] dark:text-[#8E93B5] text-center">
                  Complete a quiz above to see your scores and areas to improve.
                </div>
              ) : (
                <div className="divide-y divide-[#ECEEF6] dark:divide-[#23273E] rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-white dark:bg-[#141728] overflow-hidden">
                  {quizResults.slice(0, 5).map((r) => (
                    <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#20213A] dark:text-white truncate">
                          {r.topic}
                        </p>
                        <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5] truncate">
                          {r.subject}
                        </p>
                      </div>
                      <span className="text-sm font-mono font-semibold text-[#6256E8] dark:text-[#A49CFF] tabular-nums shrink-0">
                        {r.score}/{r.totalQuestions}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : submitted ? (
          /* Quiz Results Summary */
          <div className="space-y-5">
            <div className="rounded-2xl bg-[#F1EFFF] dark:bg-[#221F46] p-5 text-center space-y-2">
              <p className="text-xs font-medium text-[#6256E8] dark:text-[#A49CFF]">
                Quiz Complete · {difficulty}
              </p>
              <p className="text-4xl font-bold font-mono tabular-nums text-[#20213A] dark:text-white">
                {scoreCount} / {questions.length}
              </p>
              <p className="text-sm text-[#3C3F5E] dark:text-[#C8CBE8]">
                Accuracy: {Math.round((scoreCount / questions.length) * 100)}%
              </p>
            </div>

            {weakAreas.length > 0 && (
              <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-4 space-y-1.5">
                <p className="text-xs font-semibold text-[#20213A] dark:text-white">
                  Areas to Improve
                </p>
                <p className="text-xs text-[#5A5D7A] dark:text-[#9CA0BD] leading-relaxed">
                  {weakAreas.join(' · ')}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveQuiz}
                className="flex-1 min-h-[44px] rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-white dark:bg-[#16192A] text-xs font-semibold text-[#6256E8] dark:text-[#A49CFF] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bookmark className="w-4 h-4" />
                <span>{savedQuizFlag ? 'Saved to Library' : 'Save Quiz'}</span>
              </button>
              <button
                type="button"
                onClick={resetQuiz}
                className="flex-1 min-h-[44px] rounded-xl bg-[#6256E8] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>New Quiz</span>
              </button>
            </div>

            {/* Detailed Question Breakdown */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
                Answer Review
              </h2>
              {questions.map((q, idx) => {
                const picked = selectedAnswers[idx];
                const isCorrect = picked === q.correctIndex;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-4 space-y-2.5"
                  >
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      )}
                      <p className="text-sm font-medium text-[#20213A] dark:text-white">
                        {idx + 1}. {q.question}
                      </p>
                    </div>
                    <p className="text-xs text-[#5A5D7A] dark:text-[#9CA0BD]">
                      Correct Answer:{' '}
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {q.options[q.correctIndex]}
                      </span>
                    </p>
                    {!isCorrect && picked >= 0 && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Your Answer: {q.options[picked]}
                      </p>
                    )}
                    <p className="text-xs leading-relaxed text-[#5A5D7A] dark:text-[#9CA0BD] pt-1 border-t border-[#E6E7F2] dark:border-[#24283F]">
                      {q.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Active Quiz Player */
          currentQuestion && (
            <div className="space-y-5">
              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-[#F1EFFF] dark:bg-[#22253A] overflow-hidden">
                <div
                  className="h-full bg-[#6256E8] transition-all"
                  style={{
                    width: `${((currentIndex + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5]">
                  {subject} · {currentQuestion.subtopic}
                </p>
                <h2 className="text-base font-semibold text-[#20213A] dark:text-white leading-snug">
                  {currentQuestion.question}
                </h2>
              </div>

              <div className="space-y-2.5">
                {currentQuestion.options.map((opt, optIdx) => {
                  const chosen = selectedAnswers[currentIndex] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => selectOption(optIdx)}
                      className={`w-full min-h-[48px] px-4 py-3 rounded-xl border text-left text-sm flex items-center gap-3 transition-colors cursor-pointer ${
                        chosen
                          ? 'bg-[#F1EFFF] dark:bg-[#25224A] border-[#6256E8] text-[#20213A] dark:text-white font-medium'
                          : 'bg-[#F8F8FC] dark:bg-[#16192A] border-[#E2E4F0] dark:border-[#2A2E47] text-[#2E304F] dark:text-[#D5D7EA]'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-lg border border-current/25 flex items-center justify-center text-xs font-mono shrink-0">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="min-h-[48px] px-4 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] text-sm font-medium text-[#20213A] dark:text-white disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((i) => i + 1)}
                    className="flex-1 min-h-[48px] rounded-xl bg-[#6256E8] text-white text-sm font-semibold hover:bg-[#5246D8] cursor-pointer"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishQuiz}
                    className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 cursor-pointer"
                  >
                    Submit Quiz
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
