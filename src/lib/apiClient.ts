import type { QuizQuestion, VivaItem } from '../types';

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export async function extractPdfText(file: File): Promise<{
  fileName: string;
  fileSize: number;
  pageCount: number;
  text: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/pdf/extract', {
    method: 'POST',
    body: formData,
  });
  return parseJsonResponse(res);
}

export async function askAiTutor(payload: {
  message: string;
  subject: string;
  history: { role: 'user' | 'model'; text: string }[];
}): Promise<{ answer: string; followUpQuestions: string[] }> {
  const res = await fetch('/api/ai/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res);
}

export async function summarizeStudyDocument(payload: {
  text: string;
  fileName: string;
  subject: string;
}): Promise<{
  shortSummary: string;
  mediumSummary: string;
  detailedSummary: string;
  keyPoints: string[];
  definitions: { term: string; definition: string }[];
  revisionNotes: string;
}> {
  const res = await fetch('/api/ai/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res);
}

export async function generateQuiz(payload: {
  subject: string;
  topic: string;
  count: 5 | 10 | 15 | 20;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}): Promise<{ questions: QuizQuestion[] }> {
  const res = await fetch('/api/ai/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res);
}

export async function generateVivaQuestions(payload: {
  subject: string;
  topic: string;
}): Promise<{ items: VivaItem[] }> {
  const res = await fetch('/api/ai/viva', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res);
}

export async function generateFlashcards(payload: {
  subject: string;
  topic?: string;
  notes?: string;
  count?: number;
}): Promise<{
  deckTitle: string;
  cards: { front: string; back: string }[];
}> {
  const res = await fetch('/api/ai/flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res);
}
