"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/");
      }
    };
    checkAuth();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address (e.g., user@example.com)");
      setLoading(false);
      return;
    }
    
    // Check for common TLDs to catch obvious typos
    const tldRegex = /\.(com|org|net|io|co|uk|de|fr|in|au|ca|us|gov|edu|mil|biz|info|mobi|name|aero|jobs|museum)$/i;
    const domain = email.split('@')[1];
    if (!tldRegex.test(domain)) {
      setError("Please check the domain in your email address");
      setLoading(false);
      return;
    }

    try {
      // First sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            display_name: displayName,
            phone: phone // Keep in metadata as fallback
          }
        },
      });

      if (signUpError) {
        // Handle specific error cases with more descriptive messages
        if (signUpError.message.includes('Email address') && signUpError.message.includes('is invalid')) {
          throw new Error('Please enter a properly formatted email address (e.g., user@example.com)');
        } else if (signUpError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please use a different email or try logging in.');
        } else if (signUpError.message.includes('domain')) {
          throw new Error('The email domain appears to be invalid. Please check for typos.');
        }
        // For all other errors, use the original message but clean it up
        throw new Error(signUpError.message.replace('AuthApiError: ', ''));
      }

      // If we have a user and phone was provided, update the phone in auth.users
      if (authData?.user && phone) {
        try {
          // Call the server-side function to update the phone
          const { data, error: updateError } = await supabase.rpc('update_user_phone', {
            user_id: authData.user.id,
            phone_number: phone
          });

          if (updateError) {
            console.warn("Could not update user phone:", updateError);
            // Continue with signup even if phone update fails
          }
        } catch (rpcError) {
          console.error("Error calling update_user_phone function:", rpcError);
          // Continue with signup even if RPC call fails
        }
      }

      setSuccess("Account created successfully! Please check your email to verify your account.");
      // Optionally redirect after a delay
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      // Handle errors without showing them in the console
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // Handle specific error cases without logging to console
        if (errorMessage.includes('already registered') || 
            errorMessage.includes('already exists') ||
            errorMessage.includes('already in use')) {
          setError('This email is already registered. Please use a different email or try logging in.');
        } else if (errorMessage.includes('invalid email')) {
          setError('Please enter a valid email address');
        } else if (errorMessage.includes('password')) {
          setError('There was an issue with your password. Please try again.');
        } else {
          // For any other errors, show a generic but friendly message
          setError('We encountered an issue. Please check your details and try again.');
        }
      } else {
        // Fallback for non-Error objects
        setError('We encountered an issue. Please check your details and try again.');
      }
      
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Sign Up</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email <span className="text-red-500">*</span>
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
            <label htmlFor="displayName" className="block text-sm font-medium mb-2">
              Display Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Enter your display name"
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-2">
              Phone Number
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
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
              placeholder="Enter your password (min 6 characters)"
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
              className="w-full"
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
          {success && (
            <div className="text-green-600 text-sm text-center">{success}</div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
          <div className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

