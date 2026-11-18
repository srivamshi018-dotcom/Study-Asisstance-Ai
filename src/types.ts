export type NavTab = 'home' | 'tutor' | 'practice' | 'saved' | 'profile';

export type PracticeTool =
  | 'hub'
  | 'quiz'
  | 'viva'
  | 'flashcards'
  | 'pdf'
  | 'planner';

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string;
  major: string;
  semester: string;
  subjects: string[];
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  onboardingCompleted: boolean;
  planTier: 'free' | 'premium_preview';
  dailyAiQuestions: number;
  dailyPdfSummaries: number;
  dailyQuizzes: number;
  lastQuotaDate: string;
  studyStreak: number;
  lastActiveDate: string;
  quizzesCompleted: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  followUpQuestions?: string[];
  timestamp: string;
}

export interface ChatHistoryDoc {
  id: string;
  userId: string;
  title: string;
  subject: string;
  messages: ChatMessage[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UploadedPDFDoc {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  extractedSnippet: string;
  createdAt?: unknown;
}

export interface KeyDefinition {
  term: string;
  definition: string;
}

export interface SummaryDoc {
  id: string;
  userId: string;
  pdfId: string;
  fileName: string;
  subject: string;
  shortSummary: string;
  mediumSummary: string;
  detailedSummary: string;
  keyPoints: string[];
  definitions: KeyDefinition[];
  revisionNotes: string;
  createdAt?: unknown;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  subtopic: string;
}

export interface QuizDoc {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionCount: 5 | 10 | 15 | 20;
  questions: QuizQuestion[];
  createdAt?: unknown;
}

export interface QuizResultDoc {
  id: string;
  userId: string;
  quizId: string;
  subject: string;
  topic: string;
  score: number;
  totalQuestions: number;
  selectedAnswers: number[];
  weakAreas: string[];
  feedback: string;
  completedAt?: unknown;
}

export interface VivaItem {
  question: string;
  shortAnswer: string;
  detailedAnswer: string;
  tip: string;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  status: 'new' | 'learned' | 'practice';
}

export interface FlashcardDeckDoc {
  id: string;
  userId: string;
  title: string;
  subject: string;
  cards: FlashcardItem[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudyTaskDoc {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  title: string;
  dueDate: string;
  completed: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SavedMaterialType =
  | 'ai_answer'
  | 'summary'
  | 'quiz'
  | 'flashcard_deck'
  | 'revision_note';

export interface SavedMaterialDoc {
  id: string;
  userId: string;
  type: SavedMaterialType;
  title: string;
  subject: string;
  content: string;
  referenceId: string;
  createdAt?: unknown;
}

export const ENGINEERING_CS_SUBJECTS = [
  'Data Structures & Algorithms',
  'Operating Systems',
  'Database Management (DBMS)',
  'Computer Networks',
  'Object-Oriented Programming',
  'Discrete Mathematics',
  'Digital Logic & Architecture',
  'Software Engineering',
  'Machine Learning Basics',
  'Engineering Mathematics',
];

export const DAILY_MOTIVATIONS = [
  {
    quote: 'Small daily sessions beat overnight cramming. Master one concept cleanly today.',
    focus: 'Consistency builds exam confidence',
  },
  {
    quote: 'If you can explain an algorithm in simple English, you truly understand it.',
    focus: 'Active recall & Feynman technique',
  },
  {
    quote: 'Every tough bug or theorem you solve today is one less surprise on exam day.',
    focus: 'Deep practice over passive reading',
  },
  {
    quote: 'Test yourself early with short quizzes—mistakes during practice are free points later.',
    focus: 'Practice-driven mastery',
  },
];

export const FREE_PLAN_LIMITS = {
  dailyAiQuestions: 15,
  dailyPdfSummaries: 3,
  dailyQuizzes: 5,
};

export const BLUEPRINT_LIMITS = {
  displayName: 100,
  major: 100,
  semester: 40,
  title: 160,
  subject: 80,
  topic: 160,
  taskTitle: 200,
  savedTitle: 200,
  savedContent: 30000,
  snippet: 4000,
  shortSummary: 4000,
  mediumSummary: 10000,
  detailedSummary: 20000,
  revisionNotes: 12000,
  feedback: 2000,
};
