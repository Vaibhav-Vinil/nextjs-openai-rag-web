'use client';

import { CSSProperties, useEffect } from 'react';

const backgroundStyles: CSSProperties = {
  backgroundColor: '#2596be',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100vw',
  height: '100vh',
  zIndex: -1
};

const overlayStyles: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(2px)',
  zIndex: -1
};

export default function BackgroundImage() {
  // Ensure the background is applied to the html element as well
  useEffect(() => {
    document.documentElement.style.minHeight = '100vh';
    document.body.style.minHeight = '100vh';
    document.body.style.background = 'transparent';
    
    return () => {
      document.documentElement.style.minHeight = '';
      document.body.style.minHeight = '';
      document.body.style.background = '';
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        html, body {
          min-height: 100vh;
          background: transparent !important;
        }
        body > div {
          background: transparent !important;
        }
      `}</style>
      <div 
        style={backgroundStyles}
        aria-hidden="true"
      />
      <div style={overlayStyles} aria-hidden="true" />
    </>
  );
}
