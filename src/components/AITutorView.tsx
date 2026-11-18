import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  History,
  Loader2,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { askAiTutor } from '../lib/apiClient';
import {
  createChatSession,
  deleteChatSession,
  incrementUsageStats,
  saveMaterialItem,
  updateChatSession,
} from '../lib/firestoreService';
import {
  ENGINEERING_CS_SUBJECTS,
  FREE_PLAN_LIMITS,
  type ChatHistoryDoc,
  type ChatMessage,
  type UserProfile,
} from '../types';
import { RichAnswer } from './RichAnswer';

interface AITutorViewProps {
  profile: UserProfile;
  chats: ChatHistoryDoc[];
  onLimitReached: (reason: string) => void;
}

const SUGGESTED_QUESTIONS = [
  'Explain Binary Search Trees with a step-by-step Python example.',
  'What is the difference between a Process and a Thread in OS?',
  'Explain Database Normalization (1NF, 2NF, 3NF) with simple examples.',
  'How does TCP 3-way handshake work in Computer Networks?',
];

export function AITutorView({ profile, chats, onLimitReached }: AITutorViewProps) {
  const subjects = profile.subjects?.length ? profile.subjects : ENGINEERING_CS_SUBJECTS;
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setError(null);
    setHistoryOpen(false);
  };

  const loadChat = (chat: ChatHistoryDoc) => {
    setActiveChatId(chat.id);
    setSelectedSubject(chat.subject);
    setMessages(chat.messages || []);
    setError(null);
    setHistoryOpen(false);
  };

  const handleSend = async (promptText?: string) => {
    const question = (promptText ?? input).trim();
    if (!question || loading) return;

    if ((profile.dailyAiQuestions || 0) >= FREE_PLAN_LIMITS.dailyAiQuestions) {
      onLimitReached(
        `You have used all ${FREE_PLAN_LIMITS.dailyAiQuestions} free AI Tutor questions for today. Limits reset daily.`
      );
      return;
    }

    setError(null);
    setInput('');

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: question,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role,
        text: m.text,
      }));
      const result = await askAiTutor({
        message: question,
        subject: selectedSubject,
        history: historyPayload,
      });

      const aiMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        text: result.answer,
        followUpQuestions: result.followUpQuestions,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...nextMessages, aiMsg];
      setMessages(finalMessages);

      const chatTitle = nextMessages[0]?.text.slice(0, 72) || 'Study Question';
      if (activeChatId) {
        await updateChatSession(activeChatId, chatTitle, finalMessages);
      } else {
        const newId = await createChatSession(
          profile.userId,
          chatTitle,
          selectedSubject,
          finalMessages
        );
        setActiveChatId(newId);
      }

      await incrementUsageStats(profile.userId, profile, { aiQuestions: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach AI Tutor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnswer = async (msg: ChatMessage, idx: number) => {
    if (savedIds[msg.id]) return;
    const prevQuestion =
      idx > 0 && messages[idx - 1]?.role === 'user'
        ? messages[idx - 1].text
        : `${selectedSubject} Explanation`;

    try {
      await saveMaterialItem(profile.userId, {
        type: 'ai_answer',
        title: prevQuestion.slice(0, 120),
        subject: selectedSubject,
        content: msg.text,
        referenceId: activeChatId || '',
      });
      setSavedIds((prev) => ({ ...prev, [msg.id]: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save answer.');
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteChatSession(chatId);
    if (activeChatId === chatId) {
      startNewChat();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative bg-white dark:bg-[#0F111D]">
      {/* Compact Sticky Top Header */}
      <header className="shrink-0 h-14 px-4 border-b border-[#E6E7F2] dark:border-[#23273E] flex items-center justify-between gap-2 bg-white/95 dark:bg-[#0F111D]/95">
        <div className="min-w-0 flex-1">
          <select
            aria-label="Select study subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full max-w-[210px] text-sm font-semibold font-display text-[#20213A] dark:text-white bg-transparent focus:outline-none truncate cursor-pointer"
          >
            {ENGINEERING_CS_SUBJECTS.map((subj) => (
              <option key={subj} value={subj} className="bg-white dark:bg-[#16192A]">
                {subj}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={startNewChat}
            aria-label="New chat"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#5A5D7A] dark:text-[#9CA0BD] hover:bg-[#F3F4FA] dark:hover:bg-[#191C2F] cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            aria-label="Chat history"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#5A5D7A] dark:text-[#9CA0BD] hover:bg-[#F3F4FA] dark:hover:bg-[#191C2F] cursor-pointer"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="py-4 space-y-5">
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold font-display text-[#20213A] dark:text-white">
                Ask your AI Tutor
              </h1>
              <p className="text-sm text-[#5A5D7A] dark:text-[#9CA0BD]">
                Get simple step-by-step explanations, analogies, and code walkthroughs for any college topic.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#6A6E8A] dark:text-[#8E93B5]">
                Suggested Questions
              </p>
              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="w-full min-h-[48px] p-3.5 rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] hover:border-[#6256E8]/50 text-left text-sm text-[#20213A] dark:text-white transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.role === 'user' ? (
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#6256E8] text-white px-4 py-2.5 text-sm leading-relaxed">
                  {msg.text}
                </div>
              ) : (
                <div className="w-full rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#151829] p-4 space-y-3">
                  <RichAnswer content={msg.text} />

                  <div className="flex items-center justify-between pt-2 border-t border-[#E6E7F2] dark:border-[#24283F]">
                    <span className="text-xs text-[#6A6E8A] dark:text-[#8E93B5]">
                      StudyMate AI · {selectedSubject}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSaveAnswer(msg, idx)}
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-[#6256E8] dark:text-[#A49CFF] hover:bg-[#F1EFFF] dark:hover:bg-[#25224A] transition-colors cursor-pointer"
                    >
                      {savedIds[msg.id] ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 dark:text-emerald-400">Saved</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>Save Answer</span>
                        </>
                      )}
                    </button>
                  </div>

                  {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-medium text-[#6A6E8A] dark:text-[#8E93B5]">
                        Follow-up questions
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {msg.followUpQuestions.map((fq) => (
                          <button
                            key={fq}
                            type="button"
                            onClick={() => handleSend(fq)}
                            className="text-left text-xs px-3 py-2 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-white dark:bg-[#1B1F36] text-[#20213A] dark:text-[#E5E6F5] hover:border-[#6256E8] transition-colors cursor-pointer"
                          >
                            {fq}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#151829] p-4 flex items-center gap-2.5 text-sm text-[#5A5D7A] dark:text-[#9CA0BD]">
            <Loader2 className="w-4 h-4 animate-spin text-[#6256E8]" />
            <span>Writing step-by-step explanation...</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="shrink-0 p-3 border-t border-[#E6E7F2] dark:border-[#23273E] bg-white dark:bg-[#0F111D] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your course..."
          className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] text-sm text-[#20213A] dark:text-white focus:outline-none focus:border-[#6256E8]"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          aria-label="Send question"
          className="min-h-[44px] min-w-[44px] rounded-xl bg-[#6256E8] text-white flex items-center justify-center hover:bg-[#5246D8] disabled:opacity-50 transition-colors cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Chat History Bottom Sheet */}
      {historyOpen && (
        <div
          className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-end"
          role="dialog"
          aria-modal="true"
          aria-label="Chat History"
        >
          <div className="w-full max-h-[75%] bg-white dark:bg-[#141728] rounded-t-3xl border-t border-[#E6E7F2] dark:border-[#262A44] flex flex-col">
            <div className="px-5 py-4 border-b border-[#ECEEF6] dark:border-[#23273E] flex items-center justify-between">
              <h2 className="text-base font-bold font-display text-[#20213A] dark:text-white">
                Chat History
              </h2>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close history"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#5A5D7A] dark:text-[#9CA0BD] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#ECEEF6] dark:divide-[#23273E]">
              {chats.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#6A6E8A] dark:text-[#8E93B5]">
                  Your past AI Tutor conversations will appear here.
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => loadChat(chat)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') loadChat(chat);
                    }}
                    className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#F8F8FC] dark:hover:bg-[#1A1E33] cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#20213A] dark:text-white truncate">
                        {chat.title}
                      </p>
                      <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5] truncate">
                        {chat.subject} · {chat.messages?.length || 0} messages
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      aria-label="Delete conversation"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8E93B5] hover:text-red-500 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
