import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import {
  Bell,
  ChevronRight,
  Crown,
  Flame,
  LogOut,
  Moon,
  Sun,
  UserCog,
} from 'lucide-react';
import { auth } from '../lib/firebase';
import {
  updateStudentAcademicProfile,
  updateUserPreferences,
} from '../lib/firestoreService';
import {
  FREE_PLAN_LIMITS,
  type FlashcardDeckDoc,
  type QuizResultDoc,
  type StudyTaskDoc,
  type UserProfile,
} from '../types';

interface ProfileViewProps {
  profile: UserProfile;
  quizResults: QuizResultDoc[];
  decks: FlashcardDeckDoc[];
  tasks: StudyTaskDoc[];
  onOpenPlans: () => void;
}

export function ProfileView({
  profile,
  quizResults,
  decks,
  tasks,
  onOpenPlans,
}: ProfileViewProps) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [major, setMajor] = useState(profile.major);
  const [semester, setSemester] = useState(profile.semester);
  const [saving, setSaving] = useState(false);

  const isDark = profile.theme === 'dark';
  const completedTasks = tasks.filter((t) => t.completed).length;

  const toggleTheme = async () => {
    const nextTheme = isDark ? 'light' : 'dark';
    await updateUserPreferences(profile.userId, {
      theme: nextTheme,
      notificationsEnabled: profile.notificationsEnabled,
    });
  };

  const toggleNotifications = async () => {
    await updateUserPreferences(profile.userId, {
      theme: profile.theme,
      notificationsEnabled: !profile.notificationsEnabled,
    });
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !major.trim()) return;
    setSaving(true);
    try {
      await updateStudentAcademicProfile(profile.userId, {
        displayName: displayName.trim(),
        photoURL: profile.photoURL || '',
        major: major.trim(),
        semester,
        subjects: profile.subjects || [],
        onboardingCompleted: true,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 space-y-6 pb-8">
      {/* User Header Card */}
      <section className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#F1EFFF] dark:bg-[#25224A] border border-[#E2E4F0] dark:border-[#2A2E47] flex items-center justify-center shrink-0">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-[#6256E8]">
              {profile.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold font-display text-[#20213A] dark:text-white truncate">
            {profile.displayName}
          </h1>
          <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5] truncate">
            {profile.email}
          </p>
          <p className="text-xs font-medium text-[#6256E8] dark:text-[#A49CFF] truncate mt-0.5">
            {profile.major} · {profile.semester}
          </p>
        </div>
      </section>

      {/* Learning Statistics */}
      <section className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-3">
          <div className="flex items-center gap-1 text-xs text-[#6A6E8A] dark:text-[#8E93B5]">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Streak</span>
          </div>
          <p className="text-lg font-bold font-mono tabular-nums text-[#20213A] dark:text-white mt-1">
            {profile.studyStreak || 1} days
          </p>
        </div>
        <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-3">
          <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5]">Quizzes</p>
          <p className="text-lg font-bold font-mono tabular-nums text-[#20213A] dark:text-white mt-1">
            {profile.quizzesCompleted || quizResults.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-3">
          <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5]">Decks / Tasks</p>
          <p className="text-lg font-bold font-mono tabular-nums text-[#20213A] dark:text-white mt-1">
            {decks.length} / {completedTasks}
          </p>
        </div>
      </section>

      {/* Freemium Plan Card */}
      <section className="rounded-2xl bg-[#F1EFFF] dark:bg-[#221F46] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#6256E8] dark:text-[#A49CFF]" />
            <span className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
              Free Plan
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenPlans}
            className="text-xs font-semibold text-[#6256E8] dark:text-[#A49CFF] hover:underline cursor-pointer"
          >
            Compare Plans
          </button>
        </div>
        <p className="text-xs text-[#3C3F5E] dark:text-[#C8CBE8] tabular-nums">
          Today: {profile.dailyAiQuestions || 0}/{FREE_PLAN_LIMITS.dailyAiQuestions} AI questions ·{' '}
          {profile.dailyPdfSummaries || 0}/{FREE_PLAN_LIMITS.dailyPdfSummaries} PDF summaries ·{' '}
          {profile.dailyQuizzes || 0}/{FREE_PLAN_LIMITS.dailyQuizzes} quizzes
        </p>
      </section>

      {/* Edit Account Form */}
      {editing && (
        <form
          onSubmit={handleSaveAccount}
          className="rounded-2xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
            Update Account Details
          </h2>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Full Name"
            className="w-full min-h-[44px] px-3 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-white dark:bg-[#111424] text-sm"
          />
          <input
            type="text"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            placeholder="Major / Department"
            className="w-full min-h-[44px] px-3 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-white dark:bg-[#111424] text-sm"
          />
          <input
            type="text"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            placeholder="Semester"
            className="w-full min-h-[44px] px-3 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-white dark:bg-[#111424] text-sm"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 min-h-[44px] rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 min-h-[44px] rounded-xl bg-[#6256E8] text-white text-xs font-semibold cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Settings List */}
      <section className="divide-y divide-[#ECEEF6] dark:divide-[#23273E] rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-white dark:bg-[#141728] overflow-hidden">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full min-h-[56px] px-4 flex items-center justify-between gap-3 hover:bg-[#F8F8FC] dark:hover:bg-[#1A1E33] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            {isDark ? (
              <Moon className="w-4 h-4 text-[#6256E8] dark:text-[#A49CFF]" />
            ) : (
              <Sun className="w-4 h-4 text-[#6256E8]" />
            )}
            <span className="text-sm font-medium text-[#20213A] dark:text-white">
              Dark Mode
            </span>
          </div>
          <span className="text-xs font-medium text-[#6A6E8A] dark:text-[#8E93B5]">
            {isDark ? 'On' : 'Off'}
          </span>
        </button>

        <button
          type="button"
          onClick={toggleNotifications}
          className="w-full min-h-[56px] px-4 flex items-center justify-between gap-3 hover:bg-[#F8F8FC] dark:hover:bg-[#1A1E33] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-[#6256E8] dark:text-[#A49CFF]" />
            <span className="text-sm font-medium text-[#20213A] dark:text-white">
              Study Reminders
            </span>
          </div>
          <span className="text-xs font-medium text-[#6A6E8A] dark:text-[#8E93B5]">
            {profile.notificationsEnabled ? 'Enabled' : 'Paused'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="w-full min-h-[56px] px-4 flex items-center justify-between gap-3 hover:bg-[#F8F8FC] dark:hover:bg-[#1A1E33] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <UserCog className="w-4 h-4 text-[#6256E8] dark:text-[#A49CFF]" />
            <span className="text-sm font-medium text-[#20213A] dark:text-white">
              Account Settings
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E93B5]" />
        </button>
      </section>

      <button
        type="button"
        onClick={() => void signOut(auth)}
        className="w-full min-h-[48px] rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-900/15 text-red-600 dark:text-red-400 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-100/70 dark:hover:bg-red-900/25 transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout</span>
      </button>
    </div>
  );
}
