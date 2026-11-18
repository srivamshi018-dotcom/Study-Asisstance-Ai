import React from 'react';
import {
  CalendarCheck2,
  ChevronRight,
  FileText,
  HelpCircle,
  Layers,
  Mic,
} from 'lucide-react';
import type {
  FlashcardDeckDoc,
  PracticeTool,
  QuizResultDoc,
  StudyTaskDoc,
  SummaryDoc,
} from '../types';

interface PracticeHubViewProps {
  summaries: SummaryDoc[];
  quizResults: QuizResultDoc[];
  decks: FlashcardDeckDoc[];
  tasks: StudyTaskDoc[];
  onSelectTool: (tool: PracticeTool) => void;
}

export function PracticeHubView({
  summaries,
  quizResults,
  decks,
  tasks,
  onSelectTool,
}: PracticeHubViewProps) {
  const pendingTasks = tasks.filter((t) => !t.completed).length;

  const tools: {
    id: PracticeTool;
    title: string;
    description: string;
    stat: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'quiz',
      title: 'Quiz Generator',
      description: 'Generate 5–20 MCQs by subject, topic, and difficulty with explanations.',
      stat: `${quizResults.length} completed`,
      icon: HelpCircle,
    },
    {
      id: 'viva',
      title: 'Viva Preparation',
      description: 'Oral exam questions with concise spoken and detailed answers.',
      stat: 'Practice mode ready',
      icon: Mic,
    },
    {
      id: 'flashcards',
      title: 'Flashcards',
      description: 'Flip cards from topics or notes and mark Learned vs Need Practice.',
      stat: `${decks.length} saved decks`,
      icon: Layers,
    },
    {
      id: 'pdf',
      title: 'PDF Summarizer',
      description: 'Extract lecture PDFs into short, medium, detailed & revision notes.',
      stat: `${summaries.length} summaries`,
      icon: FileText,
    },
    {
      id: 'planner',
      title: 'Study Planner',
      description: 'Organize subjects, deadlines, and track daily & weekly progress.',
      stat: `${pendingTasks} upcoming tasks`,
      icon: CalendarCheck2,
    },
  ];

  return (
    <div className="p-5 space-y-5 pb-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display text-[#20213A] dark:text-white">
          Practice & Study Suite
        </h1>
        <p className="text-sm text-[#5A5D7A] dark:text-[#9CA0BD]">
          Choose a learning tool to prepare for exams, labs, and oral vivas.
        </p>
      </div>

      <div className="space-y-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTool(tool.id)}
              className="w-full p-4 rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-white dark:bg-[#141728] hover:border-[#6256E8]/60 hover:bg-[#F9F8FF] dark:hover:bg-[#1A1E35] text-left flex items-center gap-3.5 transition-colors cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-[#F1EFFF] dark:bg-[#25224A] text-[#6256E8] dark:text-[#A49CFF] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#20213A] dark:text-white truncate">
                    {tool.title}
                  </p>
                  <span className="text-[11px] font-medium text-[#6256E8] dark:text-[#A49CFF] shrink-0">
                    {tool.stat}
                  </span>
                </div>
                <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5] mt-1 line-clamp-2 leading-relaxed">
                  {tool.description}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8E93B5] shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
