import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  createStudyTask,
  deleteStudyTask,
  getTodayIso,
  toggleStudyTask,
} from '../lib/firestoreService';
import {
  ENGINEERING_CS_SUBJECTS,
  type StudyTaskDoc,
  type UserProfile,
} from '../types';

interface StudyPlannerViewProps {
  profile: UserProfile;
  tasks: StudyTaskDoc[];
  onBack: () => void;
}

export function StudyPlannerView({ profile, tasks, onBack }: StudyPlannerViewProps) {
  const today = getTodayIso();
  const [subject, setSubject] = useState(
    profile.subjects?.[0] || ENGINEERING_CS_SUBJECTS[0]
  );
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const stats = useMemo(() => {
    const todayTasks = tasks.filter((t) => t.dueDate === today);
    const todayDone = todayTasks.filter((t) => t.completed).length;

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);
    const weekEndIso = weekEnd.toISOString().slice(0, 10);

    const weekTasks = tasks.filter(
      (t) => t.dueDate >= today && t.dueDate <= weekEndIso
    );
    const weekDone = weekTasks.filter((t) => t.completed).length;

    return {
      todayTotal: todayTasks.length,
      todayDone,
      todayPct: todayTasks.length
        ? Math.round((todayDone / todayTasks.length) * 100)
        : 0,
      weekTotal: weekTasks.length,
      weekDone,
      weekPct: weekTasks.length
        ? Math.round((weekDone / weekTasks.length) * 100)
        : 0,
    };
  }, [tasks, today]);

  const upcomingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a study task title.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await createStudyTask(profile.userId, {
        subject,
        topic: topic.trim() || subject,
        title: title.trim(),
        dueDate: dueDate || today,
      });
      setTitle('');
      setTopic('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save study task.');
    } finally {
      setSaving(false);
    }
  };

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
            Study Planner
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1 min-h-[38px] px-3 rounded-xl bg-[#6256E8] text-white text-xs font-semibold cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Cancel' : 'Add Task'}</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-8">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Daily & Weekly Progress */}
        <section className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6A6E8A] dark:text-[#8E93B5]">Daily Goal</span>
              <span className="font-mono font-semibold text-[#6256E8] dark:text-[#A49CFF] tabular-nums">
                {stats.todayDone}/{stats.todayTotal}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#E6E7F2] dark:bg-[#252842] overflow-hidden">
              <div
                className="h-full bg-[#6256E8] transition-all"
                style={{ width: `${stats.todayPct}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6A6E8A] dark:text-[#8E93B5]">7-Day Plan</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {stats.weekDone}/{stats.weekTotal}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#E6E7F2] dark:bg-[#252842] overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${stats.weekPct}%` }}
              />
            </div>
          </div>
        </section>

        {/* Add Task Form */}
        {showForm && (
          <form
            onSubmit={handleAddTask}
            className="rounded-2xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] p-4 space-y-3"
          >
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#5A5D7A] dark:text-[#9CA0BD]">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-white dark:bg-[#111424] text-sm text-[#20213A] dark:text-white"
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
                Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Dynamic Programming"
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-white dark:bg-[#111424] text-sm text-[#20213A] dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#5A5D7A] dark:text-[#9CA0BD]">
                Study Task
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Solve 5 knapsack problems & review notes"
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-white dark:bg-[#111424] text-sm text-[#20213A] dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#5A5D7A] dark:text-[#9CA0BD]">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-white dark:bg-[#111424] text-sm text-[#20213A] dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[46px] rounded-xl bg-[#6256E8] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#5246D8] disabled:opacity-60 cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Study Task</span>
            </button>
          </form>
        )}

        {/* Upcoming Tasks */}
        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
            Upcoming Tasks ({upcomingTasks.length})
          </h2>

          {upcomingTasks.length === 0 ? (
            <div className="p-5 rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] text-center space-y-1.5">
              <p className="text-sm font-medium text-[#20213A] dark:text-white">
                All caught up
              </p>
              <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5]">
                Tap Add Task above to schedule a topic or exam deadline.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#ECEEF6] dark:divide-[#23273E] rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-white dark:bg-[#141728] overflow-hidden">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="px-3.5 py-3 flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={`Mark ${task.title} complete`}
                    onClick={() => void toggleStudyTask(task.id, true)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <span className="w-5 h-5 rounded-md border-2 border-[#6256E8] block" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#20213A] dark:text-white truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5] flex items-center gap-1.5 truncate mt-0.5">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>
                        {task.dueDate} · {task.subject}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteStudyTask(task.id)}
                    aria-label="Delete task"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8E93B5] hover:text-red-500 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
              Completed ({completedTasks.length})
            </h2>
            <div className="divide-y divide-[#ECEEF6] dark:divide-[#23273E] rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] overflow-hidden">
              {completedTasks.map((task) => (
                <div key={task.id} className="px-3.5 py-3 flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={`Mark ${task.title} incomplete`}
                    onClick={() => void toggleStudyTask(task.id, false)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-through text-[#6A6E8A] dark:text-[#8E93B5] truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-[#8E93B5] truncate">
                      {task.subject} · {task.dueDate}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteStudyTask(task.id)}
                    aria-label="Delete completed task"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8E93B5] hover:text-red-500 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
