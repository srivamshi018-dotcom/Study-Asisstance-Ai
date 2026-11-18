import React, { useMemo, useState } from 'react';
import {
  Bot,
  CalendarCheck2,
  ChevronRight,
  FileText,
  Flame,
  HelpCircle,
  Layers,
  Mic,
  Search,
  X,
} from 'lucide-react';
import {
  DAILY_MOTIVATIONS,
  FREE_PLAN_LIMITS,
  type ChatHistoryDoc,
  type NavTab,
  type PracticeTool,
  type QuizResultDoc,
  type SavedMaterialDoc,
  type StudyTaskDoc,
  type SummaryDoc,
  type UserProfile,
} from '../types';

interface HomeDashboardProps {
  profile: UserProfile;
  chats: ChatHistoryDoc[];
  summaries: SummaryDoc[];
  quizResults: QuizResultDoc[];
  tasks: StudyTaskDoc[];
  savedItems: SavedMaterialDoc[];
  onNavigate: (tab: NavTab, tool?: PracticeTool) => void;
  onOpenUpgrade: () => void;
}

export function HomeDashboard({
  profile,
  chats,
  summaries,
  quizResults,
  tasks,
  savedItems,
  onNavigate,
  onOpenUpgrade,
}: HomeDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = profile.displayName.split(' ')[0] || 'Student';

  const motivation = useMemo(() => {
    const dayIndex = new Date().getDate() % DAILY_MOTIVATIONS.length;
    return DAILY_MOTIVATIONS[dayIndex];
  }, []);

  const completedTasks = tasks.filter((t) => t.completed).length;
  const remainingAi = Math.max(
    0,
    FREE_PLAN_LIMITS.dailyAiQuestions - (profile.dailyAiQuestions || 0)
  );

  const shortcuts: {
    id: string;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
  }[] = [
    {
      id: 'tutor',
      label: 'AI Tutor',
      subtitle: 'Ask & debug code',
      icon: Bot,
      action: () => onNavigate('tutor'),
    },
    {
      id: 'pdf',
      label: 'PDF Summarizer',
      subtitle: 'Notes & definitions',
      icon: FileText,
      action: () => onNavigate('practice', 'pdf'),
    },
    {
      id: 'quiz',
      label: 'Quiz Generator',
      subtitle: 'MCQ practice',
      icon: HelpCircle,
      action: () => onNavigate('practice', 'quiz'),
    },
    {
      id: 'viva',
      label: 'Viva Prep',
      subtitle: 'Oral exam Q&A',
      icon: Mic,
      action: () => onNavigate('practice', 'viva'),
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      subtitle: 'Active recall decks',
      icon: Layers,
      action: () => onNavigate('practice', 'flashcards'),
    },
    {
      id: 'planner',
      label: 'Study Planner',
      subtitle: 'Tasks & deadlines',
      icon: CalendarCheck2,
      action: () => onNavigate('practice', 'planner'),
    },
  ];

  const recentActivity = useMemo(() => {
    const items: { id: string; title: string; meta: string; onClick: () => void }[] = [];

    chats.slice(0, 2).forEach((c) =>
      items.push({
        id: `chat-${c.id}`,
        title: c.title,
        meta: `AI Tutor · ${c.subject}`,
        onClick: () => onNavigate('tutor'),
      })
    );
    summaries.slice(0, 2).forEach((s) =>
      items.push({
        id: `sum-${s.id}`,
        title: s.fileName,
        meta: `PDF Summary · ${s.subject}`,
        onClick: () => onNavigate('practice', 'pdf'),
      })
    );
    quizResults.slice(0, 2).forEach((r) =>
      items.push({
        id: `quiz-${r.id}`,
        title: `${r.topic} (${r.score}/${r.totalQuestions})`,
        meta: `Quiz · ${r.subject}`,
        onClick: () => onNavigate('practice', 'quiz'),
      })
    );

    return items.slice(0, 5);
  }, [chats, summaries, quizResults, onNavigate]);

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const toolMatches = shortcuts
      .filter(
        (s) =>
          s.label.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q)
      )
      .map((s) => ({
        id: `tool-${s.id}`,
        title: s.label,
        meta: `Tool · ${s.subtitle}`,
        action: s.action,
      }));

    const savedMatches = savedItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((item) => ({
        id: `saved-${item.id}`,
        title: item.title,
        meta: `Saved · ${item.subject}`,
        action: () => onNavigate('saved'),
      }));

    const taskMatches = tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.topic.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map((t) => ({
        id: `task-${t.id}`,
        title: t.title,
        meta: `Task · ${t.subject} · Due ${t.dueDate}`,
        action: () => onNavigate('practice', 'planner'),
      }));

    return [...toolMatches, ...savedMatches, ...taskMatches];
  }, [searchQuery, savedItems, tasks, onNavigate]);

  return (
    <div className="p-5 space-y-6 pb-8">
      {/* Greeting Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5] truncate">
            {profile.major} · {profile.semester}
          </p>
          <h1 className="text-2xl font-bold font-display text-[#20213A] dark:text-white truncate">
            {greeting}, {firstName}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          aria-label="Open Profile"
          className="w-11 h-11 rounded-full overflow-hidden border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F1EFFF] dark:bg-[#25224A] flex items-center justify-center shrink-0 cursor-pointer"
        >
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-[#6256E8]">
              {firstName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </button>
      </header>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#6A6E8A] dark:text-[#8E93B5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tools, saved notes, or tasks..."
          className="w-full min-h-[44px] pl-10 pr-10 rounded-xl border border-[#E4E5F2] dark:border-[#252840] bg-[#F8F8FC] dark:bg-[#16192A] text-sm text-[#20213A] dark:text-white placeholder:text-[#7D819D] focus:outline-none focus:border-[#6256E8]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-[#6A6E8A] hover:text-[#20213A] dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Live Search Results */}
      {searchMatches !== null ? (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
              Search Results
            </h2>
            <span className="text-xs text-[#6A6E8A] tabular-nums">
              {searchMatches.length} found
            </span>
          </div>
          {searchMatches.length === 0 ? (
            <div className="p-5 rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] text-center text-sm text-[#5A5D7A] dark:text-[#9CA0BD]">
              No matching tools, tasks, or saved notes found.
            </div>
          ) : (
            <div className="divide-y divide-[#ECEEF6] dark:divide-[#23273E] rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-white dark:bg-[#141728] overflow-hidden">
              {searchMatches.map((match) => (
                <button
                  key={match.id}
                  type="button"
                  onClick={match.action}
                  className="w-full min-h-[54px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F8F8FC] dark:hover:bg-[#1A1E33] transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#20213A] dark:text-white truncate">
                      {match.title}
                    </p>
                    <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5] truncate">
                      {match.meta}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8E93B5] shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Daily Study Motivation */}
          <section className="rounded-2xl bg-[#F1EFFF] dark:bg-[#201D42] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[#6256E8] dark:text-[#ABA4FF]">
              <span>Daily Study Focus</span>
              <span>{motivation.focus}</span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-[#20213A] dark:text-white">
              “{motivation.quote}”
            </p>
          </section>

          {/* Daily Learning Statistics */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
                Today’s Progress
              </h2>
              <button
                type="button"
                onClick={onOpenUpgrade}
                className="text-xs font-medium text-[#6256E8] dark:text-[#A49CFF] hover:underline cursor-pointer"
              >
                Free Plan · {remainingAi} AI asks left
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-3">
                <div className="flex items-center gap-1.5 text-xs text-[#6A6E8A] dark:text-[#8E93B5]">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Streak</span>
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-[#20213A] dark:text-white mt-1">
                  {profile.studyStreak || 1}d
                </p>
              </div>
              <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-3">
                <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5]">Quizzes</p>
                <p className="text-xl font-bold font-mono tabular-nums text-[#20213A] dark:text-white mt-1">
                  {profile.quizzesCompleted || quizResults.length}
                </p>
              </div>
              <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-3">
                <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5]">Tasks Done</p>
                <p className="text-xl font-bold font-mono tabular-nums text-[#20213A] dark:text-white mt-1">
                  {completedTasks}/{tasks.length}
                </p>
              </div>
            </div>
          </section>

          {/* 6 Quick-Launch Study Tools */}
          <section className="space-y-2.5">
            <h2 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
              Study Tools
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {shortcuts.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={tool.action}
                    className="min-h-[76px] p-3.5 rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-white dark:bg-[#141728] hover:border-[#6256E8]/50 hover:bg-[#F9F8FF] dark:hover:bg-[#1B1E36] text-left flex items-start gap-3 transition-colors cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#F1EFFF] dark:bg-[#25224A] text-[#6256E8] dark:text-[#A49CFF] flex items-center justify-center shrink-0">
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#20213A] dark:text-white truncate">
                        {tool.label}
                      </p>
                      <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5] truncate mt-0.5">
                        {tool.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Recent Activity */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
                Recent Activity
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('saved')}
                className="text-xs font-medium text-[#6256E8] dark:text-[#A49CFF] hover:underline cursor-pointer"
              >
                View Saved
              </button>
            </div>

            {recentActivity.length === 0 ? (
              <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-5 text-center space-y-2">
                <p className="text-sm font-medium text-[#20213A] dark:text-white">
                  No study activity yet
                </p>
                <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5]">
                  Ask the AI Tutor a question, summarize a PDF, or try a 5-question quiz to begin.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#ECEEF6] dark:divide-[#23273E] rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-white dark:bg-[#141728] overflow-hidden">
                {recentActivity.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F8F8FC] dark:hover:bg-[#1A1E33] transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#20213A] dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5] truncate mt-0.5">
                        {item.meta}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8E93B5] shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
