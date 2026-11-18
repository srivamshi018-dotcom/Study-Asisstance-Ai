import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { updateStudentAcademicProfile } from '../lib/firestoreService';
import { ENGINEERING_CS_SUBJECTS, type UserProfile } from '../types';
import { StudyMateLogo } from './StudyMateLogo';

interface AuthScreenProps {
  mode: 'login' | 'profile_setup';
  existingProfile?: UserProfile | null;
  onBackToOnboarding?: () => void;
  onSetupComplete?: () => void;
}

const SEMESTERS = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6',
  'Semester 7',
  'Semester 8',
];

export function AuthScreen({
  mode,
  existingProfile,
  onBackToOnboarding,
  onSetupComplete,
}: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(existingProfile?.displayName || '');
  const [major, setMajor] = useState(
    existingProfile?.major || 'Computer Science & Engineering'
  );
  const [semester, setSemester] = useState(existingProfile?.semester || 'Semester 4');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    existingProfile?.subjects?.length
      ? existingProfile.subjects
      : [
          'Data Structures & Algorithms',
          'Operating Systems',
          'Database Management (DBMS)',
          'Computer Networks',
        ]
  );

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      if (msg.includes('popup-closed-by-user')) {
        setError('Sign-in was cancelled. Please try again when ready.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(subject)) {
        return prev.length > 1 ? prev.filter((s) => s !== subject) : prev;
      }
      if (prev.length >= 10) return prev;
      return [...prev, subject];
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingProfile) return;
    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!major.trim()) {
      setError('Please enter your degree or branch.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await updateStudentAcademicProfile(existingProfile.userId, {
        displayName: displayName.trim(),
        photoURL: existingProfile.photoURL || '',
        major: major.trim(),
        semester,
        subjects: selectedSubjects,
        onboardingCompleted: true,
      });
      onSetupComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'profile_setup' && existingProfile) {
    return (
      <div className="flex-1 flex flex-col p-6 bg-white dark:bg-[#0F111D]">
        <div className="space-y-1 pb-5">
          <p className="text-xs font-medium text-[#6256E8] dark:text-[#A49CFF]">
            Profile Setup
          </p>
          <h1 className="text-2xl font-bold font-display text-[#20213A] dark:text-white">
            Personalize your study plan
          </h1>
          <p className="text-sm text-[#5A5D7A] dark:text-[#9CA0BD]">
            Tell StudyMate AI your major and focus subjects for tailored answers and quizzes.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="flex-1 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#5A5D7A] dark:text-[#9CA0BD]">
                Full Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Aarav Sharma"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] text-sm text-[#20213A] dark:text-white focus:outline-none focus:border-[#6256E8]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#5A5D7A] dark:text-[#9CA0BD]">
                Major / Department
              </label>
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                maxLength={100}
                placeholder="e.g. Computer Science & Engineering"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] text-sm text-[#20213A] dark:text-white focus:outline-none focus:border-[#6256E8]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#5A5D7A] dark:text-[#9CA0BD]">
                Current Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] text-sm text-[#20213A] dark:text-white focus:outline-none focus:border-[#6256E8]"
              >
                {SEMESTERS.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#5A5D7A] dark:text-[#9CA0BD]">
                  Core Engineering & CS Subjects
                </label>
                <span className="text-xs text-[#6A6E8A] tabular-nums">
                  {selectedSubjects.length} selected
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
                {ENGINEERING_CS_SUBJECTS.map((subj) => {
                  const active = selectedSubjects.includes(subj);
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => toggleSubject(subj)}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#F1EFFF] dark:bg-[#25224A] border-[#6256E8] text-[#20213A] dark:text-white font-medium'
                          : 'bg-white dark:bg-[#141728] border-[#E6E7F2] dark:border-[#24283F] text-[#5A5D7A] dark:text-[#9CA0BD]'
                      }`}
                    >
                      <span className="truncate">{subj}</span>
                      {active && <Check className="w-4 h-4 text-[#6256E8] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-[#6256E8] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#5246D8] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Enter Dashboard</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-white dark:bg-[#0F111D]">
      <div>
        {onBackToOnboarding && (
          <button
            type="button"
            onClick={onBackToOnboarding}
            className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-medium text-[#5A5D7A] dark:text-[#9CA0BD] hover:text-[#20213A] dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}
      </div>

      <div className="my-auto space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <StudyMateLogo size="lg" />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-display text-[#20213A] dark:text-white">
              Welcome to StudyMate AI
            </h1>
            <p className="text-sm text-[#5A5D7A] dark:text-[#9CA0BD] max-w-xs">
              Sign in with Google to sync your AI tutor chats, PDF summaries, quizzes, and study streak securely.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-5 space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full min-h-[48px] px-4 rounded-xl bg-[#6256E8] text-white text-sm font-semibold flex items-center justify-center gap-2.5 hover:bg-[#5246D8] active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer shadow-sm shadow-[#6256E8]/20"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1H12v3.2h5.35c-.25 1.45-1.5 4.2-5.35 4.2-3.2 0-5.85-2.65-5.85-5.9s2.65-5.9 5.85-5.9c1.85 0 3.05.8 3.75 1.45l2.55-2.45C16.65 4.15 14.55 3.2 12 3.2 7.05 3.2 3 7.25 3 12.2s4.05 9 9 9c5.2 0 8.65-3.65 8.65-8.8 0-.6-.05-1.05-.15-1.3Z"
                />
              </svg>
            )}
            <span>{loading ? 'Connecting account...' : 'Continue with Google'}</span>
          </button>

          <p className="text-xs text-center text-[#6A6E8A] dark:text-[#8E93B5] leading-relaxed">
            Private per-student workspace. Your notes, quizzes, and chat history are isolated to your account.
          </p>
        </div>
      </div>

      <p className="text-xs text-center text-[#6A6E8A] dark:text-[#8E93B5]">
        StudyMate AI · Learn Smarter. Score Better.
      </p>
    </div>
  );
}
