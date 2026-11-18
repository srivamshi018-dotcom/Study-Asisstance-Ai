import React from 'react';
import { motion } from 'motion/react';
import { StudyMateLogo } from './StudyMateLogo';

export function SplashScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-between px-8 py-14 bg-white dark:bg-[#0F111D]">
      <div />
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center space-y-5"
      >
        <StudyMateLogo size="lg" />
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold font-display tracking-tight text-[#20213A] dark:text-white">
            StudyMate AI
          </h1>
          <p className="text-sm font-medium text-[#6256E8] dark:text-[#A49CFF]">
            Learn Smarter. Score Better.
          </p>
        </div>
      </motion.div>

      <div className="flex flex-col items-center gap-3 w-full max-w-[180px]">
        <div className="w-full h-1.5 rounded-full bg-[#F1EFFF] dark:bg-[#22253A] overflow-hidden">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
            className="h-full w-1/2 rounded-full bg-[#6256E8]"
          />
        </div>
        <span className="text-xs text-[#6A6E8A] dark:text-[#8E93B5]">
          Preparing your workspace
        </span>
      </div>
    </div>
  );
}
