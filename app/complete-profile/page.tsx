"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export default function CompleteProfilePage() {
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isValidatingPhone, setIsValidatingPhone] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }
            setUserEmail(session.user.email || "");

            // If user already has a phone number, redirect to home
            if (session.user.phone || session.user.user_metadata?.phone) {
                router.push("/");
            }
        };
        checkUser();
    }, [router, supabase]);

    const validatePhoneWithAbstractAPI = async (phoneNumber: string): Promise<{ valid: boolean; error?: string }> => {
        try {
            const response = await fetch('/api/auth/validate-phone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone: phoneNumber }),
            });

            if (!response.ok) {
                if (response.status === 429) {
                    const data = await response.json();
                    return { valid: false, error: data.message || 'Too many attempts. Please try again later.' };
                }
                throw new Error('Failed to validate phone number');
            }

            const data = await response.json();
            if (data.skipped) return { valid: true };
            if (!data.valid) return { valid: false, error: 'Please enter a valid phone number' };

            return { valid: true };
        } catch (error) {
            console.error('Phone validation error:', error);
            return { valid: true }; // Allow on error
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (!phone) {
            setError("Phone number is required");
            setLoading(false);
            return;
        }

        try {
            // Validate phone
            setIsValidatingPhone(true);
            const phoneValidation = await validatePhoneWithAbstractAPI(phone);

            if (!phoneValidation.valid) {
                setError(phoneValidation.error || 'Invalid phone number');
                setLoading(false);
                setIsValidatingPhone(false);
                return;
            }

            // Update user in Supabase Auth
            // We only update the metadata to avoid triggering Supabase's built-in SMS verification
            // (which fails if no SMS provider is configured)
            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    phone: phone,
                    phone_verified: true // We already verified it via Abstract API
                }
            });

            if (updateError) {
                throw updateError;
            }

            // Also try to update via RPC for consistency if the function exists (best effort)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                try {
                    await supabase.rpc('update_user_phone', {
                        user_id: user.id,
                        phone_number: phone
                    });
                } catch (rpcError) {
                    console.warn("Could not update user phone via RPC (optional):", rpcError);
                }
            }

            // Redirect to home
            router.push("/");
            router.refresh();

        } catch (error: any) {
            console.error("Error updating profile:", error);
            setError(error.message || "Failed to update profile. Please try again.");
        } finally {
            setLoading(false);
            setIsValidatingPhone(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md">
                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-6">
                    <div className="flex flex-col items-center">
                        <div className="w-24 h-24 relative mb-4">
                            <Image
                                src="/PvChatbot-logo.png"
                                alt="PvChatbot Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-center">Complete Your Profile</h1>
                        <p className="text-sm text-gray-500 mt-2 text-center">
                            Please provide your phone number to continue using the application.
                            <br />
                            <span className="text-xs text-gray-400">Logged in as {userEmail}</span>
                        </p>
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium mb-2">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <PhoneInput
                                international
                                defaultCountry="US"
                                value={phone}
                                onChange={(val) => setPhone(val || "")}
                                placeholder="Enter phone number"
                                className="phone-input"
                                limitMaxLength
                                initialValueFormat="national"
                                withCountryCallingCode
                            />
                        </div>
                        {/* Reuse styles from signup page */}
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

                    {error && (
                        <div className="text-center p-2 bg-red-50 rounded text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2"
                        disabled={loading || isValidatingPhone}
                    >
                        {isValidatingPhone ? "Verifying..." : loading ? "Saving..." : "Continue"}
                    </Button>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-sm text-gray-500 hover:text-gray-700"
                    >
                        Sign out
                    </button>
                </form>
            </div>
        </div>
    );
}
