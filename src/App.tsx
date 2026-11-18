import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { AITutorView } from './components/AITutorView';
import { AuthScreen } from './components/AuthScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FlashcardsView } from './components/FlashcardsView';
import { FreemiumModal } from './components/FreemiumModal';
import { HomeDashboard } from './components/HomeDashboard';
import { MobileShell } from './components/MobileShell';
import { OnboardingScreen } from './components/OnboardingScreen';
import { PdfSummarizerView } from './components/PdfSummarizerView';
import { PracticeHubView } from './components/PracticeHubView';
import { ProfileView } from './components/ProfileView';
import { QuizGeneratorView } from './components/QuizGeneratorView';
import { SavedMaterialsView } from './components/SavedMaterialsView';
import { SplashScreen } from './components/SplashScreen';
import { StudyPlannerView } from './components/StudyPlannerView';
import { VivaPrepView } from './components/VivaPrepView';
import { auth } from './lib/firebase';
import {
  ensureUserProfile,
  subscribeChatHistory,
  subscribeFlashcardDecks,
  subscribeQuizResults,
  subscribeSavedMaterials,
  subscribeStudyTasks,
  subscribeSummaries,
  subscribeUserProfile,
} from './lib/firestoreService';
import type {
  ChatHistoryDoc,
  FlashcardDeckDoc,
  NavTab,
  PracticeTool,
  QuizResultDoc,
  SavedMaterialDoc,
  StudyTaskDoc,
  SummaryDoc,
  UserProfile,
} from './types';

function StudyMateApp() {
  const [splashDone, setSplashDone] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    try {
      return localStorage.getItem('studymate_onboarded') === '1';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [practiceTool, setPracticeTool] = useState<PracticeTool>('hub');

  const [chats, setChats] = useState<ChatHistoryDoc[]>([]);
  const [summaries, setSummaries] = useState<SummaryDoc[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResultDoc[]>([]);
  const [decks, setDecks] = useState<FlashcardDeckDoc[]>([]);
  const [tasks, setTasks] = useState<StudyTaskDoc[]>([]);
  const [savedItems, setSavedItems] = useState<SavedMaterialDoc[]>([]);

  const [freemiumModal, setFreemiumModal] = useState<{
    open: boolean;
    reason?: string;
  }>({ open: false });

  // Brief splash timer
  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const initial = await ensureUserProfile(user);
          setProfile(initial);
        } catch (err) {
          console.error('Profile initialization error:', err);
        }
      } else {
        setProfile(null);
        setChats([]);
        setSummaries([]);
        setQuizResults([]);
        setDecks([]);
        setTasks([]);
        setSavedItems([]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Subscribe to private user collections once authenticated
  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const unsubs = [
      subscribeUserProfile(uid, (p) => {
        if (p) setProfile(p);
      }),
      subscribeChatHistory(uid, setChats),
      subscribeSummaries(uid, setSummaries),
      subscribeQuizResults(uid, setQuizResults),
      subscribeFlashcardDecks(uid, setDecks),
      subscribeStudyTasks(uid, setTasks),
      subscribeSavedMaterials(uid, setSavedItems),
    ];
    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [firebaseUser]);

  // Apply light/dark theme to root document
  useEffect(() => {
    const isDark = profile?.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
  }, [profile?.theme]);

  const completeOnboardingSlides = () => {
    setHasSeenOnboarding(true);
    try {
      localStorage.setItem('studymate_onboarded', '1');
    } catch {
      // ignore storage failure
    }
  };

  const handleNavigate = (tab: NavTab, tool?: PracticeTool) => {
    setActiveTab(tab);
    if (tab === 'practice') {
      setPracticeTool(tool || 'hub');
    } else if (tool) {
      setActiveTab('practice');
      setPracticeTool(tool);
    }
  };

  // 1. Splash
  if (!splashDone || !authReady) {
    return (
      <MobileShell>
        <SplashScreen />
      </MobileShell>
    );
  }

  // 2. Onboarding (unauthenticated first launch)
  if (!firebaseUser && !hasSeenOnboarding) {
    return (
      <MobileShell>
        <OnboardingScreen
          onGetStarted={completeOnboardingSlides}
          onLogin={completeOnboardingSlides}
        />
      </MobileShell>
    );
  }

  // 3. Authentication
  if (!firebaseUser) {
    return (
      <MobileShell>
        <AuthScreen
          mode="login"
          onBackToOnboarding={() => setHasSeenOnboarding(false)}
        />
      </MobileShell>
    );
  }

  // 4. Waiting for profile load or first-time Academic Profile Setup
  if (!profile) {
    return (
      <MobileShell>
        <SplashScreen />
      </MobileShell>
    );
  }

  if (!profile.onboardingCompleted) {
    return (
      <MobileShell>
        <AuthScreen mode="profile_setup" existingProfile={profile} />
      </MobileShell>
    );
  }

  // 5. Main 5-Tab App Shell
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeDashboard
            profile={profile}
            chats={chats}
            summaries={summaries}
            quizResults={quizResults}
            tasks={tasks}
            savedItems={savedItems}
            onNavigate={handleNavigate}
            onOpenUpgrade={() => setFreemiumModal({ open: true })}
          />
        );
      case 'tutor':
        return (
          <AITutorView
            profile={profile}
            chats={chats}
            onLimitReached={(reason) => setFreemiumModal({ open: true, reason })}
          />
        );
      case 'practice':
        switch (practiceTool) {
          case 'pdf':
            return (
              <PdfSummarizerView
                profile={profile}
                summaries={summaries}
                onBack={() => setPracticeTool('hub')}
                onLimitReached={(reason) => setFreemiumModal({ open: true, reason })}
              />
            );
          case 'quiz':
            return (
              <QuizGeneratorView
                profile={profile}
                quizResults={quizResults}
                onBack={() => setPracticeTool('hub')}
                onLimitReached={(reason) => setFreemiumModal({ open: true, reason })}
              />
            );
          case 'viva':
            return (
              <VivaPrepView
                profile={profile}
                onBack={() => setPracticeTool('hub')}
              />
            );
          case 'flashcards':
            return (
              <FlashcardsView
                profile={profile}
                decks={decks}
                onBack={() => setPracticeTool('hub')}
              />
            );
          case 'planner':
            return (
              <StudyPlannerView
                profile={profile}
                tasks={tasks}
                onBack={() => setPracticeTool('hub')}
              />
            );
          default:
            return (
              <PracticeHubView
                summaries={summaries}
                quizResults={quizResults}
                decks={decks}
                tasks={tasks}
                onSelectTool={(tool) => setPracticeTool(tool)}
              />
            );
        }
      case 'saved':
        return <SavedMaterialsView items={savedItems} />;
      case 'profile':
        return (
          <ProfileView
            profile={profile}
            quizResults={quizResults}
            decks={decks}
            tasks={tasks}
            onOpenPlans={() => setFreemiumModal({ open: true })}
          />
        );
    }
  };

  return (
    <MobileShell
      activeTab={activeTab}
      onSelectTab={(tab) => {
        setActiveTab(tab);
        if (tab === 'practice') setPracticeTool('hub');
      }}
      showBottomNav
    >
      {renderTabContent()}
      <FreemiumModal
        open={freemiumModal.open}
        reason={freemiumModal.reason}
        onClose={() => setFreemiumModal({ open: false })}
      />
    </MobileShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StudyMateApp />
    </ErrorBoundary>
  );
}
