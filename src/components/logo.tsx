'use client';

import { cn } from '@/lib/utils';
import { GraffitiBackground } from './graffiti-background';
import { useColorStyle } from '@/components/color-style-provider';

export function Logo({ className }: { className?: string }) {
  const { colorStyle } = useColorStyle();
  const logoSrc = colorStyle === 'palomichi' ? '/logo2.png' : '/logo.png';

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* The image is now explicitly placed in a higher stacking context */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt="WordMates Logo"
        width={400}
        height={200}
        className={cn('relative z-10', className)}
      />
    </div>
  );
}
