'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseProvider } from '@/components/firebase-provider';
import { ColorStyleProvider } from '@/components/color-style-provider';
import { FriendsModalProvider } from '@/components/friends-modal-provider';
import { RealtimeProvider } from '@/components/realtime-provider';
import { NotificationsProvider } from '@/components/notifications-provider';
import { SoundProvider } from '@/components/sound-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FirebaseProvider>
        <ColorStyleProvider>
          <RealtimeProvider>
            <NotificationsProvider>
              <SoundProvider>
                <FriendsModalProvider>{children}</FriendsModalProvider>
              </SoundProvider>
            </NotificationsProvider>
          </RealtimeProvider>
        </ColorStyleProvider>
      </FirebaseProvider>
    </ThemeProvider>
  );
}
