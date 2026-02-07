import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';

interface Brain3DProps {
  isProcessing: boolean;
  size?: number;
}

// Lazy-load the full 3D scene to handle WebGL failures gracefully
const Brain3DScene = React.lazy(() => import('./Brain3DScene'));

function BrainLogoFallback({ isProcessing }: { isProcessing: boolean }) {
  return (
    <svg
      className={`logomark ${isProcessing ? 'spinning' : ''}`}
      width="80"
      height="80"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ub-brain-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="50%" stopColor="#cccccc"/>
          <stop offset="100%" stopColor="#999999"/>
        </linearGradient>
        <linearGradient id="ub-node-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="100%" stopColor="#cccccc"/>
        </linearGradient>
      </defs>
      <path d="M 93 20 C 58 20, 16 52, 16 100 C 16 148, 58 180, 93 180 Z" fill="url(#ub-brain-grad)" opacity="0.95"/>
      <path d="M 107 20 C 142 20, 184 52, 184 100 C 184 148, 142 180, 107 180 Z" fill="url(#ub-brain-grad)" opacity="0.88"/>
      <path d="M 30 62 Q 54 73, 87 66" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.30"/>
      <path d="M 26 100 Q 50 113, 87 104" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.30"/>
      <path d="M 30 138 Q 54 148, 87 142" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.30"/>
      <path d="M 170 62 Q 146 73, 113 66" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.30"/>
      <path d="M 174 100 Q 150 113, 113 104" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.30"/>
      <path d="M 170 138 Q 146 148, 113 142" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.30"/>
      <line x1="54" y1="54" x2="100" y2="100" stroke="white" strokeWidth="1.2" opacity="0.18"/>
      <line x1="146" y1="54" x2="100" y2="100" stroke="white" strokeWidth="1.2" opacity="0.18"/>
      <line x1="46" y1="100" x2="100" y2="100" stroke="white" strokeWidth="1.2" opacity="0.18"/>
      <line x1="154" y1="100" x2="100" y2="100" stroke="white" strokeWidth="1.2" opacity="0.18"/>
      <line x1="54" y1="146" x2="100" y2="100" stroke="white" strokeWidth="1.2" opacity="0.15"/>
      <line x1="146" y1="146" x2="100" y2="100" stroke="white" strokeWidth="1.2" opacity="0.15"/>
      <circle cx="54" cy="54" r="4.5" fill="url(#ub-node-glow)" opacity="0.85"/>
      <circle cx="146" cy="54" r="4.5" fill="url(#ub-node-glow)" opacity="0.85"/>
      <circle cx="46" cy="100" r="3.5" fill="url(#ub-node-glow)" opacity="0.75"/>
      <circle cx="154" cy="100" r="3.5" fill="url(#ub-node-glow)" opacity="0.75"/>
      <circle cx="54" cy="146" r="3.5" fill="url(#ub-node-glow)" opacity="0.70"/>
      <circle cx="146" cy="146" r="3.5" fill="url(#ub-node-glow)" opacity="0.70"/>
      <circle cx="100" cy="100" r="6" fill="white" opacity="0.92"/>
      <circle cx="100" cy="100" r="3.5" fill="url(#ub-brain-grad)" opacity="0.6"/>
    </svg>
  );
}

class Brain3DErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    return this.state.hasError ? this.fallback : this.props.children;
  }
  get fallback() { return this.props.fallback; }
}

export function Brain3D({ isProcessing, size = 120 }: Brain3DProps) {
  const [webGLAvailable, setWebGLAvailable] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) setWebGLAvailable(false);
    } catch {
      setWebGLAvailable(false);
    }
  }, []);

  if (!webGLAvailable) {
    return <BrainLogoFallback isProcessing={isProcessing} />;
  }

  return (
    <Brain3DErrorBoundary fallback={<BrainLogoFallback isProcessing={isProcessing} />}>
      <Suspense fallback={<BrainLogoFallback isProcessing={isProcessing} />}>
        <div className="brain-3d-container" style={{ width: size, height: size }}>
          <Brain3DScene isProcessing={isProcessing} />
        </div>
      </Suspense>
    </Brain3DErrorBoundary>
  );
}
