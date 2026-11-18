import React, { useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Loader2,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { generateFlashcards } from '../lib/apiClient';
import {
  createFlashcardDeck,
  deleteFlashcardDeck,
  saveMaterialItem,
  updateFlashcardDeck,
} from '../lib/firestoreService';
import {
  ENGINEERING_CS_SUBJECTS,
  type FlashcardDeckDoc,
  type FlashcardItem,
  type UserProfile,
} from '../types';

interface FlashcardsViewProps {
  profile: UserProfile;
  decks: FlashcardDeckDoc[];
  onBack: () => void;
}

export function FlashcardsView({ profile, decks, onBack }: FlashcardsViewProps) {
  const [subject, setSubject] = useState(
    profile.subjects?.[0] || ENGINEERING_CS_SUBJECTS[0]
  );
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeDeck, setActiveDeck] = useState<FlashcardDeckDoc | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() && !notes.trim()) {
      setError('Enter a topic or paste study notes to create flashcards.');
      return;
    }

    setError(null);
    setLoading(true);
    setSavedFlag(false);

    try {
      const res = await generateFlashcards({
        subject,
        topic: topic.trim(),
        notes: notes.trim(),
        count: 8,
      });

      const cards: FlashcardItem[] = res.cards.map((c, idx) => ({
        id: `fc-${Date.now()}-${idx}`,
        front: c.front,
        back: c.back,
        status: 'new',
      }));

      if (cards.length === 0) {
        throw new Error('No flashcards were generated. Try adding more detail.');
      }

      const deckId = await createFlashcardDeck(
        profile.userId,
        res.deckTitle,
        subject,
        cards
      );

      setActiveDeck({
        id: deckId,
        userId: profile.userId,
        title: res.deckTitle,
        subject,
        cards,
      });
      setCardIndex(0);
      setFlipped(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate flashcards.');
    } finally {
      setLoading(false);
    }
  };

  const markCardStatus = async (status: 'learned' | 'practice') => {
    if (!activeDeck) return;
    const updatedCards = activeDeck.cards.map((c, i) =>
      i === cardIndex ? { ...c, status } : c
    );
    const updatedDeck = { ...activeDeck, cards: updatedCards };
    setActiveDeck(updatedDeck);

    try {
      await updateFlashcardDeck(activeDeck.id, activeDeck.title, updatedCards);
      if (cardIndex < updatedCards.length - 1) {
        setFlipped(false);
        setCardIndex((i) => i + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update card progress.');
    }
  };

  const handleSaveDeck = async () => {
    if (!activeDeck || savedFlag) return;
    const content = activeDeck.cards
      .map((c, i) => `**Card ${i + 1}:** ${c.front}\nAnswer: ${c.back}`)
      .join('\n\n');
    try {
      await saveMaterialItem(profile.userId, {
        type: 'flashcard_deck',
        title: activeDeck.title,
        subject: activeDeck.subject,
        content,
        referenceId: activeDeck.id,
      });
      setSavedFlag(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save flashcard deck.');
    }
  };

  const currentCard = activeDeck?.cards[cardIndex];
  const learnedCount = activeDeck
    ? activeDeck.cards.filter((c) => c.status === 'learned').length
    : 0;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0F111D]">
      <header className="shrink-0 h-14 px-4 border-b border-[#E6E7F2] dark:border-[#23273E] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={activeDeck ? () => setActiveDeck(null) : onBack}
            aria-label="Back"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#20213A] dark:text-white hover:bg-[#F3F4FA] dark:hover:bg-[#191C2F] cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold font-display text-[#20213A] dark:text-white truncate">
            {activeDeck ? activeDeck.title : 'Flashcards'}
          </h1>
        </div>
        {activeDeck && (
          <button
            type="button"
            onClick={handleSaveDeck}
            className="inline-flex items-center gap-1 min-h-[38px] px-2.5 rounded-lg text-xs font-semibold text-[#6256E8] dark:text-[#A49CFF] cursor-pointer shrink-0"
          >
            {savedFlag ? <Check className="w-4 h-4 text-emerald-600" /> : <Bookmark className="w-4 h-4" />}
            <span>{savedFlag ? 'Saved' : 'Save'}</span>
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-8">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {activeDeck && currentCard ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between text-xs text-[#6A6E8A] dark:text-[#8E93B5] tabular-nums">
              <span>
                Card {cardIndex + 1} of {activeDeck.cards.length}
              </span>
              <span>
                Learned: {learnedCount}/{activeDeck.cards.length}
              </span>
            </div>

            {/* 3D Flip Card */}
            <div className="perspective-1000">
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="w-full min-h-[240px] relative cursor-pointer text-left focus:outline-none"
              >
                <div
                  className={`w-full min-h-[240px] transition-transform duration-300 transform-style-3d relative ${
                    flipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* Front */}
                  <div className="absolute inset-0 backface-hidden rounded-3xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-[#6256E8] dark:text-[#A49CFF]">
                      <span>Question</span>
                      <span className="capitalize">
                        {currentCard.status === 'new'
                          ? 'Unreviewed'
                          : currentCard.status === 'learned'
                            ? 'Learned'
                            : 'Need Practice'}
                      </span>
                    </div>
                    <p className="text-lg font-semibold font-display text-[#20213A] dark:text-white text-center leading-snug">
                      {currentCard.front}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 text-xs text-[#6A6E8A] dark:text-[#8E93B5]">
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Tap card to flip</span>
                    </div>
                  </div>

                  {/* Back */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl border border-[#6256E8]/40 bg-[#F1EFFF] dark:bg-[#221F46] p-6 flex flex-col justify-between">
                    <span className="text-xs font-medium text-[#6256E8] dark:text-[#A49CFF]">
                      Answer
                    </span>
                    <p className="text-sm leading-relaxed text-[#20213A] dark:text-white text-center">
                      {currentCard.back}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 text-xs text-[#6256E8] dark:text-[#A49CFF]">
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Tap to see question</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Mastery Controls */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => markCardStatus('practice')}
                className="min-h-[44px] rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs font-semibold cursor-pointer"
              >
                Need Practice
              </button>
              <button
                type="button"
                onClick={() => markCardStatus('learned')}
                className="min-h-[44px] rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold cursor-pointer"
              >
                Mark Learned
              </button>
            </div>

            {/* Previous / Next */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setFlipped(false);
                  setCardIndex((i) => Math.max(0, i - 1));
                }}
                disabled={cardIndex === 0}
                className="flex-1 min-h-[44px] rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFlipped(false);
                  setCardIndex((i) => Math.min(activeDeck.cards.length - 1, i + 1));
                }}
                disabled={cardIndex === activeDeck.cards.length - 1}
                className="flex-1 min-h-[44px] rounded-xl bg-[#6256E8] text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleGenerate} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#5A5D7A] dark:text-[#9CA0BD]">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] text-sm text-[#20213A] dark:text-white focus:outline-none focus:border-[#6256E8]"
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
                  placeholder="e.g. OSI Model Layers, Big-O Notation"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] text-sm text-[#20213A] dark:text-white focus:outline-none focus:border-[#6256E8]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#5A5D7A] dark:text-[#9CA0BD]">
                  Or Paste Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Paste key formulas or paragraphs to turn into flashcards..."
                  className="w-full p-3.5 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] text-sm text-[#20213A] dark:text-white focus:outline-none focus:border-[#6256E8]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] rounded-xl bg-[#6256E8] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#5246D8] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? 'Creating Flashcards...' : 'Generate Flashcard Deck'}</span>
              </button>
            </form>

            {/* Saved Decks */}
            <section className="space-y-2.5 pt-2">
              <h2 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
                Your Flashcard Collections
              </h2>
              {decks.length === 0 ? (
                <div className="p-4 rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] text-xs text-[#6A6E8A] dark:text-[#8E93B5] text-center">
                  No flashcard decks yet. Generate a deck above to start active recall.
                </div>
              ) : (
                <div className="divide-y divide-[#ECEEF6] dark:divide-[#23273E] rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-white dark:bg-[#141728] overflow-hidden">
                  {decks.map((deck) => {
                    const mastered = deck.cards.filter((c) => c.status === 'learned').length;
                    return (
                      <div
                        key={deck.id}
                        onClick={() => {
                          setActiveDeck(deck);
                          setCardIndex(0);
                          setFlipped(false);
                          setSavedFlag(false);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setActiveDeck(deck);
                        }}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#F8F8FC] dark:hover:bg-[#1A1E33] cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#F1EFFF] dark:bg-[#25224A] text-[#6256E8] dark:text-[#A49CFF] flex items-center justify-center shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#20213A] dark:text-white truncate">
                              {deck.title}
                            </p>
                            <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5] truncate">
                              {deck.subject} · {mastered}/{deck.cards.length} learned
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteFlashcardDeck(deck.id);
                          }}
                          aria-label="Delete deck"
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8E93B5] hover:text-red-500 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
