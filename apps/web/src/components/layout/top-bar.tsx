'use client';

import { Bell, Building2, ChevronDown, LogOut, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PlaceholderMenu } from './placeholder-menu';

export interface TopBarProps {
  title: string;
  /** Shows the hamburger (< 1024px). */
  showMenuButton: boolean;
  menuOpen: boolean;
  menuControlsId: string;
  onMenuClick: () => void;
  menuButtonRef: React.Ref<HTMLButtonElement>;
}

/** 56px top bar. Company switcher, notifications and user menu are marked placeholders. */
export function TopBar({
  title,
  showMenuButton,
  menuOpen,
  menuControlsId,
  onMenuClick,
  menuButtonRef,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-line bg-surface px-4 sm:gap-3 sm:px-6">
      {showMenuButton ? (
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          aria-controls={menuControlsId}
          aria-haspopup="dialog"
          onClick={onMenuClick}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), '-ml-2')}
        >
          <Menu className="size-[18px]" strokeWidth={1.75} aria-hidden />
        </button>
      ) : null}

      <h1 className="min-w-0 flex-1 truncate text-h1 font-semibold text-ink">{title}</h1>

      <PlaceholderMenu
        label="Company switcher"
        title="Company switcher"
        description="Switching between companies is not connected yet. It will appear here once multi-company access is built."
        triggerClassName={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'max-md:px-2')}
        trigger={
          <>
            <Building2 aria-hidden strokeWidth={1.75} />
            <span className="max-md:hidden">Company</span>
            <ChevronDown aria-hidden strokeWidth={1.75} className="max-md:hidden" />
          </>
        }
      />

      <PlaceholderMenu
        label="Notifications"
        title="Notifications"
        description="Notifications are not connected yet."
        triggerClassName={buttonVariants({ variant: 'ghost', size: 'icon' })}
        trigger={<Bell className="size-[18px]" strokeWidth={1.75} aria-hidden />}
      />

      <ThemeToggle className="max-sm:hidden" />

      <button
        type="button"
        aria-label="Sign out"
        title="Sign out"
        onClick={async () => {
          const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
          const csrf = document.cookie.split('; ').find((row) => row.startsWith('gsc_csrf='))?.slice('gsc_csrf='.length) ?? '';
          await fetch(`${api}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'X-CSRF-Token': csrf },
          }).catch(() => undefined);
          window.location.assign('/login');
        }}
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full')}
      >
        <LogOut className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </button>
      <Avatar name="Account" size="lg" />
    </header>
  );
}
