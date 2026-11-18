import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  BLUEPRINT_LIMITS,
  type ChatHistoryDoc,
  type ChatMessage,
  type FlashcardDeckDoc,
  type FlashcardItem,
  type QuizDoc,
  type QuizResultDoc,
  type SavedMaterialDoc,
  type SavedMaterialType,
  type StudyTaskDoc,
  type SummaryDoc,
  type UserProfile,
} from '../types';

function clampStr(value: string | undefined | null, maxLen: number, fallback = ''): string {
  const s = (value ?? fallback).trim();
  if (!s && fallback) return fallback.slice(0, maxLen);
  return s.slice(0, maxLen);
}

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toMillis(ts: unknown): number {
  if (!ts) return 0;
  if (ts instanceof Timestamp) return ts.toMillis();
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return Number((ts as { seconds: number }).seconds) * 1000;
  }
  return 0;
}

export async function ensureUserProfile(firebaseUser: User): Promise<UserProfile> {
  const path = `users/${firebaseUser.uid}`;
  const ref = doc(db, 'users', firebaseUser.uid);
  const today = getTodayIso();

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const initialProfile: UserProfile = {
        userId: firebaseUser.uid,
        displayName: clampStr(
          firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          BLUEPRINT_LIMITS.displayName,
          'Student'
        ),
        email: clampStr(firebaseUser.email, 200, 'student@example.com'),
        photoURL: clampStr(firebaseUser.photoURL, 1000, ''),
        major: 'Computer Science & Engineering',
        semester: 'Semester 4',
        subjects: [
          'Data Structures & Algorithms',
          'Operating Systems',
          'Database Management (DBMS)',
          'Computer Networks',
        ],
        theme: 'light',
        notificationsEnabled: true,
        onboardingCompleted: false,
        planTier: 'free',
        dailyAiQuestions: 0,
        dailyPdfSummaries: 0,
        dailyQuizzes: 0,
        lastQuotaDate: today,
        studyStreak: 1,
        lastActiveDate: today,
        quizzesCompleted: 0,
      };
      await setDoc(ref, {
        ...initialProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return initialProfile;
    }

    const data = snap.data() as UserProfile;
    // Reset daily quota and update study streak if date changed
    const needsQuotaReset = data.lastQuotaDate !== today;
    const needsStreakUpdate = data.lastActiveDate !== today;

    if (needsQuotaReset || needsStreakUpdate) {
      const yesterday = getYesterdayIso();
      const nextStreak =
        data.lastActiveDate === yesterday
          ? (data.studyStreak || 1) + 1
          : data.lastActiveDate === today
            ? data.studyStreak || 1
            : 1;

      const patch = {
        dailyAiQuestions: needsQuotaReset ? 0 : data.dailyAiQuestions ?? 0,
        dailyPdfSummaries: needsQuotaReset ? 0 : data.dailyPdfSummaries ?? 0,
        dailyQuizzes: needsQuotaReset ? 0 : data.dailyQuizzes ?? 0,
        lastQuotaDate: today,
        studyStreak: nextStreak,
        lastActiveDate: today,
        quizzesCompleted: data.quizzesCompleted ?? 0,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(ref, patch);
      return { ...data, ...patch };
    }

    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserProfile(
  userId: string,
  onData: (profile: UserProfile | null) => void
): Unsubscribe {
  const path = `users/${userId}`;
  return onSnapshot(
    doc(db, 'users', userId),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export async function updateStudentAcademicProfile(
  userId: string,
  payload: {
    displayName: string;
    photoURL: string;
    major: string;
    semester: string;
    subjects: string[];
    onboardingCompleted: boolean;
  }
): Promise<void> {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, 'users', userId), {
      displayName: clampStr(payload.displayName, BLUEPRINT_LIMITS.displayName, 'Student'),
      photoURL: clampStr(payload.photoURL, 1000, ''),
      major: clampStr(payload.major, BLUEPRINT_LIMITS.major, 'Engineering'),
      semester: clampStr(payload.semester, BLUEPRINT_LIMITS.semester, 'Semester 1'),
      subjects: payload.subjects.slice(0, 15).map((s) => clampStr(s, 80, 'General')),
      onboardingCompleted: Boolean(payload.onboardingCompleted),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserPreferences(
  userId: string,
  payload: { theme: 'light' | 'dark'; notificationsEnabled: boolean }
): Promise<void> {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, 'users', userId), {
      theme: payload.theme,
      notificationsEnabled: payload.notificationsEnabled,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function incrementUsageStats(
  userId: string,
  current: UserProfile,
  delta: {
    aiQuestions?: number;
    pdfSummaries?: number;
    quizzes?: number;
    quizzesCompleted?: number;
  }
): Promise<void> {
  const path = `users/${userId}`;
  const today = getTodayIso();
  const isNewDay = current.lastQuotaDate !== today;

  try {
    await updateDoc(doc(db, 'users', userId), {
      dailyAiQuestions: Math.min(
        50,
        (isNewDay ? 0 : current.dailyAiQuestions || 0) + (delta.aiQuestions || 0)
      ),
      dailyPdfSummaries: Math.min(
        20,
        (isNewDay ? 0 : current.dailyPdfSummaries || 0) + (delta.pdfSummaries || 0)
      ),
      dailyQuizzes: Math.min(
        20,
        (isNewDay ? 0 : current.dailyQuizzes || 0) + (delta.quizzes || 0)
      ),
      lastQuotaDate: today,
      studyStreak: current.studyStreak || 1,
      lastActiveDate: today,
      quizzesCompleted: (current.quizzesCompleted || 0) + (delta.quizzesCompleted || 0),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ChatHistory
export function subscribeChatHistory(
  userId: string,
  onData: (items: ChatHistoryDoc[]) => void
): Unsubscribe {
  const path = 'chatHistory';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ChatHistoryDoc, 'id'>) }))
        .sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function createChatSession(
  userId: string,
  title: string,
  subject: string,
  messages: ChatMessage[]
): Promise<string> {
  const path = 'chatHistory';
  try {
    const docRef = await addDoc(collection(db, path), {
      userId,
      title: clampStr(title, BLUEPRINT_LIMITS.title, 'Study Question'),
      subject: clampStr(subject, BLUEPRINT_LIMITS.subject, 'Computer Science'),
      messages: messages.slice(-100),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateChatSession(
  chatId: string,
  title: string,
  messages: ChatMessage[]
): Promise<void> {
  const path = `chatHistory/${chatId}`;
  try {
    await updateDoc(doc(db, 'chatHistory', chatId), {
      title: clampStr(title, BLUEPRINT_LIMITS.title, 'Study Question'),
      messages: messages.slice(-100),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteChatSession(chatId: string): Promise<void> {
  const path = `chatHistory/${chatId}`;
  try {
    await deleteDoc(doc(db, 'chatHistory', chatId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// UploadedPDFs & Summaries
export function subscribeSummaries(
  userId: string,
  onData: (items: SummaryDoc[]) => void
): Unsubscribe {
  const path = 'summaries';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<SummaryDoc, 'id'>) }))
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function savePdfAndSummary(
  userId: string,
  pdfMeta: {
    fileName: string;
    fileSize: number;
    pageCount: number;
    extractedSnippet: string;
  },
  summaryData: {
    subject: string;
    shortSummary: string;
    mediumSummary: string;
    detailedSummary: string;
    keyPoints: string[];
    definitions: { term: string; definition: string }[];
    revisionNotes: string;
  }
): Promise<string> {
  try {
    const pdfRef = await addDoc(collection(db, 'uploadedPDFs'), {
      userId,
      fileName: clampStr(pdfMeta.fileName, 200, 'StudyNotes.pdf'),
      fileSize: Math.max(0, Math.min(50000000, Math.round(pdfMeta.fileSize))),
      pageCount: Math.max(1, Math.min(2000, Math.round(pdfMeta.pageCount))),
      extractedSnippet: clampStr(
        pdfMeta.extractedSnippet,
        BLUEPRINT_LIMITS.snippet,
        'Study material text'
      ),
      createdAt: serverTimestamp(),
    });

    const summaryRef = await addDoc(collection(db, 'summaries'), {
      userId,
      pdfId: pdfRef.id,
      fileName: clampStr(pdfMeta.fileName, 200, 'StudyNotes.pdf'),
      subject: clampStr(summaryData.subject, BLUEPRINT_LIMITS.subject, 'General'),
      shortSummary: clampStr(
        summaryData.shortSummary,
        BLUEPRINT_LIMITS.shortSummary,
        'Summary unavailable'
      ),
      mediumSummary: clampStr(
        summaryData.mediumSummary,
        BLUEPRINT_LIMITS.mediumSummary,
        'Summary unavailable'
      ),
      detailedSummary: clampStr(
        summaryData.detailedSummary,
        BLUEPRINT_LIMITS.detailedSummary,
        'Summary unavailable'
      ),
      keyPoints: (summaryData.keyPoints || [])
        .slice(0, 25)
        .map((p) => clampStr(p, 400, 'Key point')),
      definitions: (summaryData.definitions || []).slice(0, 25).map((d) => ({
        term: clampStr(d.term, 150, 'Term'),
        definition: clampStr(d.definition, 600, 'Definition'),
      })),
      revisionNotes: clampStr(
        summaryData.revisionNotes,
        BLUEPRINT_LIMITS.revisionNotes,
        'Revision notes'
      ),
      createdAt: serverTimestamp(),
    });

    return summaryRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'summaries');
  }
}

export async function deleteSummaryRecord(summaryId: string): Promise<void> {
  const path = `summaries/${summaryId}`;
  try {
    await deleteDoc(doc(db, 'summaries', summaryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Quizzes & QuizResults
export function subscribeQuizResults(
  userId: string,
  onData: (items: QuizResultDoc[]) => void
): Unsubscribe {
  const path = 'quizResults';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<QuizResultDoc, 'id'>) }))
        .sort((a, b) => toMillis(b.completedAt) - toMillis(a.completedAt));
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function createQuizRecord(
  userId: string,
  payload: Omit<QuizDoc, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const path = 'quizzes';
  try {
    const docRef = await addDoc(collection(db, path), {
      userId,
      subject: clampStr(payload.subject, BLUEPRINT_LIMITS.subject, 'Computer Science'),
      topic: clampStr(payload.topic, BLUEPRINT_LIMITS.topic, 'General Topic'),
      difficulty: payload.difficulty,
      questionCount: payload.questionCount,
      questions: payload.questions.slice(0, 20),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createQuizResultRecord(
  userId: string,
  payload: Omit<QuizResultDoc, 'id' | 'userId' | 'completedAt'>
): Promise<string> {
  const path = 'quizResults';
  try {
    const docRef = await addDoc(collection(db, path), {
      userId,
      quizId: payload.quizId,
      subject: clampStr(payload.subject, BLUEPRINT_LIMITS.subject, 'Computer Science'),
      topic: clampStr(payload.topic, BLUEPRINT_LIMITS.topic, 'General Topic'),
      score: Math.max(0, Math.min(20, Math.round(payload.score))),
      totalQuestions: payload.totalQuestions,
      selectedAnswers: payload.selectedAnswers.slice(0, 20).map((n) => Math.round(n)),
      weakAreas: payload.weakAreas.slice(0, 10).map((w) => clampStr(w, 120, 'Review topic')),
      feedback: clampStr(payload.feedback, BLUEPRINT_LIMITS.feedback, 'Keep practising!'),
      completedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Flashcards
export function subscribeFlashcardDecks(
  userId: string,
  onData: (items: FlashcardDeckDoc[]) => void
): Unsubscribe {
  const path = 'flashcards';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<FlashcardDeckDoc, 'id'>) }))
        .sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function createFlashcardDeck(
  userId: string,
  title: string,
  subject: string,
  cards: FlashcardItem[]
): Promise<string> {
  const path = 'flashcards';
  try {
    const docRef = await addDoc(collection(db, path), {
      userId,
      title: clampStr(title, BLUEPRINT_LIMITS.title, 'Flashcard Deck'),
      subject: clampStr(subject, BLUEPRINT_LIMITS.subject, 'Computer Science'),
      cards: cards.slice(0, 30),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFlashcardDeck(
  deckId: string,
  title: string,
  cards: FlashcardItem[]
): Promise<void> {
  const path = `flashcards/${deckId}`;
  try {
    await updateDoc(doc(db, 'flashcards', deckId), {
      title: clampStr(title, BLUEPRINT_LIMITS.title, 'Flashcard Deck'),
      cards: cards.slice(0, 30),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFlashcardDeck(deckId: string): Promise<void> {
  const path = `flashcards/${deckId}`;
  try {
    await deleteDoc(doc(db, 'flashcards', deckId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// StudyTasks
export function subscribeStudyTasks(
  userId: string,
  onData: (items: StudyTaskDoc[]) => void
): Unsubscribe {
  const path = 'studyTasks';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<StudyTaskDoc, 'id'>) }))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function createStudyTask(
  userId: string,
  payload: { subject: string; topic: string; title: string; dueDate: string }
): Promise<string> {
  const path = 'studyTasks';
  try {
    const docRef = await addDoc(collection(db, path), {
      userId,
      subject: clampStr(payload.subject, BLUEPRINT_LIMITS.subject, 'General'),
      topic: clampStr(payload.topic, 140, 'Study Session'),
      title: clampStr(payload.title, BLUEPRINT_LIMITS.taskTitle, 'Review topic'),
      dueDate: clampStr(payload.dueDate, 30, getTodayIso()),
      completed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleStudyTask(taskId: string, completed: boolean): Promise<void> {
  const path = `studyTasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'studyTasks', taskId), {
      completed,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteStudyTask(taskId: string): Promise<void> {
  const path = `studyTasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'studyTasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// SavedMaterials
export function subscribeSavedMaterials(
  userId: string,
  onData: (items: SavedMaterialDoc[]) => void
): Unsubscribe {
  const path = 'savedMaterials';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<SavedMaterialDoc, 'id'>) }))
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function saveMaterialItem(
  userId: string,
  payload: {
    type: SavedMaterialType;
    title: string;
    subject: string;
    content: string;
    referenceId?: string;
  }
): Promise<string> {
  const path = 'savedMaterials';
  try {
    const docRef = await addDoc(collection(db, path), {
      userId,
      type: payload.type,
      title: clampStr(payload.title, BLUEPRINT_LIMITS.savedTitle, 'Saved Study Item'),
      subject: clampStr(payload.subject, BLUEPRINT_LIMITS.subject, 'Computer Science'),
      content: clampStr(payload.content, BLUEPRINT_LIMITS.savedContent, 'Saved content'),
      referenceId: clampStr(payload.referenceId, 128, ''),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteSavedMaterial(itemId: string): Promise<void> {
  const path = `savedMaterials/${itemId}`;
  try {
    await deleteDoc(doc(db, 'savedMaterials', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
