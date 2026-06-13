/**
 * YaarBuzz - Authentication Service
 * Consolidated Supabase-based authentication with OTP, email, and Google OAuth
 */

// Auth state
let signupState = {
  fullname: '',
  username: '',
  emailOrPhone: '',
  password: ''
};
let signupAvatarFile = null;
let timerInterval = null;
let isAuthInitialized = false;

// Generate dynamic color avatar based on user initials
window.generateDefaultAvatar = function(name) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'YB';
  const colors = ['#FF7A00', '#00A86B', '#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B'];
  const selectedColor = colors[initials.charCodeAt(0) % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="150" height="150">
    <circle cx="50" cy="50" r="48" fill="${selectedColor}" />
    <text x="50%" y="54%" font-family="'Outfit', sans-serif" font-size="36" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
const generateDefaultAvatar = window.generateDefaultAvatar;

// Show auth error message
function showAuthError(msg) {
  const errDiv = document.getElementById('auth-error-msg');
  if (errDiv) {
    if (msg) {
      errDiv.textContent = msg;
      errDiv.style.display = 'block';
    } else {
      errDiv.style.display = 'none';
    }
  }
}

// Check username availability
async function checkUsernameAvailability(username) {
  if (username.length < 3) {
    return { available: false, reason: "Too short (minimum 3 characters)" };
  }
  const regex = /^[a-zA-Z0-9_]+$/;
  if (!regex.test(username)) {
    return { available: false, reason: "Letters, numbers, and underscores only" };
  }

  try {
    const { data, error } = await supabase
      .from('usernames')
      .select('username')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error("Error checking username:", error);
      return { available: false, reason: "Error verifying username" };
    }

    if (data) {
      return { available: false, reason: "Username is already taken" };
    }
    return { available: true };
  } catch (e) {
    console.error("Error checking username availability:", e);
    window.logError("Username Availability Check", e);
    return { available: false, reason: "Error verifying username" };
  }
}

// Create user profile in database
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

    if (error) throw error;

    // Add to usernames table
    await supabase
      .from('usernames')
      .insert({
        username: profileData.username.toLowerCase(),
        uid: user.id,
        email: profileData.email || user.email || '',
        user_id: user.id
      });

    return data;
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

// Sync user profile UI
function syncUserProfileUI(user) {
  document.getElementById('profile-user-fullname').textContent = user.fullname || 'YaarBuzz User';
  document.getElementById('profile-user-handle').textContent = '@' + (user.username || 'user');
  document.getElementById('profile-user-pic').src = user.avatar || generateDefaultAvatar(user.fullname);

  document.getElementById('profile-stat-posts').textContent = user.posts_count || 0;
  document.getElementById('profile-stat-followers').textContent = user.followers_count || 0;
  document.getElementById('profile-stat-following').textContent = user.following_count || 0;
  document.getElementById('profile-stat-points').textContent = user.points || 0;

  const previewPic = document.getElementById('edit-profile-pic-preview');
  if (previewPic) {
    previewPic.src = user.avatar || generateDefaultAvatar(user.fullname);
  }

  // Bind badges
  const userBadges = user.badges || [];
  const pioneerBadge = document.getElementById('badge-pioneer');
  if (pioneerBadge) pioneerBadge.classList.toggle('active', userBadges.includes('pioneer'));

  const localBadge = document.getElementById('badge-local');
  if (localBadge) localBadge.classList.toggle('active', userBadges.includes('local') || (user.city && user.city !== 'Unspecified'));

  const streakBadge = document.getElementById('badge-streak');
  if (streakBadge) streakBadge.classList.toggle('active', userBadges.includes('streak'));

  const creatorBadge = document.getElementById('badge-creator');
  if (creatorBadge) creatorBadge.classList.toggle('active', userBadges.includes('creator') || (user.posts_count >= 10));
}

// Load user profile from database
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

// Transition to main app
function transitionToApp() {
  if (STATE.currentScreen === 'auth' || STATE.currentScreen === 'onboarding') {
    showScreen('home');
  }
}

// ============================================
// EMAIL/PASSWORD AUTHENTICATION
// ============================================

async function loginUserUnified(identifier, password) {
  showAuthError(null);

  const cleanId = identifier.trim();
  if (!cleanId || !password) {
    showAuthError("All fields are required!");
    return;
  }

  const loginBtn = document.getElementById('auth-login-btn');
  loginBtn.disabled = true;
  loginBtn.querySelector('span').textContent = "Logging In...";

  try {
    let resolvedEmail = cleanId;

    // Check if input is a non-email identifier
    if (!cleanId.includes('@')) {
      // Could be username or phone
      const isPhone = /^\+?[0-9\s\-()]{7,15}$/.test(cleanId);
      if (isPhone) {
        // Phone login - OTP flow should be used, show error
        showAuthError("For phone login, please use 'Log In with Phone OTP' option below.");
        loginBtn.disabled = false;
        loginBtn.querySelector('span').textContent = "Log In";
        return;
      } else {
        // Username login - lookup email from usernames table
        const { data, error } = await supabase
          .from('usernames')
          .select('email')
          .eq('username', cleanId.toLowerCase())
          .maybeSingle();

        if (!data) {
          throw new Error("Username not found. Please verify or Sign Up.");
        }
        resolvedEmail = data.email;
      }
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password: password
    });

    if (error) throw error;

    // Session established - onAuthStateChange will handle the rest
  } catch (error) {
    console.error("Login error:", error);
    window.logError("Unified Login", error);

    if (error.message.includes('Invalid login credentials')) {
      showAuthError("Invalid email/username or password.");
    } else {
      showAuthError(error.message);
    }
  } finally {
    loginBtn.disabled = false;
    loginBtn.querySelector('span').textContent = "Log In";
  }
}

// ============================================
// SIGNUP FLOW
// ============================================

async function handleSignupNext() {
  showAuthError(null);
  const fullname = document.getElementById('auth-signup-fullname').value.trim();
  const username = document.getElementById('auth-signup-username').value.trim().toLowerCase();
  const emailOrPhone = document.getElementById('auth-signup-email-phone').value.trim();
  const password = document.getElementById('auth-signup-password').value;

  if (!fullname || !username || !emailOrPhone || !password) {
    showAuthError("All credentials are required!");
    return;
  }

  if (password.length < 6) {
    showAuthError("Password must be at least 6 characters!");
    return;
  }

  const signupBtn = document.getElementById('auth-signup-next-btn');
  signupBtn.disabled = true;
  signupBtn.querySelector('span').textContent = "Validating...";

  try {
    const availability = await checkUsernameAvailability(username);
    if (!availability.available) {
      showAuthError(availability.reason);
      signupBtn.disabled = false;
      signupBtn.querySelector('span').textContent = "Next Step";
      return;
    }

    // Save state
    signupState.fullname = fullname;
    signupState.username = username;
    signupState.emailOrPhone = emailOrPhone;
    signupState.password = password;

    // Transition UI
    document.getElementById('auth-signup-step1').style.display = 'none';
    document.getElementById('auth-signup-step2').style.display = 'flex';
    document.getElementById('signup-step2-dot').classList.add('active');
    document.getElementById('signup-step-line').classList.add('active');
  } catch (err) {
    window.logError("Signup Next Step", err);
    showAuthError("Validation error: " + err.message);
  } finally {
    signupBtn.disabled = false;
    signupBtn.querySelector('span').textContent = "Next Step";
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
  const city = document.getElementById('auth-signup-city').value;

  const interests = [];
  document.querySelectorAll('#auth-signup-interests .interest-chip.active').forEach(chip => {
    interests.push(chip.getAttribute('data-interest'));
  });

  // Show loading panel
  document.getElementById('auth-signup-step2').style.display = 'none';
  document.getElementById('auth-signup-step3').style.display = 'flex';

  try {
    // Double-check username at submit
    const availability = await checkUsernameAvailability(signupState.username);
    if (!availability.available) {
      throw new Error(`Username is taken: ${availability.reason}`);
    }

    let email = signupState.emailOrPhone;
    let phone = '';

    // Check if input is phone format
    const isPhone = /^\+?[0-9\s\-()]{7,15}$/.test(email);
    if (isPhone) {
      phone = email.replace(/[^0-9+]/g, '');
      // For phone-based signup, we need to use OTP first
      // Store data and trigger OTP flow
      showAuthError("Phone signup requires OTP verification. Please use the Phone OTP option.");
      document.getElementById('auth-signup-step3').style.display = 'none';
      document.getElementById('auth-signup-step2').style.display = 'flex';
      return;
    } else if (!email.includes('@')) {
      throw new Error("Please enter a valid email address or phone number.");
    }

    // Create account with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password: signupState.password,
      options: {
        data: {
          fullname: signupState.fullname,
          username: signupState.username
        }
      }
    });

    if (authError) throw authError;

    const user = authData.user;

    // Check if email confirmation is required
    if (!user) {
      showAuthError("Please check your email to confirm your account, then log in.");
      document.getElementById('auth-signup-step3').style.display = 'none';
      document.getElementById('auth-signup-step1').style.display = 'flex';
      document.getElementById('auth-tab-login').click();
      return;
    }

    // Upload avatar if exists
    let avatarUrl = generateDefaultAvatar(signupState.fullname);
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
        console.error("Avatar upload failed, using default", uploadErr);
      }
    }

    // Create user profile in database
    const profileData = {
      fullname: signupState.fullname,
      username: signupState.username,
      email: email.toLowerCase().trim(),
      phone: phone,
      avatar: avatarUrl,
      city: city || 'Unspecified',
      interests: interests
    };

    await createUserProfile(user, profileData);

    // Update auth metadata
    await supabase.auth.updateUser({
      data: {
        fullname: signupState.fullname,
        username: signupState.username,
        avatar: avatarUrl
      }
    });

    STATE.currentUser = { ...profileData, id: user.id, uid: user.id };
    syncUserProfileUI(STATE.currentUser);

    if (typeof window.initAppAuthenticated === 'function') {
      window.initAppAuthenticated();
    }
    transitionToApp();

  } catch (error) {
    console.error("Registration failed:", error);
    window.logError("Account Registration", error);
    showAuthError(error.message);

    document.getElementById('auth-signup-step3').style.display = 'none';
    document.getElementById('auth-signup-step2').style.display = 'flex';
  }
}

// ============================================
// PHONE OTP AUTHENTICATION
// ============================================

async function sendPhoneOTP(phoneNumber, isResend = false) {
  showAuthError(null);

  // Validate phone format
  const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
  const phoneRegex = /^\+[1-9]\d{1,14}$/;

  if (!phoneRegex.test(cleanPhone)) {
    showAuthError("Invalid phone format! Include country code (e.g. +919876543210).");
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
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: cleanPhone
    });

    if (error) throw error;

    // Show OTP input section
    document.getElementById('phone-input-section').style.display = 'none';
    document.getElementById('otp-input-section').style.display = 'block';

    startOTPTimer();
    return true;

  } catch (error) {
    console.error("OTP send error:", error);
    window.logError("Send Phone OTP", error);

    if (error.message.includes('rate limit')) {
      showAuthError("Too many OTP requests. Please wait before trying again.");
    } else {
      showAuthError("Failed to send OTP: " + error.message);
    }
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

  if (!otp || otp.length !== 6) {
    showAuthError("Please enter the 6-digit verification code.");
    return false;
  }

  const verifyBtn = document.getElementById('auth-verify-otp-btn');
  verifyBtn.disabled = true;
  verifyBtn.querySelector('span').textContent = "Verifying...";

  try {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');

    const { data, error } = await supabase.auth.verifyOtp({
      phone: cleanPhone,
      token: otp,
      type: 'sms'
    });

    if (error) throw error;

    clearInterval(timerInterval);
    return true;

  } catch (error) {
    console.error("OTP verify error:", error);
    window.logError("Verify Phone OTP", error);
    showAuthError("OTP Verification Failed: " + error.message);
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

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    countdownEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerText.style.display = 'none';
      resendBtn.style.display = 'inline-block';
    }
  }, 1000);
}

// ============================================
// GOOGLE OAUTH
// ============================================

async function loginUserWithGoogle() {
  showAuthError(null);
  const googleBtn = document.getElementById('auth-google-btn');
  if (!googleBtn) return;

  googleBtn.disabled = true;
  googleBtn.innerHTML = '<span>Connecting...</span>';

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) throw error;
    // Redirect happens automatically

  } catch (error) {
    console.error("Google login error:", error);
    window.logError("Google OAuth", error);
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

async function resetUserPassword(email) {
  showAuthError(null);

  if (!email) {
    showAuthError("Please enter your email address.");
    return;
  }

  const forgotBtn = document.getElementById('auth-forgot-btn');
  forgotBtn.disabled = true;
  forgotBtn.querySelector('span').textContent = "Sending Link...";

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
    window.logError("Reset Password Flow", error);
    showAuthError(error.message);
  } finally {
    forgotBtn.disabled = false;
    forgotBtn.querySelector('span').textContent = "Send Reset Link";
  }
}

// ============================================
// LOGOUT
// ============================================

async function logoutUser() {
  try {
    clearInterval(timerInterval);

    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    STATE.currentUser = null;

    // Clean form values
    const loginIdentifier = document.getElementById('auth-login-identifier');
    const loginPassword = document.getElementById('auth-login-password');
    if (loginIdentifier) loginIdentifier.value = '';
    if (loginPassword) loginPassword.value = '';

    document.getElementById('phone-input-section').style.display = 'block';
    document.getElementById('otp-input-section').style.display = 'none';

    const tabLogin = document.getElementById('auth-tab-login');
    if (tabLogin) tabLogin.click();

    showScreen('auth');

  } catch (error) {
    console.error("Logout error:", error);
    showScreen('auth');
  }
}

// ============================================
// AUTH STATE LISTENER
// ============================================

function setupAuthListener() {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("[Auth] State changed:", event);

    const hideSplash = () => {
      const splash = document.getElementById('screen-splash');
      if (splash) {
        splash.classList.add('hide');
      }
    };

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      const user = session?.user;
      if (!user) {
        hideSplash();
        return;
      }

      // Load user profile
      let profile = await loadUserProfile(user.id);

      if (!profile) {
        // New user (Google/OTP) - need profile setup
        const setupFullname = document.getElementById('auth-setup-fullname');
        const setupAvatarPreview = document.getElementById('auth-setup-avatar-preview');

        const userMeta = user.user_metadata || {};
        if (setupFullname) setupFullname.value = userMeta.fullname || userMeta.name || '';
        if (setupAvatarPreview) {
          setupAvatarPreview.src = userMeta.avatar || userMeta.picture || generateDefaultAvatar(userMeta.fullname || userMeta.name || 'YB');
        }

        const setupUsername = document.getElementById('auth-setup-username');
        if (setupUsername) {
          let suggestedName = (userMeta.fullname || userMeta.name || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '_');
          if (suggestedName.length < 3) suggestedName = 'user_' + Math.floor(1000 + Math.random() * 9000);
          setupUsername.value = suggestedName;
        }

        showScreen('profile-setup');
        hideSplash();
      } else {
        STATE.currentUser = profile;
        syncUserProfileUI(STATE.currentUser);

        if (typeof window.initAppAuthenticated === 'function') {
          window.initAppAuthenticated();
        }
        transitionToApp();
        hideSplash();
      }
    } else if (event === 'SIGNED_OUT') {
      STATE.currentUser = null;
      showScreen('auth');
      hideSplash();
    } else if (event === 'INITIAL_SESSION') {
      if (session?.user) {
        // Handle initial session same as signed in
        const profile = await loadUserProfile(session.user.id);
        if (profile) {
          STATE.currentUser = profile;
          syncUserProfileUI(STATE.currentUser);
          if (typeof window.initAppAuthenticated === 'function') {
            window.initAppAuthenticated();
          }
          transitionToApp();
        }
      }
      hideSplash();
    }

    isAuthInitialized = true;
  });
}

// ============================================
// DOM SETUP
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('settings-logout-btn');
  const tabLogin = document.getElementById('auth-tab-login');
  const tabSignup = document.getElementById('auth-tab-signup');
  const loginView = document.getElementById('auth-login-view');
  const signupView = document.getElementById('auth-signup-view');
  const forgotView = document.getElementById('auth-forgot-view');
  const phoneView = document.getElementById('auth-phone-view');

  const loginIdentifier = document.getElementById('auth-login-identifier');
  const loginPassword = document.getElementById('auth-login-password');
  const loginSubmitBtn = document.getElementById('auth-login-btn');
  const googleBtn = document.getElementById('auth-google-btn');
  const forgotEmailInput = document.getElementById('auth-forgot-email');
  const forgotSubmitBtn = document.getElementById('auth-forgot-btn');

  const signupNextBtn = document.getElementById('auth-signup-next-btn');
  const signupBackBtn = document.getElementById('auth-signup-back-btn');
  const signupSubmitBtn = document.getElementById('auth-signup-submit-btn');

  const phoneOtpToggle = document.getElementById('auth-toggle-phone-otp-login');
  const passwordToggle = document.getElementById('auth-toggle-password-login');
  const sendOtpBtn = document.getElementById('auth-send-otp-btn');
  const verifyOtpBtn = document.getElementById('auth-verify-otp-btn');
  const resendOtpBtn = document.getElementById('auth-resend-otp-btn');
  const otpInput = document.getElementById('login-otp');
  const phoneInput = document.getElementById('login-identifier');

  // Setup auth listener
  setupAuthListener();

  // Tab toggles
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
  if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener('click', () => {
      loginUserUnified(loginIdentifier.value, loginPassword.value);
    });
  }

  // Google button
  if (googleBtn) {
    googleBtn.addEventListener('click', loginUserWithGoogle);
  }

  // Signup flow
  if (signupNextBtn) signupNextBtn.addEventListener('click', handleSignupNext);
  if (signupBackBtn) signupBackBtn.addEventListener('click', handleSignupBack);
  if (signupSubmitBtn) signupSubmitBtn.addEventListener('click', handleSignupSubmit);

  // Forgot password
  if (forgotSubmitBtn) {
    forgotSubmitBtn.addEventListener('click', () => resetUserPassword(forgotEmailInput.value));
  }

  // Phone OTP
  if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', () => sendPhoneOTP(phoneInput.value, false));
  }

  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', () => sendPhoneOTP(phoneInput.value, true));
  }

  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', async () => {
      const success = await verifyPhoneOTP(phoneInput.value, otpInput.value);
      // onAuthStateChange will handle the redirect
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
        statusDiv.style.display = 'none';
        return;
      }

      statusDiv.textContent = "Checking...";
      statusDiv.style.color = "var(--text-secondary)";
      statusDiv.style.display = "block";

      checkTimeout = setTimeout(async () => {
        const result = await checkUsernameAvailability(username);
        if (result.available) {
          statusDiv.textContent = "Username is available!";
          statusDiv.style.color = "var(--secondary-green)";
        } else {
          statusDiv.textContent = result.reason;
          statusDiv.style.color = "var(--danger-red)";
        }
      }, 600);
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logoutUser);
  }

  // Profile setup (for Google/OTP users)
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
        statusDiv.style.display = 'none';
        return;
      }

      statusDiv.textContent = "Checking...";
      statusDiv.style.color = "var(--text-secondary)";
      statusDiv.style.display = "block";

      checkTimeout = setTimeout(async () => {
        const result = await checkUsernameAvailability(username);
        if (result.available) {
          statusDiv.textContent = "Username is available!";
          statusDiv.style.color = "var(--secondary-green)";
        } else {
          statusDiv.textContent = result.reason;
          statusDiv.style.color = "var(--danger-red)";
        }
      }, 600);
    });
  }

  // Setup submit
  const setupSubmitBtn = document.getElementById('auth-setup-submit-btn');
  if (setupSubmitBtn) {
    setupSubmitBtn.addEventListener('click', async () => {
      const errorDiv = document.getElementById('setup-error-msg');
      if (errorDiv) errorDiv.style.display = 'none';

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showScreen('auth');
        return;
      }

      const fullname = document.getElementById('auth-setup-fullname').value.trim();
      const username = document.getElementById('auth-setup-username').value.trim().toLowerCase();
      const city = document.getElementById('auth-setup-city').value;

      const interests = [];
      document.querySelectorAll('#auth-setup-interests .interest-chip.active').forEach(chip => {
        interests.push(chip.getAttribute('data-interest'));
      });

      if (!fullname || !username) {
        if (errorDiv) {
          errorDiv.textContent = "Full Name and Username are required!";
          errorDiv.style.display = 'block';
        }
        return;
      }

      setupSubmitBtn.disabled = true;
      setupSubmitBtn.querySelector('span').textContent = "Saving...";

      try {
        const availability = await checkUsernameAvailability(username);
        if (!availability.available) {
          throw new Error(availability.reason);
        }

        // Upload avatar if selected
        let avatarUrl = user.user_metadata?.avatar || user.user_metadata?.picture || generateDefaultAvatar(fullname);
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
            console.error("Avatar upload failed", err);
          }
        }

        const profileData = {
          fullname: fullname,
          username: username,
          email: user.email || '',
          phone: user.phone || '',
          avatar: avatarUrl,
          city: city || 'Unspecified',
          interests: interests
        };

        await createUserProfile(user, profileData);

        // Update auth metadata
        await supabase.auth.updateUser({
          data: {
            fullname: fullname,
            username: username,
            avatar: avatarUrl
          }
        });

        STATE.currentUser = { ...profileData, id: user.id, uid: user.id };
        syncUserProfileUI(STATE.currentUser);

        if (typeof window.initAppAuthenticated === 'function') {
          window.initAppAuthenticated();
        }
        showScreen('home');

      } catch (err) {
        console.error("Profile setup failed:", err);
        if (errorDiv) {
          errorDiv.textContent = err.message || "Failed to complete setup.";
          errorDiv.style.display = 'block';
        }
      } finally {
        setupSubmitBtn.disabled = false;
        setupSubmitBtn.querySelector('span').textContent = "Save & Continue";
      }
    });
  }
});

console.log('[Auth] YaarBuzz Auth Service loaded');
