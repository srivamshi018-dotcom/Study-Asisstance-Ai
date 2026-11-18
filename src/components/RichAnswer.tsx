import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface RichAnswerProps {
  content: string;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked
    }
  };

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-[#2D304A] bg-[#161829] text-[#F1F2FA]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1F2238] border-b border-[#2D304A]">
        <span className="text-[11px] font-mono text-[#A6AACB]">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] text-[#C8CBE8] hover:text-white transition-colors py-1 px-1.5 rounded cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[#20213A] dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-[#F1EFFF] dark:bg-[#25224A] text-[#6256E8] dark:text-[#A9A2FF] font-mono text-[12px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function RichAnswer({ content }: RichAnswerProps) {
  const segments = content.split(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g);
  const blocks: React.ReactNode[] = [];

  for (let i = 0; i < segments.length; i += 3) {
    const prose = segments[i];
    if (prose && prose.trim()) {
      const lines = prose.split('\n');
      blocks.push(
        <div key={`prose-${i}`} className="space-y-1.5">
          {lines.map((line, lineIdx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={lineIdx} className="h-1" />;
            if (trimmed.startsWith('### ')) {
              return (
                <h4
                  key={lineIdx}
                  className="text-sm font-semibold font-display text-[#20213A] dark:text-white pt-1.5"
                >
                  {renderInlineFormatting(trimmed.slice(4))}
                </h4>
              );
            }
            if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
              const titleText = trimmed.replace(/^#+\s+/, '');
              return (
                <h3
                  key={lineIdx}
                  className="text-[15px] font-semibold font-display text-[#20213A] dark:text-white pt-2"
                >
                  {renderInlineFormatting(titleText)}
                </h3>
              );
            }
            if (/^[-*•]\s+/.test(trimmed)) {
              return (
                <div key={lineIdx} className="flex items-start gap-2 pl-1">
                  <span className="text-[#6256E8] dark:text-[#9D94FF] mt-0.5 font-bold">·</span>
                  <span className="text-sm leading-relaxed flex-1">
                    {renderInlineFormatting(trimmed.replace(/^[-*•]\s+/, ''))}
                  </span>
                </div>
              );
            }
            if (/^\d+\.\s+/.test(trimmed)) {
              const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
              return (
                <div key={lineIdx} className="flex items-start gap-2 pl-1">
                  <span className="text-xs font-mono font-semibold text-[#6256E8] dark:text-[#9D94FF] mt-1 tabular-nums">
                    {match?.[1]}
                  </span>
                  <span className="text-sm leading-relaxed flex-1">
                    {renderInlineFormatting(match?.[2] || trimmed)}
                  </span>
                </div>
              );
            }
            return (
              <p key={lineIdx} className="text-sm leading-relaxed">
                {renderInlineFormatting(trimmed)}
              </p>
            );
          })}
        </div>
      );
    }

    if (i + 2 < segments.length) {
      const lang = segments[i + 1] || '';
      const code = segments[i + 2] || '';
      blocks.push(<CodeBlock key={`code-${i}`} language={lang} code={code.trimEnd()} />);
    }
  }

  return <div className="space-y-1 text-[#2E304F] dark:text-[#D5D7EA]">{blocks}</div>;
}
