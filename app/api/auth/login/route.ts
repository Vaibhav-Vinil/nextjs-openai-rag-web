import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, validateRequestBody } from "@/lib/validation/schemas";
import { applyRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter";

export async function POST(request: Request) {
  try {
    // Apply strict rate limiting for auth endpoints (10 requests per 15 minutes)
    // This helps prevent brute force attacks
    const rateLimitResponse = applyRateLimit(request, RATE_LIMIT_CONFIGS.auth);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Validate request body with Zod schema
    const validation = await validateRequestBody(request, loginSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    const supabase = await createClient();

    // First, try to sign in to check credentials and get user data
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Check if the error is due to unverified email
      if (signInError.message.toLowerCase().includes('email not confirmed')) {
        return NextResponse.json(
          {
            error: "Please verify your email before logging in. Check your inbox for the verification link.",
            requiresVerification: true,
            email
          },
          { status: 403 }
        );
      }

      // For other authentication errors
      return NextResponse.json(
        {
          error: signInError.message || "Invalid email or password",
          requiresVerification: false
        },
        { status: 401 }
      );
    }

    // Check if user is confirmed in the auth.users table
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "User not found. Please sign up first.",
          requiresVerification: false
        },
        { status: 401 }
      );
    }

    // Get additional user data from the users table if needed
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Even if we can't get user data, proceed with login if auth was successful
    if (userDataError) {
      console.warn("Could not fetch user data:", userDataError);
    }

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        id: user.id,
        ...(userData || {})
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        error: "An error occurred during login. Please try again.",
        requiresVerification: false
      },
      { status: 500 }
    );
  }
}

