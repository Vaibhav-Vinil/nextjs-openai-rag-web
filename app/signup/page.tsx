"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidatingPhone, setIsValidatingPhone] = useState(false);
  const supabase = createClient();

  /**
   * Validates phone number via server-side API endpoint
   * This prevents API key exposure on the client-side
   */
  const validatePhoneWithAbstractAPI = async (phoneNumber: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      // Call server-side endpoint instead of direct API call
      // This keeps the API key secure on the server
      const response = await fetch('/api/auth/validate-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          const data = await response.json();
          return { valid: false, error: data.message || 'Too many attempts. Please try again later.' };
        }
        throw new Error('Failed to validate phone number');
      }

      const data = await response.json();

      // If validation was skipped (no API key configured), allow signup
      if (data.skipped) {
        return { valid: true };
      }

      // Check if phone is valid
      if (!data.valid) {
        return { valid: false, error: 'Please enter a valid phone number' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Phone validation error:', error);
      // In case of API failure, we'll still allow signup but log the error
      return { valid: true };
    }
  };

  // Check authentication and verification status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkAuthAndVerification = async () => {
      try {
        // First, get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          return;
        }

        // If we have a session, check if email is verified
        if (session?.user) {
          // Get fresh user data to ensure we have the latest email_confirmed_at
          const { data: { user }, error: userError } = await supabase.auth.getUser();

          if (userError) {
            console.error('Error getting user:', userError);
            return;
          }

          // If email is verified, redirect to chat
          if (user?.email_confirmed_at) {
            // Clear any existing intervals
            if (intervalId) clearInterval(intervalId);

            // Force a refresh of the page to ensure all auth state is properly set
            window.location.href = '/';
            return;
          }
        }
      } catch (error) {
        console.error('Error in verification check:', error);
      }
    };

    // Only start polling if we have a success message (i.e., after signup)
    if (success) {
      // Check immediately
      checkAuthAndVerification();

      // Then check every 2 seconds (more frequent for better UX)
      intervalId = setInterval(checkAuthAndVerification, 2000);
    }

    // Clean up interval on component unmount or when success changes
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [success, supabase.auth]);

  const validatePhoneNumber = (phoneNumber: string | undefined): { isValid: boolean; error?: string } => {
    if (!phoneNumber) {
      return {
        isValid: false,
        error: 'Phone number is required'
      };
    }

    // The library handles the validation for us
    return { isValid: true };
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatPhoneNumber = (phone: string | undefined): string => {
    // The library provides the formatted number with country code
    return phone || '';
  };

  const handlePhoneChange = (value: string | undefined) => {
    setPhone(value || '');
    // Clear any previous error when user types
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    // Basic phone number format validation
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid && phoneValidation.error) {
      setError(phoneValidation.error);
      return;
    }

    setLoading(true);

    // The library provides the formatted number with country code
    const formattedPhone = phone || '';

    try {
      // Validate phone number with Abstract API
      setIsValidatingPhone(true);
      const phoneValidation = await validatePhoneWithAbstractAPI(formattedPhone);

      if (!phoneValidation.valid) {
        setError(phoneValidation.error || 'Invalid phone number');
        return;
      }

      // Proceed with user signup after successful phone validation
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName,
            phone: formattedPhone, // Keep in metadata as fallback
            phone_verified: false,
            email_verified: false,
          },
          emailRedirectTo: `${window.location.origin}/verification/success`,
        },
      });

      // If we have a user and phone was provided, update the phone in auth.users
      if (data?.user && formattedPhone) {
        try {
          // Call the server-side function to update the phone
          const { error: updateError } = await supabase.rpc('update_user_phone', {
            user_id: data.user.id,
            phone_number: formattedPhone
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

      // If we get here, signup was successful
      // Clear sensitive data
      setPassword("");
      setConfirmPassword("");

      // Check if this is a new user or existing user trying to sign up again
      if (data?.user?.identities && data.user.identities.length === 0) {
        // User already exists
        setError('This email is already registered. Please use a different email or try logging in.');
      } else {
        // New user, show verification message
        setSuccess(`A verification link has been sent to ${email}. Please check your email.`);
      }

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
        } else if (errorMessage.includes('phone') || errorMessage.includes('number')) {
          // Don't override phone validation errors
          if (!errorMessage.includes('invalid phone number')) {
            setError('There was an issue with your phone number. Please try again.');
          }
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
    } finally {
      setLoading(false);
      setIsValidatingPhone(false);
    }
  };

  // Check URL for verification message
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verification_sent') === 'true') {
      setSuccess(`A verification link has been sent to ${params.get('email')}. Please check your email.`);

      // Clean up the URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-md text-center bg-white p-8 rounded-lg shadow-md">
          <div className="mx-auto mb-4 text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
          <p className="text-gray-600 mb-6">{success}</p>

          <div className="bg-blue-50 p-4 rounded-md text-left mb-6">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Didn&apos;t receive the email?</span> Check your spam folder or
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const { error: resendError } = await supabase.auth.resend({
                      type: 'signup',
                      email: email,
                    });
                    if (resendError) throw resendError;
                    setSuccess('Verification email resent successfully!');
                  } catch {
                    setError('Failed to resend verification email. Please try again.');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-blue-600 hover:text-blue-800 font-medium ml-1"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Resend verification email'}
              </button>
            </p>
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-500">
              Already verified?
              <a href="/login" className="text-blue-600 hover:text-blue-800 font-medium ml-1">
                Go to login
              </a>
            </p>
          </div>
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
            <div className="relative">
              <PhoneInput
                international
                defaultCountry="US"
                value={phone || undefined}
                onChange={handlePhoneChange}
                placeholder="Enter phone number"
                className="phone-input"
                limitMaxLength
                initialValueFormat="national"
                withCountryCallingCode
              />
            </div>
            <style jsx global>{`
            .phone-input {
              --PhoneInputCountryFlag-height: 1.5em;
              --PhoneInputCountryFlag-borderColor: #e5e7eb;
              --PhoneInputCountrySelectArrow-color: #6b7280;
              --PhoneInputCountrySelectArrow-opacity: 0.8;
              --PhoneInput-color--focus: #3b82f6;
              --PhoneInputCountrySelect-marginRight: 0.5em;
              --PhoneInputCountrySelectArrow-marginLeft: 0.25em;
              --PhoneInputCountrySelectArrow-marginRight: 0;
              --PhoneInputCountrySelectArrow-borderWidth: 2px;
              --PhoneInputCountrySelectArrow-width: 0.5em;
              --PhoneInputCountrySelectArrow-height: 0.25em;
            }
            
            .phone-input input {
              height: 2.5rem;
              width: 100%;
              border-radius: 0.375rem;
              border: 1px solid #e5e7eb;
              padding: 0 0.75rem;
              font-size: 0.875rem;
              line-height: 1.25rem;
              transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
            }
            
            .phone-input input:focus {
              outline: none;
              border-color: #3b82f6;
              box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
            }
            
            .phone-input .PhoneInputCountry {
              position: absolute;
              top: 0;
              bottom: 0;
              left: 0.75rem;
              display: flex;
              align-items: center;
              z-index: 10;
            }
            
            .phone-input .PhoneInputCountrySelect {
              margin-right: 0.5em;
              margin-left: 0.5em;
            }
            
            .phone-input .PhoneInputInput {
              padding-left: 4.5rem !important;
            }
          `}</style>
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
              placeholder="Enter your password (min 8 characters)"
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
            disabled={loading || isValidatingPhone}
          >
            {isValidatingPhone ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying phone number...
              </>
            ) : loading ? (
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

