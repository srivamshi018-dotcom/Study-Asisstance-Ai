import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Bot,
  FileText,
  HelpCircle,
  Layers,
  Search,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { deleteSavedMaterial } from '../lib/firestoreService';
import type { SavedMaterialDoc, SavedMaterialType } from '../types';
import { RichAnswer } from './RichAnswer';

interface SavedMaterialsViewProps {
  items: SavedMaterialDoc[];
}

type FilterOption = 'all' | SavedMaterialType;

const FILTERS: { id: FilterOption; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ai_answer', label: 'AI Answers' },
  { id: 'summary', label: 'Summaries' },
  { id: 'quiz', label: 'Quizzes' },
  { id: 'flashcard_deck', label: 'Flashcards' },
  { id: 'revision_note', label: 'Notes' },
];

const TYPE_LABELS: Record<SavedMaterialType, string> = {
  ai_answer: 'AI Answer',
  summary: 'PDF Summary',
  quiz: 'Quiz',
  flashcard_deck: 'Flashcards',
  revision_note: 'Revision Note',
};

function TypeIcon({ type }: { type: SavedMaterialType }) {
  switch (type) {
    case 'ai_answer':
      return <Bot className="w-4 h-4" />;
    case 'summary':
      return <FileText className="w-4 h-4" />;
    case 'quiz':
      return <HelpCircle className="w-4 h-4" />;
    case 'flashcard_deck':
      return <Layers className="w-4 h-4" />;
    case 'revision_note':
      return <StickyNote className="w-4 h-4" />;
  }
}

export function SavedMaterialsView({ items }: SavedMaterialsViewProps) {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [queryText, setQueryText] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedMaterialDoc | null>(null);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return items.filter((item) => {
      const matchesType = filter === 'all' || item.type === filter;
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [items, filter, queryText]);

  if (selectedItem) {
    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0F111D]">
        <header className="shrink-0 h-14 px-4 border-b border-[#E6E7F2] dark:border-[#23273E] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              aria-label="Back to saved list"
              className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#20213A] dark:text-white hover:bg-[#F3F4FA] dark:hover:bg-[#191C2F] cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold font-display text-[#20213A] dark:text-white truncate">
              {selectedItem.title}
            </h1>
          </div>
          <button
            type="button"
            onClick={async () => {
              await deleteSavedMaterial(selectedItem.id);
              setSelectedItem(null);
            }}
            aria-label="Delete saved item"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8E93B5] hover:text-red-500 cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-8">
          <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5]">
            {TYPE_LABELS[selectedItem.type]} · {selectedItem.subject}
          </p>
          <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-4">
            <RichAnswer content={selectedItem.content} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 pb-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display text-[#20213A] dark:text-white">
          Saved Materials
        </h1>
        <p className="text-sm text-[#5A5D7A] dark:text-[#9CA0BD]">
          Your bookmarked AI answers, PDF summaries, quizzes, flashcards, and notes.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#6A6E8A] dark:text-[#8E93B5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="Filter saved materials..."
          className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-[#E4E5F2] dark:border-[#252840] bg-[#F8F8FC] dark:bg-[#16192A] text-sm text-[#20213A] dark:text-white focus:outline-none focus:border-[#6256E8]"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`min-h-[38px] px-3.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              filter === f.id
                ? 'bg-[#6256E8] text-white'
                : 'bg-[#F2F3FA] dark:bg-[#181B2E] text-[#5A5D7A] dark:text-[#9CA0BD]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-8 text-center space-y-2.5">
          <div className="w-11 h-11 rounded-2xl bg-[#F1EFFF] dark:bg-[#25224A] text-[#6256E8] dark:text-[#A49CFF] flex items-center justify-center mx-auto">
            <Bookmark className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-[#20213A] dark:text-white">
            No saved materials yet
          </p>
          <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5] max-w-xs mx-auto leading-relaxed">
            Tap Save on any AI Tutor answer, PDF summary, quiz, or flashcard deck to keep it ready for quick revision.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#ECEEF6] dark:divide-[#23273E] rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-white dark:bg-[#141728] overflow-hidden">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSelectedItem(item);
              }}
              className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[#F8F8FC] dark:hover:bg-[#1A1E33] cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#F1EFFF] dark:bg-[#25224A] text-[#6256E8] dark:text-[#A49CFF] flex items-center justify-center shrink-0">
                  <TypeIcon type={item.type} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#20213A] dark:text-white truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5] truncate mt-0.5">
                    {TYPE_LABELS[item.type]} · {item.subject}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteSavedMaterial(item.id);
                }}
                aria-label="Remove saved item"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8E93B5] hover:text-red-500 cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
