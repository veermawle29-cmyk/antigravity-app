/**
 * YaarBuzz - Secure Authentication Service
 * Complete rewrite with production-grade security
 *
 * CRITICAL SECURITY PRINCIPLES:
 * 1. NO authentication bypass - all screens require verified session
 * 2. OTP MUST be verified before any profile creation
 * 3. Session validation on every app start
 * 4. Proper error handling and user feedback
 */

// ============================================
// AUTH STATE MACHINE
// ============================================

const AuthState = {
  LOADING: 'loading',
  UNAUTHENTICATED: 'unauthenticated',
  OTP_SENT: 'otp_sent',
  OTP_VERIFYING: 'otp_verifying',
  AUTHENTICATED_NO_PROFILE: 'authenticated_no_profile',
  AUTHENTICATED: 'authenticated',
  ERROR: 'error'
};

let authState = AuthState.LOADING;
let pendingPhoneSignup = null;
let otpTimerInterval = null;
let otpExpiresAt = null;
let authInitialized = false;

// Track login attempts for rate limiting
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

// ============================================
// UI HELPERS
// ============================================

function showAuthError(msg) {
  const errDiv = document.getElementById('auth-error-msg');
  if (errDiv) {
    errDiv.textContent = msg || '';
    errDiv.style.display = msg ? 'block' : 'none';
  }
}

function showSetupError(msg) {
  const errDiv = document.getElementById('setup-error-msg');
  if (errDiv) {
    errDiv.textContent = msg || '';
    errDiv.style.display = msg ? 'block' : 'none';
  }
}

function setLoadingState(buttonId, loading, loadingText = 'Loading...') {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.disabled = loading;
  const spanEl = btn.querySelector('span');
  if (spanEl) {
    spanEl.textContent = loading ? loadingText : (btn.dataset.originalText || 'Submit');
  }
}

// Generate dynamic color avatar based on user initials
function generateDefaultAvatar(name) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'YB';
  const colors = ['#FF7A00', '#00A86B', '#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B'];
  const selectedColor = colors[initials.charCodeAt(0) % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="150" height="150">
    <circle cx="50" cy="50" r="48" fill="${selectedColor}" />
    <text x="50%" y="54%" font-family="'Outfit', sans-serif" font-size="36" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
window.generateDefaultAvatar = generateDefaultAvatar;

// ============================================
// RATE LIMITING
// ============================================

function checkRateLimit(identifier) {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || { count: 0, firstAttempt: now };

  // Reset if cooldown period passed
  if (now - attempts.firstAttempt > LOGIN_COOLDOWN_MS) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const remainingMs = LOGIN_COOLDOWN_MS - (now - attempts.firstAttempt);
    const remainingMin = Math.ceil(remainingMs / 60000);
    return { allowed: false, remainingMinutes: remainingMin };
  }

  attempts.count++;
  loginAttempts.set(identifier, attempts);
  return { allowed: true };
}

// ============================================
// USERNAME VALIDATION
// ============================================

async function checkUsernameAvailability(username) {
  if (username.length < 3) {
    return { available: false, reason: "Username must be at least 3 characters" };
  }

  const regex = /^[a-zA-Z0-9_]+$/;
  if (!regex.test(username)) {
    return { available: false, reason: "Only letters, numbers, and underscores allowed" };
  }

  try {
    const { data, error } = await supabase
      .from('usernames')
      .select('username')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error("Error checking username:", error);
      return { available: false, reason: "Error checking username availability" };
    }

    if (data) {
      return { available: false, reason: "Username is already taken" };
    }
    return { available: true };
  } catch (e) {
    console.error("Username check error:", e);
    return { available: false, reason: "Network error - please try again" };
  }
}

// ============================================
// PHONE VALIDATION
// ============================================

function validatePhoneNumber(phone) {
  // Clean the phone number
  const cleanPhone = phone.replace(/[^0-9+]/g, '');

  // Must be in E.164 format: +[country code][number]
  const phoneRegex = /^\+[1-9]\d{1,14}$/;

  if (!phoneRegex.test(cleanPhone)) {
    return { valid: false, error: "Invalid phone format. Include country code (e.g., +919876543210)" };
  }

  return { valid: true, phone: cleanPhone };
}

// ============================================
// OTP FUNCTIONS
// ============================================

async function sendPhoneOTP(phoneNumber, isResend = false) {
  showAuthError(null);

  // Validate phone
  const validation = validatePhoneNumber(phoneNumber);
  if (!validation.valid) {
    showAuthError(validation.error);
    return false;
  }

  const cleanPhone = validation.phone;

  // Check rate limit
  const rateLimit = checkRateLimit(cleanPhone);
  if (!rateLimit.allowed) {
    showAuthError(`Too many attempts. Please wait ${rateLimit.remainingMinutes} minutes.`);
    return false;
  }

  const sendOtpBtn = document.getElementById('auth-send-otp-btn');
  const resendOtpBtn = document.getElementById('auth-resend-otp-btn');

  if (!isResend) {
    sendOtpBtn.disabled = true;
    document.getElementById('send-btn-text').textContent = "Sending...";
  } else {
    resendOtpBtn.disabled = true;
    resendOtpBtn.textContent = "Sending...";
  }

  try {
    // Supabase SMS OTP
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: cleanPhone,
      options: {
        shouldCreateUser: true,
        channel: 'sms'
      }
    });

    if (error) {
      // Handle specific Supabase errors
      if (error.message.includes('rate limit') || error.message.includes('too many')) {
        showAuthError("Too many OTP requests. Please wait a few minutes before trying again.");
      } else if (error.message.includes('invalid phone')) {
        showAuthError("Invalid phone number format. Include country code (e.g., +919876543210).");
      } else {
        showAuthError("Failed to send OTP: " + error.message);
      }
      return false;
    }

    // OTP sent successfully
    document.getElementById('phone-input-section').style.display = 'none';
    document.getElementById('otp-input-section').style.display = 'block';

    // Set expiry time (Supabase OTP expires in 60 seconds by default)
    otpExpiresAt = Date.now() + (60 * 1000);
    startOTPTimer();

    authState = AuthState.OTP_SENT;

    return true;

  } catch (error) {
    console.error("OTP send error:", error);
    showAuthError("Network error. Please check your connection and try again.");
    return false;
  } finally {
    sendOtpBtn.disabled = false;
    document.getElementById('send-btn-text').textContent = "Send OTP via SMS";
    resendOtpBtn.disabled = false;
    resendOtpBtn.textContent = "Resend OTP";
  }
}

async function verifyPhoneOTP(phoneNumber, otp) {
  showAuthError(null);

  // Validate OTP
  const cleanOtp = otp.replace(/[^0-9]/g, '');
  if (cleanOtp.length !== 6) {
    showAuthError("Please enter the 6-digit verification code.");
    return false;
  }

  // Check if OTP expired
  if (otpExpiresAt && Date.now() > otpExpiresAt) {
    showAuthError("OTP has expired. Please request a new one.");
    return false;
  }

  const validation = validatePhoneNumber(phoneNumber);
  if (!validation.valid) {
    showAuthError(validation.error);
    return false;
  }

  const verifyBtn = document.getElementById('auth-verify-otp-btn');
  verifyBtn.disabled = true;
  verifyBtn.querySelector('span').textContent = "Verifying...";

  authState = AuthState.OTP_VERIFYING;

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: validation.phone,
      token: cleanOtp,
      type: 'sms'
    });

    if (error) {
      // Handle specific errors
      if (error.message.includes('expired') || error.message.includes('Token is expired')) {
        showAuthError("OTP has expired. Please request a new one.");
        clearInterval(otpTimerInterval);
        document.getElementById('otp-timer-text').style.display = 'none';
        document.getElementById('auth-resend-otp-btn').style.display = 'inline-block';
      } else if (error.message.includes('invalid') || error.message.includes('incorrect')) {
        showAuthError("Invalid OTP. Please check and try again.");
      } else {
        showAuthError("Verification failed: " + error.message);
      }
      authState = AuthState.OTP_SENT;
      return false;
    }

    // Clear timer
    clearInterval(otpTimerInterval);

    // Auth state change listener will handle the rest
    return true;

  } catch (error) {
    console.error("OTP verify error:", error);
    showAuthError("Network error during verification. Please try again.");
    authState = AuthState.OTP_SENT;
    return false;
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.querySelector('span').textContent = "Verify OTP & Log In";
  }
}

function startOTPTimer() {
  const timerText = document.getElementById('otp-timer-text');
  const countdownEl = document.getElementById('otp-countdown');
  const resendBtn = document.getElementById('auth-resend-otp-btn');

  let timeLeft = 60;
  timerText.style.display = 'inline';
  resendBtn.style.display = 'none';
  countdownEl.textContent = timeLeft;

  clearInterval(otpTimerInterval);
  otpTimerInterval = setInterval(() => {
    timeLeft--;
    countdownEl.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(otpTimerInterval);
      timerText.style.display = 'none';
      resendBtn.style.display = 'inline-block';
      otpExpiresAt = null;
    }
  }, 1000);
}

// ============================================
// EMAIL/PASSWORD AUTHENTICATION
// ============================================

async function loginWithEmailPassword(identifier, password) {
  showAuthError(null);

  const cleanId = identifier.trim();
  if (!cleanId || !password) {
    showAuthError("Email/username and password are required!");
    return;
  }

  if (password.length < 6) {
    showAuthError("Password must be at least 6 characters!");
    return;
  }

  // Check rate limit
  const rateLimit = checkRateLimit(cleanId.toLowerCase());
  if (!rateLimit.allowed) {
    showAuthError(`Too many attempts. Please wait ${rateLimit.remainingMinutes} minutes.`);
    return;
  }

  const loginBtn = document.getElementById('auth-login-btn');
  setLoadingState('auth-login-btn', true, 'Logging In...');

  try {
    let resolvedEmail = cleanId;

    // If not an email, check if it's a username
    if (!cleanId.includes('@')) {
      const isPhone = /^\+?[0-9\s\-()]{7,15}$/.test(cleanId);
      if (isPhone) {
        showAuthError("For phone login, please use 'Log In with Phone OTP' below.");
        loginBtn.disabled = false;
        loginBtn.querySelector('span').textContent = "Log In";
        return;
      }

      // Look up email from username
      const { data, error } = await supabase
        .from('usernames')
        .select('email')
        .eq('username', cleanId.toLowerCase())
        .maybeSingle();

      if (!data) {
        showAuthError("Username not found. Please check or sign up.");
        loginBtn.disabled = false;
        loginBtn.querySelector('span').textContent = "Log In";
        return;
      }
      resolvedEmail = data.email;
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail.toLowerCase().trim(),
      password: password
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        showAuthError("Invalid email/username or password.");
      } else if (error.message.includes('Email not confirmed')) {
        showAuthError("Please check your email to confirm your account first.");
      } else {
        showAuthError(error.message);
      }
      return;
    }

    // Clear rate limit on success
    loginAttempts.delete(cleanId.toLowerCase());

    // onAuthStateChange will handle the rest

  } catch (error) {
    console.error("Login error:", error);
    showAuthError("Login failed: " + error.message);
  } finally {
    setLoadingState('auth-login-btn', false, 'Log In');
  }
}

// ============================================
// SIGNUP WITH EMAIL
// ============================================

let signupData = {
  fullname: '',
  username: '',
  email: '',
  password: '',
  city: '',
  interests: []
};
let signupAvatarFile = null;

async function handleSignupNext() {
  showAuthError(null);

  const fullname = document.getElementById('auth-signup-fullname').value.trim();
  const username = document.getElementById('auth-signup-username').value.trim().toLowerCase();
  const emailOrPhone = document.getElementById('auth-signup-email-phone').value.trim();
  const password = document.getElementById('auth-signup-password').value;

  // Validate all fields
  if (!fullname || fullname.length < 2) {
    showAuthError("Please enter your full name (at least 2 characters)");
    return;
  }

  if (!username || username.length < 3) {
    showAuthError("Username must be at least 3 characters");
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    showAuthError("Username can only contain letters, numbers, and underscores");
    return;
  }

  if (!emailOrPhone) {
    showAuthError("Please enter your email or phone number");
    return;
  }

  if (!password || password.length < 6) {
    showAuthError("Password must be at least 6 characters");
    return;
  }

  const signupBtn = document.getElementById('auth-signup-next-btn');
  setLoadingState('auth-signup-next-btn', true, 'Validating...');

  try {
    // Check username availability
    const availability = await checkUsernameAvailability(username);
    if (!availability.available) {
      showAuthError(availability.reason);
      return;
    }

    // Check if input is email or phone
    const isPhone = /^\+?[0-9\s\-()]{7,15}$/.test(emailOrPhone);
    const isEmail = emailOrPhone.includes('@');

    if (isPhone) {
      // Phone signup - redirect to OTP flow
      pendingPhoneSignup = {
        fullname,
        username,
        phone: emailOrPhone.replace(/[^0-9+]/g, ''),
        password,
        city: '',
        interests: []
      };

      showAuthError(null);
      document.getElementById('auth-signup-step1').style.display = 'none';
      document.getElementById('auth-signup-step2').style.display = 'flex';
      document.getElementById('signup-step2-dot').classList.add('active');
      document.getElementById('signup-step-line').classList.add('active');
      return;
    }

    if (!isEmail) {
      showAuthError("Please enter a valid email address or phone number");
      return;
    }

    // Store signup data
    signupData = {
      fullname,
      username,
      email: emailOrPhone.toLowerCase().trim(),
      password,
      city: '',
      interests: []
    };
    signupAvatarFile = null;

    // Move to step 2
    document.getElementById('auth-signup-step1').style.display = 'none';
    document.getElementById('auth-signup-step2').style.display = 'flex';
    document.getElementById('signup-step2-dot').classList.add('active');
    document.getElementById('signup-step-line').classList.add('active');

  } catch (err) {
    console.error("Signup validation error:", err);
    showAuthError("Validation error: " + err.message);
  } finally {
    setLoadingState('auth-signup-next-btn', false, 'Next Step');
  }
}

function handleSignupBack() {
  document.getElementById('auth-signup-step2').style.display = 'none';
  document.getElementById('auth-signup-step1').style.display = 'flex';
  document.getElementById('signup-step2-dot').classList.remove('active');
  document.getElementById('signup-step-line').classList.remove('active');
  showAuthError(null);
}

async function handleSignupSubmit() {
  showAuthError(null);

  const city = document.getElementById('auth-signup-city')?.value || 'Unspecified';
  const interests = [];
  document.querySelectorAll('#auth-signup-interests .interest-chip.active').forEach(chip => {
    interests.push(chip.getAttribute('data-interest'));
  });

  // Get avatar file if selected
  const avatarInput = document.getElementById('auth-signup-avatar-input');
  if (avatarInput && avatarInput.files.length > 0) {
    signupAvatarFile = avatarInput.files[0];
  }

  // Show loading
  document.getElementById('auth-signup-step2').style.display = 'none';
  document.getElementById('auth-signup-step3').style.display = 'flex';

  try {
    // Re-validate username
    const availability = await checkUsernameAvailability(signupData.username);
    if (!availability.available) {
      throw new Error(availability.reason);
    }

    // Create Supabase Auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signupData.email,
      password: signupData.password,
      options: {
        data: {
          fullname: signupData.fullname,
          username: signupData.username
        },
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });

    if (authError) throw authError;

    const user = authData.user;

    // Check if email confirmation is required
    if (!user || authData.session === null) {
      showAuthError("Please check your email to confirm your account, then log in.");
      document.getElementById('auth-signup-step3').style.display = 'none';
      document.getElementById('auth-signup-step1').style.display = 'flex';

      // Switch to login tab
      document.getElementById('auth-tab-login')?.click();
      return;
    }

    // Upload avatar if selected
    let avatarUrl = generateDefaultAvatar(signupData.fullname);
    if (signupAvatarFile) {
      try {
        const fileExt = signupAvatarFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('profile_pics')
          .upload(fileName, signupAvatarFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('profile_pics')
            .getPublicUrl(fileName);
          avatarUrl = urlData.publicUrl;
        }
      } catch (uploadErr) {
        console.error("Avatar upload failed:", uploadErr);
      }
    }

    // Create user profile in database
    const profileData = {
      fullname: signupData.fullname,
      username: signupData.username,
      email: signupData.email,
      phone: '',
      avatar: avatarUrl,
      city: city,
      interests: interests
    };

    await createUserProfile(user, profileData);

    // Update auth metadata
    await supabase.auth.updateUser({
      data: {
        fullname: signupData.fullname,
        username: signupData.username,
        avatar: avatarUrl
      }
    });

    // Set state
    if (typeof STATE !== 'undefined') {
      STATE.currentUser = { ...profileData, id: user.id, uid: user.id };
    }

    authState = AuthState.AUTHENTICATED;
    syncUserProfileUI({ ...profileData, id: user.id, uid: user.id });

    if (typeof window.initAppAuthenticated === 'function') {
      window.initAppAuthenticated();
    }

    // Transition to main app
    if (typeof showScreen === 'function') {
      showScreen('home');
    }

  } catch (error) {
    console.error("Registration failed:", error);
    showAuthError(error.message || "Registration failed. Please try again.");

    document.getElementById('auth-signup-step3').style.display = 'none';
    document.getElementById('auth-signup-step2').style.display = 'flex';
    authState = AuthState.UNAUTHENTICATED;
  }
}

// ============================================
// GOOGLE OAUTH
// ============================================

async function loginWithGoogle() {
  showAuthError(null);

  const googleBtn = document.getElementById('auth-google-btn');
  googleBtn.disabled = true;
  googleBtn.innerHTML = '<span>Connecting...</span>';

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) throw error;
    // Redirect happens automatically

  } catch (error) {
    console.error("Google login error:", error);
    showAuthError("Google Sign-In failed: " + error.message);
    googleBtn.disabled = false;
    googleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.1C18.29.986 15.485 0 12.24 0 5.48 0 0 5.37 0 12s5.48 12 12.24 12c7.06 0 11.758-4.912 11.758-11.83 0-.796-.086-1.4-.189-1.885H12.24Z"/></svg>
      <span>Continue with Google</span>
    `;
  }
}

// ============================================
// PASSWORD RESET
// ============================================

async function resetPassword(email) {
  showAuthError(null);

  if (!email || !email.includes('@')) {
    showAuthError("Please enter a valid email address.");
    return;
  }

  const forgotBtn = document.getElementById('auth-forgot-btn');
  setLoadingState('auth-forgot-btn', true, 'Sending Link...');

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + window.location.pathname
    });

    if (error) throw error;

    window.showNotification("Password reset email sent! Check your inbox.", "success");
    document.getElementById('auth-forgot-view').style.display = 'none';
    document.getElementById('auth-login-view').style.display = 'flex';

  } catch (error) {
    console.error("Password reset error:", error);
    showAuthError(error.message);
  } finally {
    setLoadingState('auth-forgot-btn', false, 'Send Reset Link');
  }
}

// ============================================
// LOGOUT
// ============================================

async function logoutUser() {
  try {
    clearInterval(otpTimerInterval);

    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    authState = AuthState.UNAUTHENTICATED;

    if (typeof STATE !== 'undefined') {
      STATE.currentUser = null;
    }

    // Clear form values
    const loginIdentifier = document.getElementById('auth-login-identifier');
    const loginPassword = document.getElementById('auth-login-password');
    if (loginIdentifier) loginIdentifier.value = '';
    if (loginPassword) loginPassword.value = '';

    // Reset OTP view
    document.getElementById('phone-input-section').style.display = 'block';
    document.getElementById('otp-input-section').style.display = 'none';

    // Reset to login tab
    document.getElementById('auth-tab-login')?.click();

    // Go to auth screen
    if (typeof showScreen === 'function') {
      showScreen('auth');
    }

  } catch (error) {
    console.error("Logout error:", error);
    if (typeof showScreen === 'function') {
      showScreen('auth');
    }
  }
}

// ============================================
// USER PROFILE CREATION & SYNC
// ============================================

async function createUserProfile(user, profileData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        uid: user.id,
        email: profileData.email || user.email || '',
        phone: profileData.phone || user.phone || '',
        fullname: profileData.fullname,
        username: profileData.username,
        avatar: profileData.avatar || generateDefaultAvatar(profileData.fullname),
        city: profileData.city || 'Unspecified',
        interests: profileData.interests || [],
        points: 50,
        posts_count: 0,
        followers_count: 0,
        following_count: 0,
        followers: [],
        following: [],
        badges: ['pioneer'],
        bio: ''
      })
      .select()
      .single();

    if (error) {
      console.error("Profile creation error:", error);
      throw error;
    }

    // Add to usernames table
    const { error: usernameError } = await supabase
      .from('usernames')
      .insert({
        username: profileData.username.toLowerCase(),
        uid: user.id,
        email: profileData.email || user.email || '',
        user_id: user.id
      });

    if (usernameError && !usernameError.message?.includes('duplicate')) {
      console.error("Username insert error:", usernameError);
    }

    return data;
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

async function loadUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error loading user profile:", error);
    return null;
  }
}

function syncUserProfileUI(user) {
  if (!user) return;

  const fullnameEl = document.getElementById('profile-user-fullname');
  const handleEl = document.getElementById('profile-user-handle');
  const picEl = document.getElementById('profile-user-pic');

  if (fullnameEl) fullnameEl.textContent = user.fullname || 'YaarBuzz User';
  if (handleEl) handleEl.textContent = '@' + (user.username || 'user');
  if (picEl) picEl.src = user.avatar || generateDefaultAvatar(user.fullname);

  const postsEl = document.getElementById('profile-stat-posts');
  const followersEl = document.getElementById('profile-stat-followers');
  const followingEl = document.getElementById('profile-stat-following');
  const pointsEl = document.getElementById('profile-stat-points');

  if (postsEl) postsEl.textContent = user.posts_count || 0;
  if (followersEl) followersEl.textContent = user.followers_count || 0;
  if (followingEl) followingEl.textContent = user.following_count || 0;
  if (pointsEl) pointsEl.textContent = user.points || 0;

  const previewPic = document.getElementById('edit-profile-pic-preview');
  if (previewPic) {
    previewPic.src = user.avatar || generateDefaultAvatar(user.fullname);
  }

  // Bind badges
  const userBadges = user.badges || [];

  const pioneerBadge = document.getElementById('badge-pioneer');
  if (pioneerBadge) pioneerBadge.classList.toggle('active', userBadges.includes('pioneer'));

  const localBadge = document.getElementById('badge-local');
  if (localBadge) {
    localBadge.classList.toggle('active',
      userBadges.includes('local') || (user.city && user.city !== 'Unspecified'));
  }

  const streakBadge = document.getElementById('badge-streak');
  if (streakBadge) streakBadge.classList.toggle('active', userBadges.includes('streak'));

  const creatorBadge = document.getElementById('badge-creator');
  if (creatorBadge) {
    creatorBadge.classList.toggle('active',
      userBadges.includes('creator') || (user.posts_count >= 10));
  }
}

// ============================================
// AUTH STATE LISTENER - CORE SECURITY
// ============================================

function setupAuthListener() {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("[Auth] State changed:", event, "Session:", !!session);

    const hideSplash = () => {
      const splash = document.getElementById('screen-splash');
      if (splash) {
        splash.classList.add('hide');
      }
    };

    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
      case 'INITIAL_SESSION':
        await handleSignIn(session, hideSplash);
        break;

      case 'SIGNED_OUT':
        authState = AuthState.UNAUTHENTICATED;
        if (typeof STATE !== 'undefined') {
          STATE.currentUser = null;
        }
        if (typeof showScreen === 'function') {
          showScreen('auth');
        }
        hideSplash();
        break;

      default:
        hideSplash();
    }

    authInitialized = true;
  });
}

async function handleSignIn(session, hideSplash) {
  const user = session?.user;

  if (!user) {
    authState = AuthState.UNAUTHENTICATED;
    hideSplash();
    return;
  }

  // Load user profile from database
  let profile = await loadUserProfile(user.id);

  if (!profile) {
    // New user from OAuth or OTP - needs profile setup
    authState = AuthState.AUTHENTICATED_NO_PROFILE;

    // Setup profile creation form
    const userMeta = user.user_metadata || {};

    const setupFullname = document.getElementById('auth-setup-fullname');
    const setupAvatarPreview = document.getElementById('auth-setup-avatar-preview');

    if (setupFullname) {
      setupFullname.value = userMeta.fullname || userMeta.name || '';
    }

    if (setupAvatarPreview) {
      setupAvatarPreview.src = userMeta.avatar || userMeta.picture ||
        generateDefaultAvatar(userMeta.fullname || userMeta.name || 'YB');
    }

    const setupUsername = document.getElementById('auth-setup-username');
    if (setupUsername) {
      let suggestedName = (userMeta.fullname || userMeta.name || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .substring(0, 20);

      if (suggestedName.length < 3) {
        suggestedName = 'user_' + Math.floor(1000 + Math.random() * 9000);
      }
      setupUsername.value = suggestedName;
    }

    if (typeof showScreen === 'function') {
      showScreen('profile-setup');
    }
    hideSplash();
  } else {
    // Existing user with profile
    authState = AuthState.AUTHENTICATED;

    if (typeof STATE !== 'undefined') {
      STATE.currentUser = profile;
    }

    syncUserProfileUI(profile);

    if (typeof window.initAppAuthenticated === 'function') {
      window.initAppAuthenticated();
    }

    // Only transition if not already in main app
    if (typeof STATE !== 'undefined' &&
        (STATE.currentScreen === 'auth' ||
         STATE.currentScreen === 'onboarding' ||
         STATE.currentScreen === 'profile-setup')) {
      if (typeof showScreen === 'function') {
        showScreen('home');
      }
    }
    hideSplash();
  }
}

// ============================================
// ROUTE GUARD
// ============================================

function isRouteProtected(screenId) {
  const unprotectedScreens = ['auth', 'onboarding', 'splash', 'profile-setup'];
  return !unprotectedScreens.includes(screenId);
}

function checkAuthAndRedirect(targetScreen) {
  // If target is unprotected, allow access
  if (!isRouteProtected(targetScreen)) {
    return true;
  }

  // Check auth state
  if (authState === AuthState.AUTHENTICATED && typeof STATE !== 'undefined' && STATE.currentUser) {
    return true;
  }

  if (authState === AuthState.LOADING || authState === AuthState.OTP_VERIFYING) {
    // Still loading - don't redirect yet
    return false;
  }

  // Not authenticated - redirect to auth
  if (typeof showScreen === 'function') {
    showScreen('auth');
  }
  return false;
}

// Expose globally for app.js
window.checkAuthAndRedirect = checkAuthAndRedirect;
window.isRouteProtected = isRouteProtected;
window.AuthState = AuthState;

// ============================================
// DOM SETUP
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Store original button text
  document.querySelectorAll('.btn').forEach(btn => {
    const span = btn.querySelector('span');
    if (span) {
      btn.dataset.originalText = span.textContent;
    }
  });

  // Setup auth listener first
  setupAuthListener();

  // Tab toggles
  const tabLogin = document.getElementById('auth-tab-login');
  const tabSignup = document.getElementById('auth-tab-signup');
  const loginView = document.getElementById('auth-login-view');
  const signupView = document.getElementById('auth-signup-view');
  const forgotView = document.getElementById('auth-forgot-view');
  const phoneView = document.getElementById('auth-phone-view');

  if (tabLogin && tabSignup) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      loginView.style.display = 'flex';
      signupView.style.display = 'none';
      phoneView.style.display = 'none';
      forgotView.style.display = 'none';
      showAuthError(null);
    });

    tabSignup.addEventListener('click', () => {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      signupView.style.display = 'flex';
      loginView.style.display = 'none';
      phoneView.style.display = 'none';
      forgotView.style.display = 'none';

      document.getElementById('auth-signup-step1').style.display = 'flex';
      document.getElementById('auth-signup-step2').style.display = 'none';
      document.getElementById('auth-signup-step3').style.display = 'none';
      document.getElementById('signup-step2-dot').classList.remove('active');
      document.getElementById('signup-step-line').classList.remove('active');

      showAuthError(null);
    });
  }

  // Phone OTP toggle
  const phoneOtpToggle = document.getElementById('auth-toggle-phone-otp-login');
  const passwordToggle = document.getElementById('auth-toggle-password-login');

  if (phoneOtpToggle) {
    phoneOtpToggle.addEventListener('click', (e) => {
      e.preventDefault();
      loginView.style.display = 'none';
      phoneView.style.display = 'flex';
      showAuthError(null);
    });
  }

  if (passwordToggle) {
    passwordToggle.addEventListener('click', (e) => {
      e.preventDefault();
      phoneView.style.display = 'none';
      loginView.style.display = 'flex';
      showAuthError(null);
    });
  }

  // Forgot password
  document.getElementById('auth-forgot-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.style.display = 'none';
    forgotView.style.display = 'flex';
    showAuthError(null);
  });

  document.getElementById('auth-toggle-to-login-from-forgot')?.addEventListener('click', (e) => {
    e.preventDefault();
    forgotView.style.display = 'none';
    loginView.style.display = 'flex';
    showAuthError(null);
  });

  // Interest chips
  document.querySelectorAll('#auth-signup-interests .interest-chip, #auth-setup-interests .interest-chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });

  // Avatar upload (signup)
  const avatarTrigger = document.getElementById('auth-signup-avatar-trigger');
  const avatarInput = document.getElementById('auth-signup-avatar-input');
  const avatarPreview = document.getElementById('auth-signup-avatar-preview');

  if (avatarTrigger && avatarInput) {
    avatarTrigger.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', () => {
      if (avatarInput.files.length > 0) {
        signupAvatarFile = avatarInput.files[0];
        avatarPreview.src = URL.createObjectURL(signupAvatarFile);
      }
    });
  }

  // Login button
  const loginBtn = document.getElementById('auth-login-btn');
  const loginIdentifier = document.getElementById('auth-login-identifier');
  const loginPassword = document.getElementById('auth-login-password');

  if (loginBtn && loginIdentifier && loginPassword) {
    loginBtn.addEventListener('click', () => {
      loginWithEmailPassword(loginIdentifier.value, loginPassword.value);
    });

    // Allow Enter key to submit
    loginPassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        loginWithEmailPassword(loginIdentifier.value, loginPassword.value);
      }
    });
  }

  // Google button
  const googleBtn = document.getElementById('auth-google-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', loginWithGoogle);
  }

  // Signup flow
  const signupNextBtn = document.getElementById('auth-signup-next-btn');
  const signupBackBtn = document.getElementById('auth-signup-back-btn');
  const signupSubmitBtn = document.getElementById('auth-signup-submit-btn');

  if (signupNextBtn) signupNextBtn.addEventListener('click', handleSignupNext);
  if (signupBackBtn) signupBackBtn.addEventListener('click', handleSignupBack);
  if (signupSubmitBtn) signupSubmitBtn.addEventListener('click', handleSignupSubmit);

  // Forgot password
  const forgotBtn = document.getElementById('auth-forgot-btn');
  const forgotEmailInput = document.getElementById('auth-forgot-email');

  if (forgotBtn && forgotEmailInput) {
    forgotBtn.addEventListener('click', () => resetPassword(forgotEmailInput.value));
  }

  // Phone OTP
  const sendOtpBtn = document.getElementById('auth-send-otp-btn');
  const verifyOtpBtn = document.getElementById('auth-verify-otp-btn');
  const resendOtpBtn = document.getElementById('auth-resend-otp-btn');
  const otpInput = document.getElementById('login-otp');
  const phoneInput = document.getElementById('login-identifier');

  if (sendOtpBtn && phoneInput) {
    sendOtpBtn.addEventListener('click', () => sendPhoneOTP(phoneInput.value, false));
  }

  if (resendOtpBtn && phoneInput) {
    resendOtpBtn.addEventListener('click', () => sendPhoneOTP(phoneInput.value, true));
  }

  if (verifyOtpBtn && otpInput && phoneInput) {
    verifyOtpBtn.addEventListener('click', async () => {
      await verifyPhoneOTP(phoneInput.value, otpInput.value);
      // onAuthStateChange handles redirect
    });

    // Allow Enter key
    otpInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        verifyPhoneOTP(phoneInput.value, otpInput.value);
      }
    });
  }

  // Live username check (signup)
  const signupUsername = document.getElementById('auth-signup-username');
  if (signupUsername) {
    let checkTimeout = null;
    const statusDiv = document.getElementById('auth-username-status');

    signupUsername.addEventListener('input', () => {
      clearTimeout(checkTimeout);
      const username = signupUsername.value.trim().toLowerCase();

      if (!username) {
        if (statusDiv) statusDiv.style.display = 'none';
        return;
      }

      if (statusDiv) {
        statusDiv.textContent = "Checking...";
        statusDiv.style.color = "var(--text-secondary)";
        statusDiv.style.display = "block";
      }

      checkTimeout = setTimeout(async () => {
        const result = await checkUsernameAvailability(username);
        if (statusDiv) {
          if (result.available) {
            statusDiv.textContent = "Username is available!";
            statusDiv.style.color = "var(--secondary-green)";
          } else {
            statusDiv.textContent = result.reason || "Username unavailable";
            statusDiv.style.color = "var(--danger-red)";
          }
        }
      }, 600);
    });
  }

  // Logout
  const logoutBtn = document.getElementById('settings-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logoutUser);
  }

  // Profile setup (for OAuth/OTP users)
  setupProfileSetupHandlers();
});

// Profile Setup Handlers
function setupProfileSetupHandlers() {
  let setupAvatarFile = null;
  const setupAvatarTrigger = document.getElementById('auth-setup-avatar-trigger');
  const setupAvatarInput = document.getElementById('auth-setup-avatar-input');
  const setupAvatarPreview = document.getElementById('auth-setup-avatar-preview');

  if (setupAvatarTrigger && setupAvatarInput) {
    setupAvatarTrigger.addEventListener('click', () => setupAvatarInput.click());
    setupAvatarInput.addEventListener('change', () => {
      if (setupAvatarInput.files.length > 0) {
        setupAvatarFile = setupAvatarInput.files[0];
        setupAvatarPreview.src = URL.createObjectURL(setupAvatarFile);
      }
    });
  }

  // Live username check (setup)
  const setupUsernameInput = document.getElementById('auth-setup-username');
  if (setupUsernameInput) {
    let checkTimeout = null;
    const statusDiv = document.getElementById('auth-setup-username-status');

    setupUsernameInput.addEventListener('input', () => {
      clearTimeout(checkTimeout);
      const username = setupUsernameInput.value.trim().toLowerCase();

      if (!username) {
        if (statusDiv) statusDiv.style.display = 'none';
        return;
      }

      if (statusDiv) {
        statusDiv.textContent = "Checking...";
        statusDiv.style.color = "var(--text-secondary)";
        statusDiv.style.display = "block";
      }

      checkTimeout = setTimeout(async () => {
        const result = await checkUsernameAvailability(username);
        if (statusDiv) {
          if (result.available) {
            statusDiv.textContent = "Username is available!";
            statusDiv.style.color = "var(--secondary-green)";
          } else {
            statusDiv.textContent = result.reason || "Username unavailable";
            statusDiv.style.color = "var(--danger-red)";
          }
        }
      }, 600);
    });
  }

  // Setup submit
  const setupSubmitBtn = document.getElementById('auth-setup-submit-btn');
  if (setupSubmitBtn) {
    setupSubmitBtn.addEventListener('click', async () => {
      showSetupError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        authState = AuthState.UNAUTHENTICATED;
        if (typeof showScreen === 'function') {
          showScreen('auth');
        }
        return;
      }

      const fullname = document.getElementById('auth-setup-fullname').value.trim();
      const username = document.getElementById('auth-setup-username').value.trim().toLowerCase();
      const city = document.getElementById('auth-setup-city')?.value || 'Unspecified';

      const interests = [];
      document.querySelectorAll('#auth-setup-interests .interest-chip.active').forEach(chip => {
        interests.push(chip.getAttribute('data-interest'));
      });

      if (!fullname || fullname.length < 2) {
        showSetupError("Please enter your full name");
        return;
      }

      if (!username || username.length < 3) {
        showSetupError("Username must be at least 3 characters");
        return;
      }

      setLoadingState('auth-setup-submit-btn', true, 'Saving...');

      try {
        const availability = await checkUsernameAvailability(username);
        if (!availability.available) {
          throw new Error(availability.reason || "Username unavailable");
        }

        // Upload avatar if selected
        let avatarUrl = user.user_metadata?.avatar ||
          user.user_metadata?.picture ||
          generateDefaultAvatar(fullname);

        if (setupAvatarFile) {
          try {
            const fileExt = setupAvatarFile.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from('profile_pics')
              .upload(fileName, setupAvatarFile);

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('profile_pics')
                .getPublicUrl(fileName);
              avatarUrl = urlData.publicUrl;
            }
          } catch (err) {
            console.error("Avatar upload failed:", err);
          }
        }

        const profileData = {
          fullname,
          username,
          email: user.email || '',
          phone: user.phone || '',
          avatar: avatarUrl,
          city,
          interests
        };

        await createUserProfile(user, profileData);

        // Update auth metadata
        await supabase.auth.updateUser({
          data: { fullname, username, avatar: avatarUrl }
        });

        authState = AuthState.AUTHENTICATED;

        if (typeof STATE !== 'undefined') {
          STATE.currentUser = { ...profileData, id: user.id, uid: user.id };
        }

        syncUserProfileUI({ ...profileData, id: user.id, uid: user.id });

        if (typeof window.initAppAuthenticated === 'function') {
          window.initAppAuthenticated();
        }

        if (typeof showScreen === 'function') {
          showScreen('home');
        }

      } catch (err) {
        console.error("Profile setup failed:", err);
        showSetupError(err.message || "Failed to complete setup.");
      } finally {
        setLoadingState('auth-setup-submit-btn', false, 'Save & Continue');
      }
    });
  }
}

// Password visibility toggle
window.togglePasswordVisibility = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  if (btn) {
    btn.classList.toggle('active', isPassword);
  }
};

console.log('[Auth] YaarBuzz Secure Auth Service loaded');
