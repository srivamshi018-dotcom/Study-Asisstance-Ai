import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '4mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const MODEL_NAME = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add it in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleAiError(res: express.Response, err: unknown, fallbackMsg: string) {
  console.error('Gemini API error:', err);
  const message = err instanceof Error ? err.message : fallbackMsg;
  const status = message.includes('GEMINI_API_KEY')
    ? 500
    : message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
      ? 429
      : message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')
        ? 403
        : 500;
  res.status(status).json({ error: message });
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', model: MODEL_NAME });
});

// Extract text from uploaded PDF
app.post('/api/pdf/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Please select a PDF file to upload.' });
      return;
    }
    if (
      req.file.mimetype !== 'application/pdf' &&
      !req.file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      res.status(400).json({ error: 'Only PDF documents (.pdf) are supported.' });
      return;
    }

    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(req.file.buffer));
    const result = await extractText(pdf, { mergePages: true });
    const rawText = Array.isArray(result.text)
      ? result.text.join('\n')
      : String(result.text || '');
    const cleanedText = rawText.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    if (!cleanedText || cleanedText.length < 20) {
      res.status(422).json({
        error:
          'Could not extract selectable text from this PDF (it may be a scanned image). Please paste the text directly below.',
      });
      return;
    }

    res.json({
      fileName: req.file.originalname,
      fileSize: req.file.size,
      pageCount: result.totalPages || 1,
      text: cleanedText.slice(0, 60000),
    });
  } catch (err) {
    console.error('PDF extraction error:', err);
    res.status(500).json({
      error:
        'Unable to read this PDF file. Please try another PDF or paste your study notes directly.',
    });
  }
});

// AI Tutor endpoint
app.post('/api/ai/tutor', async (req, res) => {
  try {
    const { message, subject, history } = req.body as {
      message?: string;
      subject?: string;
      history?: { role: 'user' | 'model'; text: string }[];
    };

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Please enter a question for the AI Tutor.' });
      return;
    }

    const ai = getAiClient();
    const systemInstruction = `You are StudyMate AI, an encouraging and crystal-clear academic tutor for college and university students (especially engineering and computer science undergraduates).
Subject focus: ${subject || 'General Engineering & Computer Science'}.

Guidelines:
- Explain difficult concepts in simple, beginner-friendly English.
- Break complex ideas down step by step with clear headings or numbered steps.
- Use concrete real-world analogies and practical examples wherever possible.
- For programming or algorithm questions, provide clean, well-commented code examples and explain the code line by line / step by step, including time & space complexity when relevant.
- Never invent facts, formulas, or citations. If a question is ambiguous or outside verifiable knowledge, clearly tell the student when you are uncertain and ask what they would like clarified.
- At the end, offer 2–3 concise follow-up questions the student might want to explore next.`;

    const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
    const contents = [
      ...recentHistory.map((turn) => ({
        role: turn.role === 'user' ? 'user' : 'model',
        parts: [{ text: turn.text }],
      })),
      { role: 'user', parts: [{ text: message.trim() }] },
    ];

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: {
              type: Type.STRING,
              description:
                'Clear, beginner-friendly markdown explanation with step-by-step reasoning, examples, and code blocks if applicable.',
            },
            followUpQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 3 helpful follow-up study questions.',
            },
          },
          required: ['answer', 'followUpQuestions'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({
      answer: parsed.answer || 'I could not generate an explanation. Please try rephrasing.',
      followUpQuestions: Array.isArray(parsed.followUpQuestions)
        ? parsed.followUpQuestions.slice(0, 3)
        : [],
    });
  } catch (err) {
    handleAiError(res, err, 'AI Tutor failed to respond. Please try again.');
  }
});

// PDF Summarizer endpoint
app.post('/api/ai/summarize', async (req, res) => {
  try {
    const { text, fileName, subject } = req.body as {
      text?: string;
      fileName?: string;
      subject?: string;
    };

    if (!text || text.trim().length < 30) {
      res.status(400).json({ error: 'Please provide more study text to summarize.' });
      return;
    }

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Document Name: ${fileName || 'Study Notes'}\nSubject: ${subject || 'General'}\n\nStudy Material:\n${text.slice(0, 45000)}`,
      config: {
        systemInstruction:
          'You are StudyMate AI. Summarize the provided academic document accurately in simple, clear English for college students. Never invent details that are not supported by the material; if a section is brief or unclear, reflect that honestly.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shortSummary: {
              type: Type.STRING,
              description: 'A crisp 3-4 sentence overview of the core message.',
            },
            mediumSummary: {
              type: Type.STRING,
              description: 'A structured 2-3 paragraph summary covering main sections.',
            },
            detailedSummary: {
              type: Type.STRING,
              description:
                'A comprehensive, exam-ready breakdown with subheadings and examples.',
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '6 to 12 essential bullet points for quick revision.',
            },
            definitions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING },
                },
                required: ['term', 'definition'],
              },
              description: 'Up to 10 key terms and simple definitions from the text.',
            },
            revisionNotes: {
              type: Type.STRING,
              description: 'Last-minute exam cheat-sheet notes formatted cleanly in markdown.',
            },
          },
          required: [
            'shortSummary',
            'mediumSummary',
            'detailedSummary',
            'keyPoints',
            'definitions',
            'revisionNotes',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    handleAiError(res, err, 'Failed to summarize document.');
  }
});

// Quiz Generator endpoint
app.post('/api/ai/quiz', async (req, res) => {
  try {
    const { subject, topic, count, difficulty } = req.body as {
      subject?: string;
      topic?: string;
      count?: number;
      difficulty?: 'Easy' | 'Medium' | 'Hard';
    };

    const allowedCounts = [5, 10, 15, 20];
    const questionCount = allowedCounts.includes(Number(count)) ? Number(count) : 5;
    const level = ['Easy', 'Medium', 'Hard'].includes(String(difficulty))
      ? difficulty
      : 'Medium';

    if (!topic || !topic.trim()) {
      res.status(400).json({ error: 'Please specify a topic for the quiz.' });
      return;
    }

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Generate exactly ${questionCount} multiple-choice questions for a college student.
Subject: ${subject || 'Computer Science'}
Topic: ${topic.trim()}
Difficulty: ${level}

Requirements:
- Each question must have exactly 4 distinct answer options.
- Include the 0-based index (0, 1, 2, or 3) of the correct option.
- Provide a clear, beginner-friendly explanation for why the correct answer is right.
- Tag each question with a short subtopic label so we can identify areas to improve.`,
      config: {
        systemInstruction:
          'You are an academic assessment generator. Create accurate, unambiguous multiple-choice questions calibrated to the requested difficulty level. Never fabricate impossible facts.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  subtopic: { type: Type.STRING },
                },
                required: ['question', 'options', 'correctIndex', 'explanation', 'subtopic'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.slice(0, questionCount).map((q: Record<string, unknown>) => {
          const opts = Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [];
          while (opts.length < 4) opts.push('None of the above');
          const rawIdx = Number(q.correctIndex);
          const correctIndex =
            Number.isInteger(rawIdx) && rawIdx >= 0 && rawIdx < 4 ? rawIdx : 0;
          return {
            question: String(q.question || ''),
            options: opts,
            correctIndex,
            explanation: String(q.explanation || ''),
            subtopic: String(q.subtopic || topic.trim()),
          };
        })
      : [];

    if (questions.length === 0) {
      res.status(500).json({ error: 'Quiz generation returned no questions. Please retry.' });
      return;
    }

    res.json({ questions });
  } catch (err) {
    handleAiError(res, err, 'Failed to generate quiz.');
  }
});

// Viva Preparation endpoint
app.post('/api/ai/viva', async (req, res) => {
  try {
    const { subject, topic } = req.body as { subject?: string; topic?: string };
    if (!topic || !topic.trim()) {
      res.status(400).json({ error: 'Please select or enter a topic for Viva preparation.' });
      return;
    }

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Generate 8 high-probability oral viva / lab exam questions for a college student.
Subject: ${subject || 'Computer Science'}
Topic: ${topic.trim()}

For each question, provide:
- question: clear examiner-style viva question
- shortAnswer: crisp 1–2 sentence spoken answer in simple English
- detailedAnswer: thorough conceptual explanation with an example or follow-up insight
- tip: practical oral-exam tip (what examiners look for)`,
      config: {
        systemInstruction:
          'You are an experienced university engineering professor helping students prepare for oral viva examinations in simple, confident English.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  shortAnswer: { type: Type.STRING },
                  detailedAnswer: { type: Type.STRING },
                  tip: { type: Type.STRING },
                },
                required: ['question', 'shortAnswer', 'detailedAnswer', 'tip'],
              },
            },
          },
          required: ['items'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({ items: Array.isArray(parsed.items) ? parsed.items : [] });
  } catch (err) {
    handleAiError(res, err, 'Failed to generate viva questions.');
  }
});

// Flashcards Generator endpoint
app.post('/api/ai/flashcards', async (req, res) => {
  try {
    const { subject, topic, notes, count } = req.body as {
      subject?: string;
      topic?: string;
      notes?: string;
      count?: number;
    };

    const cardCount = Math.min(Math.max(Number(count) || 8, 4), 20);
    if ((!topic || !topic.trim()) && (!notes || !notes.trim())) {
      res.status(400).json({ error: 'Please provide a topic or paste study notes.' });
      return;
    }

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Create ${cardCount} high-retention study flashcards.
Subject: ${subject || 'Computer Science'}
Topic: ${topic?.trim() || 'Study Notes'}
${notes ? `\nSource Notes:\n${notes.slice(0, 15000)}` : ''}

Each card must have a concise, thought-provoking question/prompt on the front and a clear, accurate answer on the back.`,
      config: {
        systemInstruction:
          'You are StudyMate AI. Generate crisp, active-recall flashcards optimized for university students.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            deckTitle: { type: Type.STRING },
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                },
                required: ['front', 'back'],
              },
            },
          },
          required: ['deckTitle', 'cards'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({
      deckTitle: parsed.deckTitle || topic?.trim() || 'Study Flashcards',
      cards: Array.isArray(parsed.cards) ? parsed.cards.slice(0, 30) : [],
    });
  } catch (err) {
    handleAiError(res, err, 'Failed to generate flashcards.');
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudyMate AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
