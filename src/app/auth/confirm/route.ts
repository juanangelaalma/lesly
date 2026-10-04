import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

function getSafeDestination(value: string | null) {
  const allowedDestinations = new Set([
    "/today",
    "/update-password",
    "/onboarding",
  ]);

  if (value && allowedDestinations.has(value)) {
    return value;
  }

  return "/today";
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const otpType = request.nextUrl.searchParams.get("type");

  const destination = getSafeDestination(
    request.nextUrl.searchParams.get("next"),
  );

  let verified = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  } else if (tokenHash && otpType === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    verified = !error;
  } else if (tokenHash && otpType === "invite") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "invite",
    });

    verified = !error;
  } else if (tokenHash && otpType === "signup") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "signup",
    });

    verified = !error;
  } else if (tokenHash && otpType === "magiclink") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });

    verified = !error;
  } else if (tokenHash && otpType === "email_change") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email_change",
    });

    verified = !error;
  }

  const path = verified ? destination : "/login?confirmation=failed";

  return NextResponse.redirect(new URL(path, request.url));
}
