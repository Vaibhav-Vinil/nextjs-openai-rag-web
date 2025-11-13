import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({ 
      authenticated: true, 
      user: {
        email: session.user.email,
        id: session.user.id,
      }
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ authenticated: false });
  }
}

