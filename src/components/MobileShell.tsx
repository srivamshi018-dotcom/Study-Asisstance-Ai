import React from 'react';
import {
  Bookmark,
  Bot,
  GraduationCap,
  Home,
  User as UserIcon,
} from 'lucide-react';
import type { NavTab } from '../types';

interface MobileShellProps {
  children: React.ReactNode;
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  showBottomNav?: boolean;
}

const NAV_ITEMS: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'tutor', label: 'AI Tutor', icon: Bot },
  { id: 'practice', label: 'Practice', icon: GraduationCap },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'profile', label: 'Profile', icon: UserIcon },
];

export function MobileShell({
  children,
  activeTab = 'home',
  onSelectTab,
  showBottomNav = false,
}: MobileShellProps) {
  return (
    <div className="min-h-screen w-full bg-[#ECEEF7] dark:bg-[#080A12] md:py-6 md:px-4 flex items-center justify-center">
      <div className="relative w-full h-[100dvh] md:h-[min(860px,calc(100dvh-3rem))] md:max-w-[412px] bg-white dark:bg-[#0F111D] text-[#20213A] dark:text-[#F3F4FA] md:rounded-[34px] md:border md:border-[#DCDFF0] dark:md:border-[#24283F] md:shadow-2xl md:shadow-[#20213A]/10 flex flex-col overflow-hidden">
        {/* Scrollable App Viewport */}
        <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
          {children}
        </main>

        {/* Five-Tab Mobile Bottom Navigation Bar */}
        {showBottomNav && onSelectTab && (
          <nav
            aria-label="Primary Navigation"
            className="shrink-0 h-16 bg-white/95 dark:bg-[#131626]/95 backdrop-blur-md border-t border-[#E6E7F2] dark:border-[#23273E] px-1.5 grid grid-cols-5 items-center z-30"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`flex flex-col items-center justify-center min-h-[44px] rounded-xl transition-colors cursor-pointer ${
                    active
                      ? 'text-[#6256E8] dark:text-[#9D94FF]'
                      : 'text-[#6A6E8A] dark:text-[#8E93B5] hover:text-[#20213A] dark:hover:text-white'
                  }`}
                >
                  <div
                    className={`w-9 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      active ? 'bg-[#F1EFFF] dark:bg-[#25224A]' : 'bg-transparent'
                    }`}
                  >
                    <Icon className="w-[19px] h-[19px]" />
                  </div>
                  <span className="text-[11px] font-medium tracking-tight mt-0.5 whitespace-nowrap shrink-0">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
