"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

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

  const validatePhoneNumber = (phoneNumber: string): { isValid: boolean; error?: string } => {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Check if the field is empty
    if (!digitsOnly) {
      return { 
        isValid: false, 
        error: 'Phone number is required' 
      };
    }
    
    // Check minimum length
    if (digitsOnly.length < 5) {
      return { 
        isValid: false, 
        error: 'Invalid phone number'
      };
    }
    
    if (digitsOnly.length > 15) {
      return { 
        isValid: false, 
        error: 'Invalid phone number'
      };
    }
    
    // Basic international phone number validation
    const phoneRegex = /^[+\s\d\-()]{8,20}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return { 
        isValid: false, 
        error: 'Invalid phone number'
      };
    }
    
    return { isValid: true };
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and specific phone number characters
    const value = e.target.value.replace(/[^0-9+\-()\s]/g, '');
    setPhone(value);
    // Clear any previous error when user types
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    
    // Validate phone number if provided (only on submit)
    if (phone) {
      const { isValid, error } = validatePhoneNumber(phone);
      if (!isValid) {
        setError(error || 'Please enter a valid phone number');
        setLoading(false);
        return;
      }
    }

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

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address (e.g., user@example.com)");
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
          const { error: updateError } = await supabase.rpc('update_user_phone', {
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

      // Sign in the user automatically after successful signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw new Error('Account created but failed to sign in automatically. Please log in manually.');
      }

      // Redirect to chat page after successful sign in
      router.push('/');
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

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-md text-center bg-white p-8 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Setting up your account...</p>
          <p className="text-gray-600 mt-2">You&apos;ll be redirected to the chat shortly</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-4">
          <div className="flex flex-col items-center">
            <div className="w-40 h-40 relative mb-4">
              <Image
                src="/PvChatbot-logo.png"
                alt="PvChatbot Logo"
                width={160}
                height={160}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-center mb-6">Create an Account</h1>
          </div>
          
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
            Phone Number <span className="text-red-500">*</span>
          </label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="e.g., +1 (123) 456-7890"
            className="w-full"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Include country code (e.g., +1, +44, +971)
          </p>
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password <span className="text-red-500">*</span>
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
            Confirm Password <span className="text-red-500">*</span>
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
          <div className="mt-2 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <Button
          type="submit"
          className="w-full mt-4 flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating your account...
            </>
          ) : (
            'Sign Up'
          )}
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

