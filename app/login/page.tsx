"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Check for verification status in URL and handle redirection
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const params = new URLSearchParams(window.location.search);
      const verified = params.get('verified');
      const verificationSent = params.get('verification_sent');
      const email = params.get('email');
      const next = params.get('next') || '/';
      const error = params.get('error');
      const message = params.get('message');

      // Check if user is already authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // If user is authenticated and just verified, redirect to the chat
        if (verified === 'true') {
          router.push(next);
          return;
        }
        // If user is authenticated but no verification context, redirect to chat
        router.push('/');
        return;
      }

      // Handle verification success message
      if (verified === 'true') {
        setSuccess('Email verified successfully! Please log in to continue.');
        // Clear the URL parameters to prevent showing the message again on refresh
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      } 
      // Handle verification sent message from signup
      else if (verificationSent === 'true' && email) {
        setSuccess(`A verification link has been sent to ${email}. Please check your email.`);
        // Clear the URL parameters
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
      // Handle errors
      else if (error && message) {
        setError(decodeURIComponent(message));
        if (error === 'verification_required') {
          setRequiresVerification(true);
        }
      }
    };

    checkAuthAndRedirect();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setRequiresVerification(false);
    setLoading(true);

    try {
      // First try to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if the error is due to unverified email
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setRequiresVerification(true);
          setError('Please verify your email before logging in. Check your inbox for the verification link.');
        } else {
          setError(error.message || "Invalid email or password");
        }
        return;
      }

      // Check if email is verified
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.email_confirmed_at) {
        setRequiresVerification(true);
        await supabase.auth.signOut();
        setError('Please verify your email before logging in. Check your inbox for the verification link.');
        return;
      }

      // If we get here, login was successful
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;
      setSuccess('Verification email resent successfully! Check your inbox.');
      setError('');
    } catch (error) {
      console.error('Error resending verification email:', error);
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-4">
          <div className="flex justify-center mb-6">
            <Image
              src="/PvChatbot-logo.png"
              alt="PV Chatbot"
              width={200}
              height={80}
              className="h-20 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-center mb-6">Login to your account</h1>
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
              {success}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
              {requiresVerification && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={loading}
                  className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  {loading ? 'Sending...' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="w-full"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
          <div className="flex justify-between items-center mt-2">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </p>
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot Password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
