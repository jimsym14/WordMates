'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, LogIn, LogOut, Settings, UserPlus, BarChart3, Volume2, VolumeX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { useFirebase } from '@/components/firebase-provider';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { isGuestProfile, type UserLanguage } from '@/types/user';
import { cn } from '@/lib/utils';
import { useFriendsModal } from '@/components/friends-modal-provider';
import { useNotifications } from '@/components/notifications-provider';
import { useSound } from '@/components/sound-provider';
import { useOnClickOutside } from '@/hooks/use-onclick-outside';

const initials = (value?: string | null) => {
  if (!value) return 'WM';
  return value
    .split(/\s+/)
    .map((segment) => segment[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

type UserMenuProps = {
  className?: string;
  variant?: 'chip' | 'icon';
};

export function UserMenu({ className, variant = 'chip' }: UserMenuProps) {
  const router = useRouter();
  const { user, profile, signOut, savePreferences } = useFirebase();
  const [language, setLanguage] = useLocalStorage<UserLanguage>('wordmates-lang', 'EN');
  const { openFriendsModal } = useFriendsModal();
  const { unreadCount: notificationCount } = useNotifications();
  const { volume, isMuted, setVolume, setIsMuted, playSound } = useSound();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(menuRef, () => {
    setIsOpen(false);
  });

  useEffect(() => {
    const preferred = profile?.preferences?.language;
    if (!preferred || preferred === language) return;
    setLanguage(preferred);
  }, [language, profile?.preferences?.language, setLanguage]);

  const handleLanguageChange = (value: UserLanguage) => {
    setLanguage(value);
    if (profile && !isGuestProfile(profile)) {
      void savePreferences({ language: value });
    }
  };

  const toggleMenu = () => {
    if (!isOpen) playSound('pop_tap');
    setIsOpen(!isOpen);
  };

  if (!user) {
    if (variant === 'icon') {
      return (
        <Button
          size="icon"
          variant="ghost"
          className={cn('h-12 w-12 rounded-full border border-border/50 text-white', className)}
          onClick={() => router.push('/login')}
          aria-label="Go to login"
        >
          <LogIn className="h-5 w-5" />
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        variant="ghost"
        className={cn('rounded-full border border-border/70 font-semibold', className)}
        onClick={() => router.push('/login')}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Login
      </Button>
    );
  }

  const guest = isGuestProfile(profile);
  const username = profile?.username ?? 'Player';
  const statusLabel = guest ? 'Guest' : 'Signed in';
  const triggerClasses =
    variant === 'icon'
      ? cn('relative flex h-12 w-12 items-center justify-center rounded-full border border-border/40 bg-black/30 p-0 text-white transition-all active:scale-95', className)
      : cn(
        'group flex min-w-[210px] items-center gap-4 rounded-full border border-border/50 px-6 py-4 text-sm font-semibold shadow-sm transition hover:border-border active:scale-95',
        'w-full justify-between sm:w-auto sm:justify-start',
        className
      );
  const avatarClasses = variant === 'icon' ? 'h-10 w-10 border border-border/40 shadow-inner' : 'h-12 w-12 border border-border/40 shadow-inner';

  return (
    <div className="relative inline-block" ref={menuRef}>
      <Button variant="ghost" onClick={toggleMenu} className={triggerClasses}>
        <span className="relative inline-flex">
          <Avatar className={avatarClasses}>
            <AvatarImage src={profile?.photoURL ?? undefined} alt={username} />
            <AvatarFallback>{initials(username)}</AvatarFallback>
          </Avatar>
        </span>
        {variant === 'chip' ? (
          <div className="flex flex-col text-left leading-tight">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-muted-foreground">{statusLabel}</p>
            <p className="text-base font-semibold leading-[1.35]">{username}</p>
          </div>
        ) : (
          <span className="sr-only">{`${statusLabel} as ${username}`}</span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 10, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.98 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute left-full top-0 z-[100] ml-2 w-72 rounded-[24px] border border-white/20 bg-white/80 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-2xl dark:bg-black/80 sm:ml-4"
          >
            <div className="mb-4 flex flex-col items-start gap-1 px-1">
              <p className="text-[0.6rem] uppercase tracking-[0.4em] text-muted-foreground">Profile</p>
              <p className="text-xl font-black tracking-tight">{username}</p>
            </div>

            <div className="space-y-4">
              {/* Sounds Section */}
              <div className="rounded-2xl bg-black/5 p-3 dark:bg-white/5">
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    {isMuted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-primary" />}
                    <span className="text-xs font-bold uppercase tracking-wider">Sound Effects</span>
                  </div>
                  <button 
                    onClick={() => {
                      setIsMuted(!isMuted);
                      playSound('click_pallo');
                    }}
                    className={cn(
                      "rounded-lg px-2 py-1 text-[0.65rem] font-black uppercase transition-colors",
                      isMuted ? "bg-primary text-primary-foreground" : "bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20"
                    )}
                  >
                    {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>
                <div className="flex items-center gap-3 px-1">
                  <Slider 
                    value={[isMuted ? 0 : volume * 100]} 
                    max={100} 
                    step={1} 
                    onValueChange={(vals) => {
                      setVolume(vals[0] / 100);
                      if (isMuted) setIsMuted(false);
                    }}
                    className={cn("w-full cursor-pointer", isMuted && "opacity-50")}
                  />
                  <span className="min-w-[2rem] text-right text-[0.65rem] font-mono font-bold tabular-nums">
                    {isMuted ? '0' : Math.round(volume * 100)}
                  </span>
                </div>
              </div>
 
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={() => {
                    handleLanguageChange(language === 'EN' ? 'EL' : 'EN');
                    playSound('click');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-left">Language</span>
                  <span className="text-[0.6rem] font-black uppercase text-primary">{language === 'EN' ? 'English' : 'Greek'}</span>
                </button>
 
                <button
                  onClick={() => {
                    openFriendsModal();
                    setIsOpen(false);
                    playSound('click');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <span>Friends & chats</span>
                </button>
 
                {!guest && (
                  <>
                    <button
                      onClick={() => {
                        router.push('/statistics');
                        setIsOpen(false);
                        playSound('click');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span>Statistics</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push('/settings');
                        setIsOpen(false);
                        playSound('click');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>Profile settings</span>
                    </button>
                  </>
                )}
 
                <div className="my-1 h-[1px] bg-black/5 dark:bg-white/5" />
 
                <button
                  onClick={() => {
                    void signOut();
                    setIsOpen(false);
                    playSound('quick_pop');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
