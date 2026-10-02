import React from 'react';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  showDots?: boolean;
  onDotsClick?: () => void;
  avatar?: string;
  className?: string;
  transparent?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  showDots = true,
  onDotsClick,
  avatar,
  className = '',
  transparent = false,
}) => {
  const { goBack } = useApp();

  return (
    <header
      className={`w-full z-20 flex-none select-none ${
        transparent ? 'bg-transparent' : 'bg-[#F5F5EC]/90 backdrop-blur-md'
      } ${className}`}
    >
      {/* Top spacing safe area without simulated phone battery/signal bars */}
      <div className="w-full pt-3" />

      {/* Main Top Navigation Header */}
      {(title || showBack || rightAction || avatar) && (
        <div className="flex items-center justify-between px-4 pb-2.5 min-h-[48px]">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {showBack && (
              <button
                type="button"
                onClick={onBack || goBack}
                aria-label="Go back"
                className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-[#20221D] hover:bg-black/5 active:bg-black/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
            )}

            {avatar && (
              <img
                src={avatar}
                alt={title || 'Avatar'}
                className="w-10 h-10 rounded-full object-cover border border-[#E4E5D9]"
              />
            )}

            {title && (
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg font-bold text-[#20221D] truncate leading-tight tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <span className="text-xs text-[#77796F] truncate leading-normal">
                    {subtitle}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1 flex-none ml-2">
            {rightAction}
            {showDots && (
              <button
                type="button"
                onClick={onDotsClick}
                aria-label="More options"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#20221D] hover:bg-black/5 active:bg-black/10 transition-colors"
              >
                <MoreVertical className="w-5 h-5 stroke-[2]" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
