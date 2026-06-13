// auth.js
// Handles Firebase Authentication, multi-step signup, unified login resolution, and user session management

if (window.location.protocol === 'file:' && navigator.onLine) {
  window.location.href = 'https://yaarbuzz-f59d7.web.app';
}

let isAuthInitialized = false;
let confirmationResult = null;
let timerInterval = null;

let signupState = {
  fullname: '',
  username: '',
  emailOrPhone: '',
  password: ''
};
let signupAvatarFile = null;

// Clean error helper
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

// Generate dynamic color avatar based on user initials
window.generateDefaultAvatar = function(name) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'YB';
  const colors = ['#FF7A00', '#00A86B', '#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B'];
  // Deterministic color selection
  const selectedColor = colors[initials.charCodeAt(0) % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="150" height="150">
    <circle cx="50" cy="50" r="48" fill="${selectedColor}" />
    <text x="50%" y="54%" font-family="'Outfit', sans-serif" font-size="36" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
const generateDefaultAvatar = window.generateDefaultAvatar;


// Live Username Availability Check
async function checkUsernameAvailability(username) {
  if (username.length < 3) {
    return { available: false, reason: "Too short (minimum 3 characters)" };
  }
  const regex = /^[a-zA-Z0-9_]+$/;
  if (!regex.test(username)) {
    return { available: false, reason: "Letters, numbers, and underscores only" };
  }
  
  try {
    const doc = await db.collection('usernames').doc(username.toLowerCase().trim()).get();
    if (doc.exists) {
      return { available: false, reason: "Username is already taken" };
    }
    return { available: true };
  } catch (e) {
    console.error("Error checking username availability:", e);
    window.logError("Username Availability Check", e);
    return { available: false, reason: "Error verifying username" };
  }
}

// Unified Login Resolver (resolves email, username, phone number to firebase login credentials)
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
      const isPhone = /^\+?[0-9\s\-()]{7,15}$/.test(cleanId);
      if (isPhone) {
        // Phone login - format cleanly to match synthetic signups
        const cleanPhone = cleanId.replace(/[^0-9+]/g, '');
        resolvedEmail = `phone_${cleanPhone}@yaarbuzz.com`;
      } else {
        // Username login - retrieve associated email from usernames index doc
        const usernameQuery = cleanId.toLowerCase();
        const doc = await db.collection('usernames').doc(usernameQuery).get();
        if (!doc.exists) {
          throw new Error("Username not found. Please verify or Sign Up.");
        }
        resolvedEmail = doc.data().email;
      }
    }

    await auth.signInWithEmailAndPassword(resolvedEmail, password);
  } catch (error) {
    console.error("Unified login error:", error);
    window.logError("Unified Login", error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      showAuthError("Invalid username, email, phone or password.");
    } else {
      showAuthError(error.message);
    }
  } finally {
    loginBtn.disabled = false;
    loginBtn.querySelector('span').textContent = "Log In";
  }
}

// Signup Step 1 Next Transition
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

    // Save state details
    signupState.fullname = fullname;
    signupState.username = username;
    signupState.emailOrPhone = emailOrPhone;
    signupState.password = password;

    // Transition UI step
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

// Signup Step 2 Back Transition
function handleSignupBack() {
  document.getElementById('auth-signup-step2').style.display = 'none';
  document.getElementById('auth-signup-step1').style.display = 'flex';
  document.getElementById('signup-step2-dot').classList.remove('active');
  document.getElementById('signup-step-line').classList.remove('active');
  showAuthError(null);
}

// Signup Final Registration Submit
async function handleSignupSubmit() {
  showAuthError(null);
  const city = document.getElementById('auth-signup-city').value;
  
  // Fetch interest selections
  const interests = [];
  document.querySelectorAll('#auth-signup-interests .interest-chip.active').forEach(chip => {
    interests.push(chip.getAttribute('data-interest'));
  });

  // Switch to Step 3 Creating Panel loader
  document.getElementById('auth-signup-step2').style.display = 'none';
  document.getElementById('auth-signup-step3').style.display = 'flex';

  try {
    // 0. Double-check username uniqueness at submit time to prevent race conditions
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
      email = `phone_${phone}@yaarbuzz.com`; // Synthetic unique mapping email
    } else if (!email.includes('@')) {
      throw new Error("Please enter a valid email address or phone number.");
    }

    // 1. Create account on Firebase Authentication
    const userCredential = await auth.createUserWithEmailAndPassword(email, signupState.password);
    const user = userCredential.user;

    // 2. Upload Profile Picture to Firebase Storage if exists
    let avatarUrl = '';
    if (signupAvatarFile) {
      try {
        const storageRef = storage.ref();
        const picRef = storageRef.child(`profile_pics/${user.uid}/${Date.now()}_${signupAvatarFile.name}`);
        const uploadResult = await picRef.put(signupAvatarFile);
        avatarUrl = await uploadResult.ref.getDownloadURL();
      } catch (uploadErr) {
        console.error("Avatar upload failed, falling back to initials SVG", uploadErr);
        window.logError("Signup avatar upload fallback", uploadErr);
        avatarUrl = generateDefaultAvatar(signupState.fullname);
      }
    } else {
      avatarUrl = generateDefaultAvatar(signupState.fullname);
    }

    // 3. Create document in Firestore users collection
    const newUserProfile = {
      uid: user.uid,
      email: email.toLowerCase().trim(),
      phone: phone,
      fullname: signupState.fullname,
      username: signupState.username,
      avatar: avatarUrl,
      city: city || 'Unspecified',
      interests: interests,
      points: 50, // Welcome signup bonus
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      following: [],
      followers: [],
      badges: ['pioneer'], // Automatic Pioneer Badge
      bio: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const batch = db.batch();
    const userRef = db.collection('users').doc(user.uid);
    const usernameRef = db.collection('usernames').doc(signupState.username);
    batch.set(userRef, newUserProfile);
    batch.set(usernameRef, { uid: user.uid, email: email.toLowerCase().trim() });
    await batch.commit();

    STATE.currentUser = newUserProfile;

    // Update firebase user credentials
    await user.updateProfile({
      displayName: signupState.fullname,
      photoURL: avatarUrl
    });

    syncUserProfileUI(newUserProfile);
    
    if (typeof window.initAppAuthenticated === 'function') {
      window.initAppAuthenticated();
    }
    transitionToApp();
  } catch (error) {
    console.error("Registration failed:", error);
    window.logError("Account Registration Rebuild", error);
    showAuthError(error.message);
    
    // Fallback back to Step 2 Customize Panel
    document.getElementById('auth-signup-step3').style.display = 'none';
    document.getElementById('auth-signup-step2').style.display = 'flex';
  }
}

// Send Password Reset Email
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
    await auth.sendPasswordResetEmail(email.trim());
    window.showNotification("Password reset email sent successfully! Please check your inbox.", "success");
    
    // Switch view back to Login
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

// Sync user stats and badges dynamically from Firestore variables
function syncUserProfileUI(user) {
  document.getElementById('profile-user-fullname').textContent = user.fullname || 'YaarBuzz User';
  document.getElementById('profile-user-handle').textContent = '@' + (user.username || 'user');
  document.getElementById('profile-user-pic').src = user.avatar || generateDefaultAvatar(user.fullname);
  
  const postsCount = user.postsCount || 0;
  const followersCount = user.followersCount || 0;
  const followingCount = user.followingCount || 0;
  const points = user.points || 0;

  document.getElementById('profile-stat-posts').textContent = postsCount;
  document.getElementById('profile-stat-followers').textContent = followersCount;
  document.getElementById('profile-stat-following').textContent = followingCount;
  document.getElementById('profile-stat-points').textContent = points;
  
  const previewPic = document.getElementById('edit-profile-pic-preview');
  if (previewPic) {
    previewPic.src = user.avatar || generateDefaultAvatar(user.fullname);
  }

  // Bind Badges dynamically from DB array (remove HTML active flags)
  const userBadges = user.badges || [];
  
  const pioneerBadge = document.getElementById('badge-pioneer');
  if (pioneerBadge) {
    if (userBadges.includes('pioneer')) pioneerBadge.classList.add('active');
    else pioneerBadge.classList.remove('active');
  }

  const localBadge = document.getElementById('badge-local');
  if (localBadge) {
    if (userBadges.includes('local') || (user.city && user.city !== 'Unspecified')) {
      localBadge.classList.add('active');
    } else {
      localBadge.classList.remove('active');
    }
  }

  const streakBadge = document.getElementById('badge-streak');
  if (streakBadge) {
    if (userBadges.includes('streak')) streakBadge.classList.add('active');
    else streakBadge.classList.remove('active');
  }

  const creatorBadge = document.getElementById('badge-creator');
  if (creatorBadge) {
    if (userBadges.includes('creator') || postsCount >= 10) creatorBadge.classList.add('active');
    else creatorBadge.classList.remove('active');
  }
}

function transitionToApp() {
  if (STATE.currentScreen === 'auth' || STATE.currentScreen === 'onboarding') {
    showScreen('home');
  }
}

function startOtpTimer() {
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

// reCAPTCHA setup for SMS verification
function setupRecaptcha() {
  if (typeof firebase !== 'undefined' && firebase.auth) {
    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        document.getElementById('recaptcha-container').innerHTML = '';
      }
      
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {},
        'expired-callback': () => {
          showAuthError("Security check expired. Please try again.");
        }
      });
      window.recaptchaVerifier.render();
    } catch(e) {
      console.error("reCAPTCHA initialization error:", e);
      window.logError("SMS reCAPTCHA Init", e);
      showAuthError("Failed to initialize verification verification check.");
    }
  }
}

function triggerSmsSend(isResend = false) {
  showAuthError(null);
  const sendOtpBtn = document.getElementById('auth-send-otp-btn');
  const sendBtnText = document.getElementById('send-btn-text');
  const resendOtpBtn = document.getElementById('auth-resend-otp-btn');
  const phoneInput = document.getElementById('login-identifier');
  
  let phoneNumber = phoneInput.value.trim();

  // Basic Mobile Number Validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    showAuthError("Invalid phone format! Include country code (e.g. +919876543210).");
    return;
  }

  if (!isResend) {
    sendOtpBtn.disabled = true;
    sendBtnText.textContent = "Sending...";
  } else {
    resendOtpBtn.textContent = "Sending...";
    resendOtpBtn.disabled = true;
  }
  
  try {
    const appVerifier = window.recaptchaVerifier;
    firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier)
      .then((result) => {
        window.confirmationResult = result;
        
        sendOtpBtn.disabled = false;
        sendBtnText.textContent = "Send OTP via SMS";
        resendOtpBtn.textContent = "Resend OTP";
        resendOtpBtn.disabled = false;
        
        document.getElementById('phone-input-section').style.display = 'none';
        document.getElementById('otp-input-section').style.display = 'block';
        document.getElementById('recaptcha-container').style.display = 'none';
        
        startOtpTimer();
      })
      .catch((error) => {
        sendOtpBtn.disabled = false;
        sendBtnText.textContent = "Send OTP via SMS";
        resendOtpBtn.textContent = "Resend OTP";
        resendOtpBtn.disabled = false;

        window.logError("SMS Verification Send", error);
        if (error.code === 'auth/too-many-requests') {
           showAuthError("Too many SMS requests sent. Please try again later.");
        } else if (error.code === 'auth/invalid-phone-number') {
           showAuthError("The phone number provided is invalid.");
        } else {
           showAuthError("Error sending SMS: " + error.message);
        }
        setupRecaptcha();
      });
  } catch (e) {
    sendOtpBtn.disabled = false;
    sendBtnText.textContent = "Send OTP via SMS";
    resendOtpBtn.disabled = false;
    window.logError("SMS Request Pipeline", e);
    window.showNotification("Firebase Phone Auth error. Ensure configuration credentials are set.", "error");
  }
}

async function loginUserWithGoogle() {
  showAuthError(null);
  const googleBtn = document.getElementById('auth-google-btn');
  if (!googleBtn) return;
  googleBtn.disabled = true;
  const originalHtml = googleBtn.innerHTML;
  googleBtn.innerHTML = '<span>Connecting...</span>';

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithRedirect(provider);
  } catch (error) {
    console.error("Google login error:", error);
    window.logError("Google OAuth Redirect", error);
    showAuthError("Google Sign-In failed: " + error.message);
    googleBtn.disabled = false;
    googleBtn.innerHTML = originalHtml;
  }
}

// DOM Setup and Binding on load
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('settings-logout-btn');
  
  // Tab selectors
  const tabLogin = document.getElementById('auth-tab-login');
  const tabSignup = document.getElementById('auth-tab-signup');
  
  // Panels
  const loginView = document.getElementById('auth-login-view');
  const signupView = document.getElementById('auth-signup-view');
  const forgotView = document.getElementById('auth-forgot-view');
  const phoneView = document.getElementById('auth-phone-view');
  const captchaContainer = document.getElementById('recaptcha-container');

  // Input & triggers
  const loginIdentifier = document.getElementById('auth-login-identifier');
  const loginPassword = document.getElementById('auth-login-password');
  const loginSubmitBtn = document.getElementById('auth-login-btn');
  const googleBtn = document.getElementById('auth-google-btn');
  const forgotEmailInput = document.getElementById('auth-forgot-email');
  const forgotSubmitBtn = document.getElementById('auth-forgot-btn');

  // Step selectors
  const signupNextBtn = document.getElementById('auth-signup-next-btn');
  const signupBackBtn = document.getElementById('auth-signup-back-btn');
  const signupSubmitBtn = document.getElementById('auth-signup-submit-btn');
  
  const phoneOtpToggle = document.getElementById('auth-toggle-phone-otp-login');
  const passwordToggle = document.getElementById('auth-toggle-password-login');

  const sendOtpBtn = document.getElementById('auth-send-otp-btn');
  const verifyOtpBtn = document.getElementById('auth-verify-otp-btn');
  const resendOtpBtn = document.getElementById('auth-resend-otp-btn');
  const otpInput = document.getElementById('login-otp');

  // 1. Setup Form Toggles
  if (tabLogin && tabSignup) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      
      loginView.style.display = 'flex';
      signupView.style.display = 'none';
      phoneView.style.display = 'none';
      forgotView.style.display = 'none';
      captchaContainer.style.display = 'none';
      showAuthError(null);
    });

    tabSignup.addEventListener('click', () => {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      
      signupView.style.display = 'flex';
      loginView.style.display = 'none';
      phoneView.style.display = 'none';
      forgotView.style.display = 'none';
      captchaContainer.style.display = 'none';
      
      // Reset signup step panels
      document.getElementById('auth-signup-step1').style.display = 'flex';
      document.getElementById('auth-signup-step2').style.display = 'none';
      document.getElementById('auth-signup-step3').style.display = 'none';
      document.getElementById('signup-step2-dot').classList.remove('active');
      document.getElementById('signup-step-line').classList.remove('active');
      
      showAuthError(null);
    });
  }

  if (phoneOtpToggle) {
    phoneOtpToggle.addEventListener('click', (e) => {
      e.preventDefault();
      loginView.style.display = 'none';
      phoneView.style.display = 'flex';
      captchaContainer.style.display = 'flex';
      showAuthError(null);
      setupRecaptcha();
    });
  }

  if (passwordToggle) {
    passwordToggle.addEventListener('click', (e) => {
      e.preventDefault();
      phoneView.style.display = 'none';
      captchaContainer.style.display = 'none';
      loginView.style.display = 'flex';
      showAuthError(null);
    });
  }

  document.getElementById('auth-forgot-link').addEventListener('click', (e) => {
    e.preventDefault();
    loginView.style.display = 'none';
    forgotView.style.display = 'flex';
    showAuthError(null);
  });

  document.getElementById('auth-toggle-to-login-from-forgot').addEventListener('click', (e) => {
    e.preventDefault();
    forgotView.style.display = 'none';
    loginView.style.display = 'flex';
    showAuthError(null);
  });

  // Step 2 chips listeners
  const interestChips = document.querySelectorAll('#auth-signup-interests .interest-chip');
  interestChips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
    });
  });

  // Avatar select elements
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

  // 2. Setup Firebase Auth Observer Listener
  try {
    firebase.auth().onAuthStateChanged((user) => {
      const hideSplash = () => {
        const splash = document.getElementById('screen-splash');
        if (splash) {
          splash.classList.add('hide');
        }
      };

      if (user) {
        const userRef = db.collection('users').doc(user.uid);
        userRef.get().then((doc) => {
          if (!doc.exists) {
            // New user via Google or SMS OTP: Redirect to Complete Profile Setup screen
            const setupFullname = document.getElementById('auth-setup-fullname');
            const setupAvatarPreview = document.getElementById('auth-setup-avatar-preview');
            
            if (setupFullname) setupFullname.value = user.displayName || '';
            if (setupAvatarPreview) {
              setupAvatarPreview.src = user.photoURL || generateDefaultAvatar(user.displayName || 'YaarBuzz User');
            }
            
            // Suggest clean handle based on displayName
            const setupUsername = document.getElementById('auth-setup-username');
            if (setupUsername) {
              let suggestedName = (user.displayName || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '_');
              if (suggestedName.length < 3) suggestedName = 'user_' + Math.floor(1000 + Math.random() * 9000);
              setupUsername.value = suggestedName;
              setupUsername.dispatchEvent(new Event('input')); // trigger availability check
            }
            
            showScreen('profile-setup');
            hideSplash();
          } else {
            STATE.currentUser = doc.data();
            syncUserProfileUI(STATE.currentUser);
            if (typeof window.initAppAuthenticated === 'function') {
              window.initAppAuthenticated();
            }
            transitionToApp();
            hideSplash();
          }
        }).catch(err => {
          console.error("Error reading Firestore profile:", err);
          window.logError("Profile Document Sync", err);
          
          // Fast local fallback block to bypass db errors during network issues
          STATE.currentUser = {
            uid: user.uid,
            fullname: user.displayName || 'YaarBuzz User',
            username: 'user_' + user.uid.substring(0, 5),
            avatar: user.photoURL || generateDefaultAvatar(user.displayName || 'YaarBuzz User'),
            points: 0,
            postsCount: 0,
            followersCount: 0,
            followingCount: 0,
            following: [],
            followers: [],
            badges: ['pioneer'],
            bio: ''
          };
          syncUserProfileUI(STATE.currentUser);
          if (typeof window.initAppAuthenticated === 'function') {
            window.initAppAuthenticated();
          }
          transitionToApp();
          hideSplash();
        });
      } else {
        STATE.currentUser = null;
        showScreen('auth');
        hideSplash();
      }
      isAuthInitialized = true;
    });
  } catch (e) {
    console.error("Firebase Auth Init Observer Error:", e);
    window.logError("Auth Observer Init", e);
  }

  // 3. Setup Button Click Event Triggers
  if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener('click', () => {
      loginUserUnified(loginIdentifier.value, loginPassword.value);
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', loginUserWithGoogle);
  }

  if (signupNextBtn) {
    signupNextBtn.addEventListener('click', handleSignupNext);
  }

  if (signupBackBtn) {
    signupBackBtn.addEventListener('click', handleSignupBack);
  }

  if (signupSubmitBtn) {
    signupSubmitBtn.addEventListener('click', handleSignupSubmit);
  }

  if (forgotSubmitBtn) {
    forgotSubmitBtn.addEventListener('click', () => {
      resetUserPassword(forgotEmailInput.value);
    });
  }

  if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', () => triggerSmsSend(false));
  }

  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', () => {
      setupRecaptcha();
      triggerSmsSend(true);
    });
  }

  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', () => {
      const code = otpInput.value.trim();
      if (!code || code.length !== 6) {
        showAuthError("Please enter the 6-digit verification code.");
        return;
      }

      verifyOtpBtn.disabled = true;
      verifyOtpBtn.querySelector('span').textContent = "Verifying...";
      
      window.confirmationResult.confirm(code).then((result) => {
        verifyOtpBtn.disabled = false;
        verifyOtpBtn.querySelector('span').textContent = "Verify OTP & Log In";
        clearInterval(timerInterval);
        showScreen('home');
      }).catch((error) => {
        verifyOtpBtn.disabled = false;
        verifyOtpBtn.querySelector('span').textContent = "Verify OTP & Log In";
        window.logError("OTP Verification confirmation", error);
        showAuthError("OTP Verification Failed: " + error.message);
      });
    });
  }

  // 4. Step 1 Live Username Check binding
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
      statusDiv.className = "username-status";
      statusDiv.style.color = "var(--text-secondary)";
      statusDiv.style.display = "block";
      
      checkTimeout = setTimeout(async () => {
        const result = await checkUsernameAvailability(username);
        if (result.available) {
          statusDiv.textContent = "Username is available! ✓";
          statusDiv.style.color = "var(--secondary-green)";
        } else {
          statusDiv.textContent = result.reason;
          statusDiv.style.color = "var(--danger-red)";
        }
      }, 600);
    });
  }

  // 5. Settings Logout Button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      STATE.currentUser = null;
      if (typeof window.clearAuthenticatedListeners === 'function') {
        window.clearAuthenticatedListeners();
      }
      firebase.auth().signOut().then(() => {
        clearInterval(timerInterval);
        
        // Clean values
        if (loginIdentifier) loginIdentifier.value = '';
        if (loginPassword) loginPassword.value = '';
        
        document.getElementById('phone-input-section').style.display = 'block';
        document.getElementById('otp-input-section').style.display = 'none';
        
        // Return login tab active on next load
        if (tabLogin) tabLogin.click();
        
        showScreen('auth');
      }).catch(() => showScreen('auth'));
    });
  }

  // 6. Complete Profile Setup Form (Google/SMS Onboarding)
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

  const setupInterestChips = document.querySelectorAll('#auth-setup-interests .interest-chip');
  setupInterestChips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
    });
  });

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
      statusDiv.className = "username-status";
      statusDiv.style.color = "var(--text-secondary)";
      statusDiv.style.display = "block";
      
      checkTimeout = setTimeout(async () => {
        const result = await checkUsernameAvailability(username);
        if (result.available) {
          statusDiv.textContent = "Username is available! ✓";
          statusDiv.style.color = "var(--secondary-green)";
        } else {
          statusDiv.textContent = result.reason;
          statusDiv.style.color = "var(--danger-red)";
        }
      }, 600);
    });
  }

  const setupSubmitBtn = document.getElementById('auth-setup-submit-btn');
  if (setupSubmitBtn) {
    setupSubmitBtn.addEventListener('click', async () => {
      const errorDiv = document.getElementById('setup-error-msg');
      if (errorDiv) errorDiv.style.display = 'none';

      const user = auth.currentUser;
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
        // Enforce uniqueness validation at setup submit
        const availability = await checkUsernameAvailability(username);
        if (!availability.available) {
          throw new Error(availability.reason);
        }

        // Upload Profile Picture if selected
        let avatarUrl = user.photoURL || generateDefaultAvatar(fullname);
        if (setupAvatarFile) {
          try {
            const storageRef = storage.ref();
            const picRef = storageRef.child(`profile_pics/${user.uid}/${Date.now()}_${setupAvatarFile.name}`);
            const uploadResult = await picRef.put(setupAvatarFile);
            avatarUrl = await uploadResult.ref.getDownloadURL();
          } catch (uploadErr) {
            console.error("Avatar upload failed, falling back to default", uploadErr);
          }
        }

        const newUserProfile = {
          uid: user.uid,
          email: user.email || '',
          phone: user.phoneNumber || '',
          fullname: fullname,
          username: username,
          avatar: avatarUrl,
          city: city || 'Unspecified',
          interests: interests,
          points: 50, // Welcome signup bonus
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
          following: [],
          followers: [],
          badges: ['pioneer'],
          bio: '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        let userEmail = user.email || '';
        if (!userEmail && user.phoneNumber) {
          const cleanPhone = user.phoneNumber.replace(/[^0-9+]/g, '');
          userEmail = `phone_${cleanPhone}@yaarbuzz.com`;
        }

        const batch = db.batch();
        const userRef = db.collection('users').doc(user.uid);
        const usernameRef = db.collection('usernames').doc(username);
        batch.set(userRef, newUserProfile);
        batch.set(usernameRef, { uid: user.uid, email: userEmail.toLowerCase().trim() });
        await batch.commit();

        STATE.currentUser = newUserProfile;

        await user.updateProfile({
          displayName: fullname,
          photoURL: avatarUrl
        });

        syncUserProfileUI(newUserProfile);
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

  // 7. Configure Explicit Local Auth Session Persistence
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .catch((err) => console.warn("Failed to set Auth persistence:", err));
  }
});
