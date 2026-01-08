'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isChunkError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Check if this is a chunk loading error
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message?.includes('ChunkLoadError') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('ERR_NAME_NOT_RESOLVED');

    return {
      hasError: true,
      error,
      isChunkError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // If it's a chunk error and we're on the root page, try to redirect
    if (this.state.isChunkError && typeof window !== 'undefined') {
      if (window.location.pathname === '/' || window.location.pathname === '') {
        // Try reloading first
        if (sessionStorage.getItem('chunkErrorRetry') !== 'true') {
          sessionStorage.setItem('chunkErrorRetry', 'true');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }

        // If retry failed, redirect to login
        sessionStorage.removeItem('chunkErrorRetry');
        window.location.href = '/login';
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.state.isChunkError) {
        return (
          <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold mb-4">Loading Error</h1>
              <p className="text-gray-600 mb-4">
                There was an issue loading the application. Please try refreshing the page.
              </p>
              <button
                onClick={() => {
                  sessionStorage.removeItem('chunkErrorRetry');
                  window.location.reload();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, isChunkError: false });
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

