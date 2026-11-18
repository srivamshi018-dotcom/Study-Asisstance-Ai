import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Check,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { extractPdfText, summarizeStudyDocument } from '../lib/apiClient';
import {
  deleteSummaryRecord,
  incrementUsageStats,
  saveMaterialItem,
  savePdfAndSummary,
} from '../lib/firestoreService';
import {
  ENGINEERING_CS_SUBJECTS,
  FREE_PLAN_LIMITS,
  type SummaryDoc,
  type UserProfile,
} from '../types';
import { RichAnswer } from './RichAnswer';

interface PdfSummarizerViewProps {
  profile: UserProfile;
  summaries: SummaryDoc[];
  onBack: () => void;
  onLimitReached: (reason: string) => void;
}

type DepthTab = 'short' | 'medium' | 'detailed' | 'points' | 'revision';

export function PdfSummarizerView({
  profile,
  summaries,
  onBack,
  onLimitReached,
}: PdfSummarizerViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [subject, setSubject] = useState(
    profile.subjects?.[0] || ENGINEERING_CS_SUBJECTS[0]
  );
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [extractedText, setExtractedText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSummary, setActiveSummary] = useState<SummaryDoc | null>(null);
  const [depthTab, setDepthTab] = useState<DepthTab>('short');
  const [savedFlag, setSavedFlag] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setExtracting(true);
    setFileName(file.name);
    setFileSize(file.size);

    try {
      const result = await extractPdfText(file);
      setFileName(result.fileName);
      setFileSize(result.fileSize);
      setPageCount(result.pageCount);
      setExtractedText(result.text);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to read PDF. You can paste study text below.'
      );
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateSummary = async () => {
    if ((profile.dailyPdfSummaries || 0) >= FREE_PLAN_LIMITS.dailyPdfSummaries) {
      onLimitReached(
        `You have reached the Free Plan limit of ${FREE_PLAN_LIMITS.dailyPdfSummaries} PDF summaries today.`
      );
      return;
    }

    if (extractedText.trim().length < 30) {
      setError('Please upload a PDF or paste at least a short paragraph of study material.');
      return;
    }

    setError(null);
    setSummarizing(true);
    setSavedFlag(false);

    try {
      const effectiveName = fileName || `${subject} Notes.pdf`;
      const result = await summarizeStudyDocument({
        text: extractedText,
        fileName: effectiveName,
        subject,
      });

      const summaryId = await savePdfAndSummary(
        profile.userId,
        {
          fileName: effectiveName,
          fileSize: fileSize || extractedText.length,
          pageCount: pageCount || 1,
          extractedSnippet: extractedText.slice(0, 3500),
        },
        {
          subject,
          shortSummary: result.shortSummary,
          mediumSummary: result.mediumSummary,
          detailedSummary: result.detailedSummary,
          keyPoints: result.keyPoints || [],
          definitions: result.definitions || [],
          revisionNotes: result.revisionNotes || result.shortSummary,
        }
      );

      await incrementUsageStats(profile.userId, profile, { pdfSummaries: 1 });

      setActiveSummary({
        id: summaryId,
        userId: profile.userId,
        pdfId: '',
        fileName: effectiveName,
        subject,
        shortSummary: result.shortSummary,
        mediumSummary: result.mediumSummary,
        detailedSummary: result.detailedSummary,
        keyPoints: result.keyPoints || [],
        definitions: result.definitions || [],
        revisionNotes: result.revisionNotes || '',
      });
      setDepthTab('short');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to summarize document.');
    } finally {
      setSummarizing(false);
    }
  };

  const handleSaveToMaterials = async () => {
    if (!activeSummary || savedFlag) return;
    try {
      const formatted = `### Short Summary\n${activeSummary.shortSummary}\n\n### Detailed Breakdown\n${activeSummary.detailedSummary}\n\n### Key Points\n${activeSummary.keyPoints.map((p) => `- ${p}`).join('\n')}\n\n### Key Definitions\n${activeSummary.definitions.map((d) => `- **${d.term}**: ${d.definition}`).join('\n')}\n\n### Revision Notes\n${activeSummary.revisionNotes}`;
      await saveMaterialItem(profile.userId, {
        type: 'summary',
        title: `${activeSummary.fileName} Summary`,
        subject: activeSummary.subject,
        content: formatted,
        referenceId: activeSummary.id,
      });
      setSavedFlag(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save summary.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0F111D]">
      <header className="shrink-0 h-14 px-4 border-b border-[#E6E7F2] dark:border-[#23273E] flex items-center gap-2">
        <button
          type="button"
          onClick={activeSummary ? () => setActiveSummary(null) : onBack}
          aria-label="Back"
          className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#20213A] dark:text-white hover:bg-[#F3F4FA] dark:hover:bg-[#191C2F] cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold font-display text-[#20213A] dark:text-white truncate">
          {activeSummary ? activeSummary.fileName : 'PDF Summarizer'}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-8">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {activeSummary ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5]">
                {activeSummary.subject} · Multi-depth Study Notes
              </p>
              <button
                type="button"
                onClick={handleSaveToMaterials}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl bg-[#F1EFFF] dark:bg-[#25224A] text-xs font-semibold text-[#6256E8] dark:text-[#A49CFF] cursor-pointer"
              >
                {savedFlag ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save Summary</span>
                  </>
                )}
              </button>
            </div>

            {/* Segmented Depth Control */}
            <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-[#F2F3FA] dark:bg-[#181B2E]">
              {(
                [
                  ['short', 'Short'],
                  ['medium', 'Medium'],
                  ['detailed', 'Detailed'],
                  ['points', 'Key Points'],
                  ['revision', 'Revision'],
                ] as [DepthTab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDepthTab(key)}
                  className={`min-h-[38px] px-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    depthTab === key
                      ? 'bg-white dark:bg-[#252842] text-[#20213A] dark:text-white shadow-xs'
                      : 'text-[#6A6E8A] dark:text-[#8E93B5]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] p-4 space-y-4">
              {depthTab === 'short' && <RichAnswer content={activeSummary.shortSummary} />}
              {depthTab === 'medium' && <RichAnswer content={activeSummary.mediumSummary} />}
              {depthTab === 'detailed' && <RichAnswer content={activeSummary.detailedSummary} />}
              {depthTab === 'revision' && <RichAnswer content={activeSummary.revisionNotes} />}
              {depthTab === 'points' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
                      Important Points
                    </h3>
                    <ul className="space-y-2">
                      {activeSummary.keyPoints.map((pt, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-[#2E304F] dark:text-[#D5D7EA]"
                        >
                          <span className="text-[#6256E8] font-bold">·</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {activeSummary.definitions.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-[#E6E7F2] dark:border-[#24283F]">
                      <h3 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
                        Key Definitions
                      </h3>
                      <div className="space-y-2.5">
                        {activeSummary.definitions.map((def, i) => (
                          <div key={i} className="text-sm">
                            <span className="font-semibold text-[#20213A] dark:text-white">
                              {def.term}:{' '}
                            </span>
                            <span className="text-[#5A5D7A] dark:text-[#9CA0BD]">
                              {def.definition}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Upload Box */}
            <div className="rounded-2xl border border-dashed border-[#6256E8]/45 bg-[#F8F8FF] dark:bg-[#171A2F] p-5 text-center space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-11 h-11 rounded-2xl bg-[#F1EFFF] dark:bg-[#25224A] text-[#6256E8] dark:text-[#A49CFF] flex items-center justify-center mx-auto">
                {extracting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#20213A] dark:text-white">
                  {fileName ? fileName : 'Upload a Study PDF'}
                </p>
                <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5]">
                  {fileName
                    ? `${pageCount} pages · ${Math.max(1, Math.round(fileSize / 1024))} KB extracted`
                    : 'Lecture slides, textbook chapters, or lab manuals (up to 15 MB)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={extracting}
                className="min-h-[44px] px-4 rounded-xl bg-white dark:bg-[#222640] border border-[#E2E4F0] dark:border-[#303556] text-xs font-semibold text-[#6256E8] dark:text-[#A49CFF] hover:bg-[#F1EFFF] transition-colors cursor-pointer"
              >
                {extracting ? 'Extracting PDF text...' : fileName ? 'Choose Different PDF' : 'Select PDF File'}
              </button>
            </div>

            <div className="space-y-3">
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
                  Extracted Text / Paste Notes
                </label>
                <textarea
                  rows={5}
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  placeholder="PDF text appears here automatically, or paste lecture notes to summarize..."
                  className="w-full p-3.5 rounded-xl border border-[#E2E4F0] dark:border-[#2A2E47] bg-[#F8F8FC] dark:bg-[#16192A] text-sm text-[#20213A] dark:text-white focus:outline-none focus:border-[#6256E8]"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={summarizing || extracting}
                className="w-full min-h-[48px] rounded-xl bg-[#6256E8] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#5246D8] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {summarizing && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{summarizing ? 'Generating Summaries...' : 'Generate Summaries & Notes'}</span>
              </button>
            </div>

            {/* Past Summaries */}
            <section className="space-y-2.5 pt-2">
              <h2 className="text-sm font-semibold font-display text-[#20213A] dark:text-white">
                Recent PDF Summaries
              </h2>
              {summaries.length === 0 ? (
                <div className="p-4 rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-[#F8F8FC] dark:bg-[#16192A] text-xs text-[#6A6E8A] dark:text-[#8E93B5] text-center">
                  No PDF summaries yet. Upload a document above to create your first study guide.
                </div>
              ) : (
                <div className="divide-y divide-[#ECEEF6] dark:divide-[#23273E] rounded-2xl border border-[#E6E7F2] dark:border-[#24283F] bg-white dark:bg-[#141728] overflow-hidden">
                  {summaries.map((sum) => (
                    <div
                      key={sum.id}
                      onClick={() => {
                        setActiveSummary(sum);
                        setSavedFlag(false);
                        setDepthTab('short');
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setActiveSummary(sum);
                      }}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#F8F8FC] dark:hover:bg-[#1A1E33] cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#F1EFFF] dark:bg-[#25224A] text-[#6256E8] dark:text-[#A49CFF] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#20213A] dark:text-white truncate">
                            {sum.fileName}
                          </p>
                          <p className="text-xs text-[#6A6E8A] dark:text-[#8E93B5] truncate">
                            {sum.subject} · {sum.keyPoints?.length || 0} key points
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteSummaryRecord(sum.id);
                        }}
                        aria-label="Delete summary"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8E93B5] hover:text-red-500 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
