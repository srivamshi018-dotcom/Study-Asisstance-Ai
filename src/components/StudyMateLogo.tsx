import React from 'react';

interface StudyMateLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export function StudyMateLogo({ size = 'md' }: StudyMateLogoProps) {
  const dims =
    size === 'lg' ? 'w-16 h-16 rounded-2xl' : size === 'sm' ? 'w-9 h-9 rounded-xl' : 'w-12 h-12 rounded-2xl';
  const svgSize = size === 'lg' ? 'w-9 h-9' : size === 'sm' ? 'w-5 h-5' : 'w-7 h-7';

  return (
    <div
      className={`${dims} bg-[#6256E8] text-white flex items-center justify-center shadow-sm shadow-[#6256E8]/25 shrink-0`}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={svgSize}
        aria-hidden="true"
      >
        <path
          d="M6 9.5C6 7.567 7.567 6 9.5 6H15V25.5H9.5C7.567 25.5 6 23.933 6 22V9.5Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M26 9.5C26 7.567 24.433 6 22.5 6H17V25.5H22.5C24.433 25.5 26 23.933 26 22V9.5Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M16 11.5L17.4 14.6L20.5 16L17.4 17.4L16 20.5L14.6 17.4L11.5 16L14.6 14.6L16 11.5Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
