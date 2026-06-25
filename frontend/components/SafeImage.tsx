'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState } from 'react';
import { DEFAULT_IMAGE_FALLBACK, resolveImageSrc } from '@/lib/image-fallbacks';

type SafeImageProps = Omit<ImageProps, 'src'> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function SafeImage({
  src,
  fallbackSrc = DEFAULT_IMAGE_FALLBACK,
  alt,
  onError,
  ...props
}: SafeImageProps) {
  const resolvedSrc = resolveImageSrc(src, fallbackSrc);
  const [currentSrc, setCurrentSrc] = useState(resolvedSrc);

  useEffect(() => {
    setCurrentSrc(resolveImageSrc(src, fallbackSrc));
  }, [src, fallbackSrc]);

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={(event) => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
        onError?.(event);
      }}
    />
  );
}
