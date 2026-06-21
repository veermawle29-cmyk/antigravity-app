import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendOTPRequest {
  phone: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { phone } = await req.json() as SendOTPRequest;

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format (E.164)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    if (!phoneRegex.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone format. Use E.164 format (e.g., +919876543210)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for RPC calls
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate OTP using database function
    const { data: otpData, error: otpError } = await supabase.rpc("generate_phone_otp", {
      p_phone: cleanPhone
    });

    if (otpError) {
      console.error("OTP generation error:", otpError);

      if (otpError.message.includes("Too many")) {
        return new Response(
          JSON.stringify({ error: "Too many OTP requests. Please wait 15 minutes before trying again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate OTP. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const otp = otpData?.[0]?.otp_code;
    const expiresAt = otpData?.[0]?.expires_at;

    if (!otp) {
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For development - log OTP so it can be viewed
    // In production, you would send via SMS provider (Twilio, Vonage, etc.)
    console.log(`[OTP] Phone: ${cleanPhone}, Code: ${otp}, Expires: ${expiresAt}`);

    // For testing purposes, you can check the OTP from database directly
    // In production, implement SMS sending here

    // Example: Send via email (for testing) or show in console
    // The OTP is stored in database and can be retrieved for verification

    // Calculate expiry in seconds
    const expiresIn = 300; // 5 minutes

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully!",
        phone: cleanPhone,
        expires_in: expiresIn,
        // For development testing - REMOVE IN PRODUCTION
        // This allows testing without SMS provider
        dev_otp: otp
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Send OTP error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
