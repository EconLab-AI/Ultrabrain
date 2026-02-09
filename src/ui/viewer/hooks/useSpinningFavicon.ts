import { useEffect, useRef } from 'react';

/**
 * Hook that makes the browser tab favicon spin when isProcessing is true.
 * Uses canvas to rotate the logo image and dynamically update the favicon.
 */
export function useSpinningFavicon(isProcessing: boolean) {
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const rotationRef = useRef(0);
  const originalFaviconRef = useRef<string | null>(null);

  useEffect(() => {
    // Create canvas once
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 32;
      canvasRef.current.height = 32;
    }

    // Load image once (SVG brain logo as data URI)
    if (!imageRef.current) {
      imageRef.current = new Image();
      imageRef.current.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M14.8 3.8C10 3.8 3.5 8.2 3.5 16s6.5 12.2 11.3 12.2Z' fill='%23fff' opacity='.95'/%3E%3Cpath d='M17.2 3.8C22 3.8 28.5 8.2 28.5 16s-6.5 12.2-11.3 12.2Z' fill='%23fff' opacity='.85'/%3E%3Cpath d='M5 9.7q3.6 1.2 9 .4M4.5 16q3.6 1.4 9 .5M5 22.3q3.6 1.1 9 .3M27 9.7q-3.6 1.2-9 .4M27.5 16q-3.6 1.4-9 .5M27 22.3q-3.6 1.1-9 .3' fill='none' stroke='%23000' stroke-width='.4' opacity='.1'/%3E%3Ccircle cx='9' cy='9' r='.9' fill='%23fff' opacity='.5'/%3E%3Ccircle cx='23' cy='9' r='.9' fill='%23fff' opacity='.5'/%3E%3Ccircle cx='16' cy='16' r='1.2' fill='%23fff'/%3E%3C/svg%3E";
    }

    // Store original favicon
    if (!originalFaviconRef.current) {
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) {
        originalFaviconRef.current = link.href;
      }
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const image = imageRef.current;

    if (!ctx) return;

    const updateFavicon = (dataUrl: string) => {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = dataUrl;
    };

    const animate = () => {
      if (!image.complete) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Rotate by ~4 degrees per frame (matches 1.5s for full rotation at 60fps)
      rotationRef.current += (2 * Math.PI) / 90;

      ctx.clearRect(0, 0, 32, 32);
      ctx.save();
      ctx.translate(16, 16);
      ctx.rotate(rotationRef.current);
      ctx.drawImage(image, -16, -16, 32, 32);
      ctx.restore();

      updateFavicon(canvas.toDataURL('image/png'));
      animationRef.current = requestAnimationFrame(animate);
    };

    if (isProcessing) {
      rotationRef.current = 0;
      animate();
    } else {
      // Stop animation and restore original favicon
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (originalFaviconRef.current) {
        updateFavicon(originalFaviconRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isProcessing]);
}
