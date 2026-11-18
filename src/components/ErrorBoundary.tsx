import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && parsed.error) {
        readable = parsed.error;
      }
    } catch {
      // plain error message
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:bg-[#0F111D] text-[#20213A] dark:text-[#F3F4FA]">
          <div className="max-w-sm w-full rounded-2xl border border-[#E5E6F0] dark:border-[#252840] bg-[#F8F8FC] dark:bg-[#171A2B] p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold font-display">Something went wrong</h2>
              <p className="text-sm text-[#5A5D7A] dark:text-[#9CA0BD] break-words">
                {this.state.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#6256E8] text-white text-sm font-medium hover:bg-[#5246D8] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reload StudyMate AI
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
