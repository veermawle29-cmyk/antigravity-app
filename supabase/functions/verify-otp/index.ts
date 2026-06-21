import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyOTPRequest {
  phone: string;
  otp: string;
  signup_data?: {
    fullname: string;
    username: string;
    password?: string;
    city?: string;
    interests?: string[];
  };
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
    const { phone, otp, signup_data } = await req.json() as VerifyOTPRequest;

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ error: "Phone number and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate OTP format
    const cleanOtp = otp.replace(/[^0-9]/g, '');
    if (cleanOtp.length !== 6) {
      return new Response(
        JSON.stringify({ error: "Invalid OTP format. Enter 6 digits." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    if (!phoneRegex.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify OTP using database function
    const { data: verifyResult, error: verifyError } = await supabase.rpc("verify_phone_otp_code", {
      p_phone: cleanPhone,
      p_otp: cleanOtp
    });

    if (verifyError) {
      console.error("OTP verification error:", verifyError);
      return new Response(
        JSON.stringify({ error: "Verification failed. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = verifyResult?.[0];

    if (!result?.success) {
      return new Response(
        JSON.stringify({ error: result?.message || "Invalid OTP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OTP verified - now create user account if signup_data provided
    if (signup_data) {
      const { fullname, username, password, city, interests } = signup_data;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (existingUser) {
        // User exists - create session
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: existingUser.email || `${cleanPhone}@phone.yaarbuzz.app`,
          password: password || cleanPhone.slice(-10)
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Logged in successfully!",
            user_id: existingUser.id,
            is_new_user: false
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new user with phone
      // We need an email for Supabase auth, so we create a placeholder
      const placeholderEmail = `${cleanPhone}@phone.yaarbuzz.app`;

      // Check username
      const { data: existingUsername } = await supabase
        .from("usernames")
        .select("username")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      if (existingUsername) {
        return new Response(
          JSON.stringify({ error: "Username already taken. Please choose another." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: placeholderEmail,
        password: password || cleanPhone.slice(-10) + "Aa1!",
        options: {
          data: {
            fullname: fullname,
            username: username,
            phone: cleanPhone
          }
        }
      });

      if (authError || !authData.user) {
        console.error("Auth creation error:", authError);
        return new Response(
          JSON.stringify({ error: "Failed to create account. " + (authError?.message || "") }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = authData.user.id;

      // Generate default avatar
      const initials = fullname.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
      const colors = ["FF7A00", "00A86B", "3B82F6", "EC4899", "8B5CF6", "F59E0B"];
      const selectedColor = colors[initials.charCodeAt(0) % colors.length];
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${selectedColor}&color=fff&size=200&font-size=0.4&bold=true`;

      // Create user profile
      const { error: profileError } = await supabase
        .from("users")
        .insert({
          id: userId,
          uid: userId,
          email: placeholderEmail,
          phone: cleanPhone,
          fullname: fullname,
          username: username.toLowerCase(),
          avatar: avatarUrl,
          city: city || "Unspecified",
          interests: interests || [],
          points: 50,
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          followers: [],
          following: [],
          badges: ["pioneer"],
          bio: ""
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Delete the auth user if profile creation fails
        await supabase.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: "Failed to create profile. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Add to usernames table
      await supabase
        .from("usernames")
        .insert({
          username: username.toLowerCase(),
          uid: userId,
          email: placeholderEmail,
          user_id: userId
        });

      // Return session
      return new Response(
        JSON.stringify({
          success: true,
          message: "Account created successfully!",
          user_id: userId,
          is_new_user: true,
          session: authData.session
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Just verify OTP without signup (for login)
    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP verified successfully!",
        phone: cleanPhone
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Verify OTP error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
