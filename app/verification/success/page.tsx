'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function VerificationSuccess() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md text-center bg-white p-8 rounded-lg shadow-md">
        <div className="mx-auto mb-6 text-green-500">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-16 w-16 mx-auto" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold mb-4">Email Verified Successfully!</h1>
        
        <p className="text-gray-600 mb-6">
          Your email has been verified. You can now log in to your account.
        </p>
        
        <div className="space-y-4">
          <Button 
            asChild 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Link href="/login">
              Go to Login Page
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.close()}
          >
            Close This Tab
          </Button>
        </div>
      </div>
    </div>
  );
}
