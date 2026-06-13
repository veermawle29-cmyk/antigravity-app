/**
 * YaarBuzz - Master Client JavaScript Engine
 * Production‑Ready MVP Connected to Firebase Auth, Firestore, and Storage
 */

// --- CENTRALIZED ERROR LOGGING SYSTEM ---
window.logError = function(feature, error) {
  console.error(`[ERROR] Feature: ${feature} | Message: ${error.message || error}`, error);
  
  if (typeof db !== 'undefined' && db.collection) {
    try {
      const userId = (STATE.currentUser && STATE.currentUser.uid) ? STATE.currentUser.uid : 'anonymous';
      db.collection('errors').add({
        feature: feature,
        message: error.message || String(error),
        stack: error.stack || 'No stack trace available',
        userId: userId,
        userAgent: navigator.userAgent,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(dbErr => console.warn("Could not write error to database:", dbErr));
    } catch (e) {
      console.warn("Error logger Firestore write failed:", e);
    }
  }
};

// Consolidated and defined in auth.js. Added fallback if auth.js fails to load.
window.generateDefaultAvatar = window.generateDefaultAvatar || function(name) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'YB';
  const colors = ['#FF7A00', '#00A86B', '#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B'];
  const selectedColor = colors[initials.charCodeAt(0) % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="150" height="150">
    <circle cx="50" cy="50" r="48" fill="${selectedColor}" />
    <text x="50%" y="54%" font-family="'Outfit', sans-serif" font-size="36" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// --- PREMIUM GLOBAL IN-APP NOTIFICATIONS & DIALOGS ---
window.showNotification = function(message, type = 'info') {
  let container = document.getElementById('global-notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'global-notification-container';
    container.style.position = 'fixed';
    container.style.top = '24px';
    container.style.right = '24px';
    container.style.zIndex = '99999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.pointerEvents = 'auto';
  
  // Curious harmonious palettes matching our rich design guidelines
  const bgColor = type === 'error' ? '#EF4444' : (type === 'success' ? '#10B981' : '#F97316');
  
  toast.style.background = bgColor;
  toast.style.color = '#FFFFFF';
  toast.style.padding = '14px 20px';
  toast.style.borderRadius = '12px';
  toast.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)';
  toast.style.fontFamily = "'Outfit', 'Inter', sans-serif";
  toast.style.fontSize = '14px';
  toast.style.fontWeight = '600';
  toast.style.minWidth = '280px';
  toast.style.maxWidth = '360px';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.justifyContent = 'space-between';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(-20px)';
  toast.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

  toast.innerHTML = `
    <span style="flex: 1; margin-right: 12px; line-height: 1.4;">${message}</span>
    <span class="notification-close" style="cursor: pointer; font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.8); line-height: 1; transition: color 0.2s;">&times;</span>
  `;

  container.appendChild(toast);

  // Trigger entering animation
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 20);

  const closeBtn = toast.querySelector('.notification-close');
  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      toast.remove();
    }, 400);
  };

  closeBtn.addEventListener('click', dismiss);
  closeBtn.addEventListener('mouseover', () => { closeBtn.style.color = '#FFFFFF'; });
  closeBtn.addEventListener('mouseout', () => { closeBtn.style.color = 'rgba(255,255,255,0.8)'; });

  // Auto-dismiss after 4.5 seconds
  setTimeout(dismiss, 4500);
};

window.showConfirm = function(message, onConfirm) {
  const backdrop = document.createElement('div');
  backdrop.style.position = 'fixed';
  backdrop.style.top = '0';
  backdrop.style.left = '0';
  backdrop.style.width = '100vw';
  backdrop.style.height = '100vh';
  backdrop.style.background = 'rgba(15, 17, 21, 0.85)';
  backdrop.style.backdropFilter = 'blur(6px)';
  backdrop.style.webkitBackdropFilter = 'blur(6px)';
  backdrop.style.zIndex = '999999';
  backdrop.style.display = 'flex';
  backdrop.style.alignItems = 'center';
  backdrop.style.justifyContent = 'center';
  backdrop.style.opacity = '0';
  backdrop.style.transition = 'opacity 0.25s ease';

  backdrop.innerHTML = `
    <div style="background: #1A1D24; border: 1px solid #2D3139; border-radius: 16px; width: 90%; max-width: 380px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6); transform: scale(0.9); transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
      <h3 style="margin-top: 0; margin-bottom: 12px; font-family: 'Outfit', sans-serif; color: #FFFFFF; font-size: 18px; font-weight: 700;">Confirm Action</h3>
      <p style="font-family: 'Inter', sans-serif; font-size: 14px; color: #A0A5B1; line-height: 1.5; margin-bottom: 24px; margin-top: 0;">${message}</p>
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <button id="confirm-cancel-btn" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #FFFFFF; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Cancel</button>
        <button id="confirm-ok-btn" style="background: #EF4444; border: none; color: #FFFFFF; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Confirm</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  // Animate in
  setTimeout(() => {
    backdrop.style.opacity = '1';
    backdrop.querySelector('div').style.transform = 'scale(1)';
  }, 10);

  const dismiss = () => {
    backdrop.style.opacity = '0';
    backdrop.querySelector('div').style.transform = 'scale(0.9)';
    setTimeout(() => {
      backdrop.remove();
    }, 250);
  };

  backdrop.querySelector('#confirm-cancel-btn').addEventListener('click', dismiss);
  backdrop.querySelector('#confirm-ok-btn').addEventListener('click', () => {
    dismiss();
    onConfirm();
  });
};

// --- GLOBAL DATABASE / STATE ---
const STATE = {
  currentLanguage: 'en',
  currentTheme: 'dark',
  currentScreen: 'onboarding',
  currentUser: null, // Populated dynamically on Auth changed
  isMuted: true, // Muted by default for reels autoplay
  activeFeedTab: 'foryou',
  activeCreateTab: 'reel',
  activeOnboardingSlide: 0,
  drafts: {
    caption: localStorage.getItem('yb_draft_caption') || ''
  },
  posts: [], // Loaded from Firestore
  reels: []  // Loaded from Firestore
};

// Available translation dictionaries
let LOCALIZATION_DB = {};

// --- APP INITIALIZER ---
document.addEventListener('DOMContentLoaded', async () => {
  // Load Localization
  try {
    const res = await fetch('localization.json');
    LOCALIZATION_DB = await res.json();
  } catch (e) {
    console.error('Failed to load translations. Using placeholders.', e);
  }

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log("SW registration failed", err));
  }

  initApp();
});

function initApp() {
  // Hide non-MVP Top Actions in app-header
  const adminBtn = document.getElementById('admin-toggle-btn');
  const notifBtn = document.getElementById('nav-notifications');
  if (adminBtn) adminBtn.style.display = 'none';
  if (notifBtn) notifBtn.style.display = 'none';

  setupLocalization();
  setupTheme();
  setupNavigation();
  setupAuthFlow();
  setupStories();
  setupFeed();
  setupReels();
  setupCreate();
  setupProfile();
  setupSearch();
  setupLeaderboardPlaceholder();

  // Initial screen routing is handled asynchronously by the Firebase auth observer in auth.js
}

// --- LOCALIZATION ENGINE ---
function setupLocalization() {
  const langBtn = document.getElementById('lang-toggle-btn');
  langBtn.addEventListener('click', () => {
    STATE.currentLanguage = STATE.currentLanguage === 'en' ? 'hi' : 'en';
    langBtn.textContent = STATE.currentLanguage.toUpperCase();
    applyTranslations();
  });

  applyTranslations();
}

function applyTranslations() {
  const dict = LOCALIZATION_DB[STATE.currentLanguage];
  if (!dict) return;

  // Translate all DOM elements marked with [data-local]
  document.querySelectorAll('[data-local]').forEach(el => {
    const key = el.getAttribute('data-local');
    if (dict[key]) {
      const svg = el.querySelector('svg');
      if (svg) {
        el.innerHTML = '';
        el.appendChild(svg);
        el.appendChild(document.createTextNode(' ' + dict[key]));
      } else {
        el.textContent = dict[key];
      }
    }
  });

  // Translate Input Placeholders
  const searchInput = document.getElementById('search-input-field');
  if (searchInput && dict['search_placeholder']) searchInput.placeholder = dict['search_placeholder'];

  const captionInput = document.getElementById('create-caption-input');
  if (captionInput && dict['caption_placeholder']) captionInput.placeholder = dict['caption_placeholder'];
}

// --- THEME MANAGEMENT ---
function setupTheme() {
  const themeBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');

  themeBtn.addEventListener('click', () => {
    STATE.currentTheme = STATE.currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', STATE.currentTheme);
    
    // Update theme icon
    if (STATE.currentTheme === 'light') {
      themeIcon.innerHTML = '<path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 12h1m8-9v1m8 8h1m-9 8v1m-6.4-15.4l.7.7m12.1-.7l-.7.7m0 12.1l.7.7m-12.1-.7l-.7.7"/>';
    } else {
      themeIcon.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';
    }
  });
}

// --- ROUTER & NAVIGATION ---
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item, .nav-create-btn');
  const appHeader = document.getElementById('app-header');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.id.replace('nav-', '');
      
      // Prevent routing if not logged in
      if (!STATE.currentUser && targetId !== 'auth' && targetId !== 'onboarding') {
        showScreen('auth');
        return;
      }

      // Update Active Navigation Item style
      navItems.forEach(i => i.classList.remove('active'));
      if (item.classList.contains('nav-item')) {
        item.classList.add('active');
      }

      // Show/Hide Top App Header based on full-screen needs
      if (targetId === 'reels') {
        appHeader.style.display = 'none';
      } else {
        appHeader.style.display = 'flex';
      }

      showScreen(targetId);
    });
  });
}

function showScreen(screenId) {
  // Centralized Route Protection Guard
  const unprotectedScreens = ['auth', 'onboarding', 'splash', 'profile-setup'];
  if (!STATE.currentUser && !unprotectedScreens.includes(screenId)) {
    showScreen('auth');
    return;
  }

  STATE.currentScreen = screenId;

  // Toggle DOM view elements
  document.querySelectorAll('.screen').forEach(screen => {
    screen.style.display = 'none';
  });

  const activeScreen = document.getElementById(`screen-${screenId}`);
  if (activeScreen) {
    activeScreen.style.display = (screenId === 'reels' || screenId === 'inbox' || screenId === 'leaderboard') ? 'block' : 'flex';
  }

  // Hook custom loaders for dynamic screens
  if (screenId === 'home') {
    renderFeedList();
  } else if (screenId === 'profile') {
    renderProfilePosts();
  } else if (screenId === 'reels') {
    // Trigger video autoplay for active reel
    setTimeout(initReelsVideoObserver, 200);
  } else if (screenId === 'leaderboard') {
    setupLeaderboardReal();
  }
}

// --- FLOATING REWARD TOAST ENGINE ---
function showRewardToast(pointsVal) {
  const toast = document.getElementById('global-reward-toast');
  const dict = LOCALIZATION_DB[STATE.currentLanguage];
  const toastText = document.getElementById('reward-toast-text');

  if (dict && dict['points_gained']) {
    toastText.textContent = dict['points_gained'].replace('{points}', pointsVal);
  } else {
    toastText.textContent = `+${pointsVal} XP Points!`;
  }

  // Update overall User points & reflect in profile page
  if (STATE.currentUser) {
    const currentUid = STATE.currentUser.uid;
    db.collection('users').doc(currentUid).update({
      points: firebase.firestore.FieldValue.increment(pointsVal)
    }).then(() => {
      STATE.currentUser.points = (STATE.currentUser.points || 0) + pointsVal;
      document.getElementById('profile-stat-points').textContent = STATE.currentUser.points;
    }).catch(err => console.error("Error incrementing user points:", err));
  }

  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// --- AUTH & ONBOARDING SYSTEM ---
function setupAuthFlow() {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.dot');
  const nextBtn = document.getElementById('onboarding-next-btn');

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (STATE.activeOnboardingSlide < 2) {
        STATE.activeOnboardingSlide++;
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        
        document.querySelector(`[data-slide="${STATE.activeOnboardingSlide}"]`).classList.add('active');
        dots[STATE.activeOnboardingSlide].classList.add('active');
        
        if (STATE.activeOnboardingSlide === 2) {
          nextBtn.textContent = STATE.currentLanguage === 'en' ? 'Get Started' : 'शुरू करें';
        }
      } else {
        showScreen('auth');
      }
    });
  }

  const loginBtn = document.getElementById('onboarding-login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      showScreen('auth');
    });
  }
}

// --- STORIES VIEW ---
function setupStories() {
  const container = document.getElementById('stories-container');
  if (!container) return;

  // 24 Hours Cutoff
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  // Listen to Firestore for real-time stories (limit to 20)
  db.collection('stories').orderBy('timestamp', 'desc').limit(20).onSnapshot(snapshot => {
    container.innerHTML = '';
    
    // Add Current User's "Your Story" first
    const myAvatar = STATE.currentUser ? (STATE.currentUser.avatar || window.generateDefaultAvatar(STATE.currentUser.fullname)) : window.generateDefaultAvatar('YaarBuzz User');
    container.innerHTML += `
      <div class="story-item" id="story-item-my" onclick="viewMyStory()">
        <div class="story-avatar-ring viewed">
          <img id="story-my-avatar" class="story-avatar" src="${myAvatar}" alt="Your Story">
        </div>
        <span class="story-username">Your Story</span>
      </div>
    `;

    snapshot.forEach(doc => {
      const story = doc.data();
      const storyId = doc.id;
      
      let storyTime = null;
      if (story.timestamp) {
        storyTime = story.timestamp.toDate ? story.timestamp.toDate().getTime() : new Date(story.timestamp).getTime();
      }
      if (!storyTime) storyTime = Date.now(); // optimistic local default

      // Expiry Check: Only render stories from the last 24 hours
      if (storyTime >= cutoff) {
        const authorUid = story.author ? story.author.uid : '';
        const username = story.author ? story.author.username : (story.username || 'User');
        const avatar = story.author ? (story.author.avatar || window.generateDefaultAvatar(story.author.fullname)) : (story.avatar || window.generateDefaultAvatar(username));

        container.innerHTML += `
          <div class="story-item" onclick="viewStoryDetail('${story.mediaUrl}', '${storyId}', '${authorUid}')">
            <div class="story-avatar-ring">
              <img class="story-avatar" src="${avatar}" alt="${username}">
            </div>
            <span class="story-username">${username}</span>
          </div>
        `;
      }
    });
  }, err => {
    console.error("Error loading stories:", err);
    window.logError("Load Stories Feed", err);
  });
}

window.viewMyStory = async function() {
  if (!STATE.currentUser) { showScreen('auth'); return; }
  
  try {
    const snapshot = await db.collection('stories')
      .where('author.uid', '==', STATE.currentUser.uid)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
      
    if (!snapshot.empty) {
      const storyDoc = snapshot.docs[0];
      window.viewStoryDetail(storyDoc.data().mediaUrl, storyDoc.id, STATE.currentUser.uid);
    } else {
      // Direct user to upload story in Create screen
      showScreen('create');
      const tabStory = document.getElementById('create-tab-story');
      if (tabStory) tabStory.click();
      window.showNotification("Tap the file box below to upload your Story!", "info");
    }
  } catch (e) {
    console.error("Error reading my stories:", e);
    window.logError("View My Story Process", e);
  }
};

// Fullscreen story modal overlay with secure deletion
window.viewStoryDetail = function(url, storyId, authorUid) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.95)';
  overlay.style.zIndex = '2000';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.cursor = 'pointer';

  let deleteBtnHtml = '';
  if (STATE.currentUser && storyId && authorUid === STATE.currentUser.uid) {
    deleteBtnHtml = `
      <button class="btn btn-primary story-delete-btn" style="position:absolute; bottom:40px; width:auto; padding:10px 20px; background:#EF4444; border-color:#EF4444; font-weight:700; z-index:2010;">
        Delete Story
      </button>
    `;
  }

  overlay.innerHTML = `
    <img src="${url}" style="max-width:90%; max-height:80%; object-fit:contain; border-radius:var(--radius-md); box-shadow:var(--shadow-lg);">
    <div style="position:absolute; top:20px; right:20px; color:white; font-size:32px; font-weight:700;">&times;</div>
    ${deleteBtnHtml}
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target.classList.contains('story-delete-btn')) {
      e.stopPropagation();
      window.showConfirm("Are you sure you want to delete this story permanently?", async () => {
        try {
          await db.collection('stories').doc(storyId).delete();
          window.showNotification("Story deleted successfully!", "success");
          overlay.remove();
        } catch (err) {
          window.showNotification("Failed to delete story: " + err.message, "error");
        }
      });
      return;
    }
    overlay.remove();
  });

  document.body.appendChild(overlay);
};

// --- FEED (FOR YOU / LOCAL) VIEW ---
function setupFeed() {
  const tabForyou = document.getElementById('feed-tab-foryou');
  const tabLocal = document.getElementById('feed-tab-local');

  tabForyou.addEventListener('click', () => {
    tabForyou.classList.add('active');
    tabLocal.classList.remove('active');
    STATE.activeFeedTab = 'foryou';
    renderFeedList();
  });

  tabLocal.addEventListener('click', () => {
    tabLocal.classList.add('active');
    tabForyou.classList.remove('active');
    STATE.activeFeedTab = 'local';
    renderFeedList();
  });

  // Pull to refresh simulation on scroll boundary
  const scrollBox = document.getElementById('feed-scroll-container');
  scrollBox.addEventListener('scroll', () => {
    if (scrollBox.scrollTop === 0) {
      // Top scroll boundary
    }
  });

  // Real-time Firestore snapshot listener with central logging
  db.collection('posts').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
    STATE.posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (STATE.currentScreen === 'home') {
      renderFeedList();
    }
  }, err => {
    console.error("Firestore loading posts failed:", err);
    window.logError("Load Posts Feed", err);
  });
}

function renderFeedList() {
  const container = document.getElementById('feed-post-list');
  container.innerHTML = '';

  if (STATE.posts.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 48px 16px; color: var(--text-secondary);">
        <p style="font-size: 14px;">No posts published yet.</p>
        <p style="font-size: 12px; margin-top:4px;">Be the first one! Click the "+" button in navigation to post.</p>
      </div>
    `;
    return;
  }

  let postsToRender = STATE.posts;

  if (STATE.activeFeedTab === 'local' && STATE.currentUser) {
    const userCity = STATE.currentUser.city || 'Unspecified';
    if (userCity !== 'Unspecified') {
      postsToRender = STATE.posts.filter(p => p.author && p.author.city === userCity);
    }
  }

  if (postsToRender.length === 0) {
    const currentCity = STATE.currentUser ? STATE.currentUser.city : 'your city';
    container.innerHTML = `
      <div style="text-align:center; padding: 48px 16px; color: var(--text-secondary);">
        <p style="font-size: 14px;">No posts published in ${currentCity} yet.</p>
        <p style="font-size: 12px; margin-top:4px;">Be the first creator from ${currentCity}! Click the "+" button to post.</p>
      </div>
    `;
    return;
  }

  postsToRender.forEach(post => {
    container.appendChild(createPostCard(post));
  });
}

function createPostCard(post) {
  const card = document.createElement('div');
  card.className = 'card';
  card.id = `post-card-${post.id}`;

  const currentUid = STATE.currentUser ? STATE.currentUser.uid : '';
  
  // Safe author fallback to prevent TypeError crashes on malformed posts
  const author = post.author || {
    uid: '',
    fullname: 'YaarBuzz User',
    username: 'user',
    avatar: window.generateDefaultAvatar ? window.generateDefaultAvatar('YaarBuzz User') : 'assets/default-avatar.png'
  };
  
  // Real-time like state fetching from subcollection is slow inside sync loop,
  // so we check if the user is in a fast likes collection or we assume default
  const likesCount = post.likesCount || 0;
  const commentsCount = post.commentsCount || 0;

  let mediaHtml = '';
  if (post.type === 'photo' && post.mediaUrl) {
    mediaHtml = `
      <div class="post-media-container">
        <img class="post-media" src="${post.mediaUrl}" alt="Post Image">
      </div>
    `;
  }

  // Follow Button HTML
  let followButtonHtml = '';
  if (STATE.currentUser && author.uid && author.uid !== currentUid) {
    const isFollowing = STATE.currentUser.following && STATE.currentUser.following.includes(author.uid);
    followButtonHtml = `
      <button class="btn-follow-toggle" data-uid="${author.uid}" style="background:${isFollowing ? 'var(--surface-color)' : 'var(--primary-orange)'}; color:white; border:${isFollowing ? '1px solid var(--border-color)' : 'none'}; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:700; cursor:pointer; margin-left:8px; outline:none; transition: all 0.2s;">
        ${isFollowing ? 'Following' : 'Follow'}
      </button>
    `;
  }

  // Format timestamp safely
  let timeStr = 'Just now';
  if (post.timestamp) {
    const postDate = post.timestamp.toDate ? post.timestamp.toDate() : new Date(post.timestamp);
    timeStr = postDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + postDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  card.innerHTML = `
    <div class="post-header">
      <div class="post-user">
        <img class="post-avatar" src="${author.avatar}" alt="Avatar">
        <div class="post-meta">
          <div style="display:flex; align-items:center;">
            <span class="post-name">${author.fullname}</span>
            ${followButtonHtml}
          </div>
          <span class="post-time">${timeStr}</span>
        </div>
      </div>
      <div style="font-size:11px; font-weight:700; color:var(--secondary-green); background:rgba(0,168,107,0.1); padding:4px 8px; border-radius:10px;">
        +${post.points || 10} XP
      </div>
    </div>
    <div class="post-caption" style="word-wrap: break-word;">${post.caption}</div>
    ${mediaHtml}
    <div class="post-footer">
      <div class="post-action-like" style="display:flex; align-items:center; gap:6px; cursor:pointer;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        <span class="likes-count">${likesCount}</span>
      </div>
      <div class="post-action-comment" style="display:flex; align-items:center; gap:6px; cursor:pointer;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span class="comments-count">${commentsCount}</span>
      </div>
      <div class="post-action-share" style="display:flex; align-items:center; gap:6px; cursor:pointer;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
        <span>Share</span>
      </div>
    </div>

    <!-- Collapsible inline Comments Panel -->
    <div class="comments-drawer" style="display:none; margin-top:12px; padding-top:12px; border-top:1px solid var(--border-color);">
      <div class="comments-list" style="display:flex; flex-direction:column; gap:8px; max-height:160px; overflow-y:auto; margin-bottom:10px;">
        <!-- Dynamic comments from Firestore subcollection -->
      </div>
      <div style="display:flex; gap:8px;">
        <input type="text" class="input-field comment-input-box" placeholder="Add a comment..." style="padding:6px 12px; border-radius:20px; font-size:12px;">
        <button class="btn btn-primary submit-comment-btn" style="width:auto; padding:6px 12px; font-size:12px; border-radius:20px;">Post</button>
      </div>
    </div>
  `;

  // Check if current user liked this post to style SVG
  if (currentUid) {
    db.collection('posts').doc(post.id).collection('likes').doc(currentUid).get().then(doc => {
      if (doc.exists) {
        const likeBtn = card.querySelector('.post-action-like');
        const likeSvg = likeBtn.querySelector('svg');
        likeBtn.classList.add('liked', 'active');
        likeSvg.setAttribute('fill', 'var(--secondary-green)');
        likeSvg.style.color = 'var(--secondary-green)';
      }
    });
  }

  // Bind Follow Toggle
  const followBtn = card.querySelector('.btn-follow-toggle');
  if (followBtn) {
    followBtn.addEventListener('click', async () => {
      if (!STATE.currentUser) { showScreen('auth'); return; }
      
      const currentUidReal = STATE.currentUser.uid;
      const authorUid = author.uid;
      
      if (!authorUid) return;
      
      let following = STATE.currentUser.following || [];
      const isFollowing = following.includes(authorUid);
      
      if (isFollowing) {
        following = following.filter(id => id !== authorUid);
        followBtn.textContent = 'Follow';
        followBtn.style.background = 'var(--primary-orange)';
        followBtn.style.border = 'none';
      } else {
        following.push(authorUid);
        followBtn.textContent = 'Following';
        followBtn.style.background = 'var(--surface-color)';
        followBtn.style.border = '1px solid var(--border-color)';
        showRewardToast(5); 
      }
      
      STATE.currentUser.following = following;
      STATE.currentUser.followingCount = following.length;
      
      // Update in Firestore
      const userRef = db.collection('users').doc(currentUidReal);
      const authorRef = db.collection('users').doc(authorUid);
      
      db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const authorDoc = await transaction.get(authorRef);
        
        if (userDoc.exists && authorDoc.exists) {
          let userFollowing = userDoc.data().following || [];
          let authorFollowers = authorDoc.data().followers || [];
          
          if (isFollowing) {
            userFollowing = userFollowing.filter(id => id !== authorUid);
            authorFollowers = authorFollowers.filter(id => id !== currentUidReal);
          } else {
            if (!userFollowing.includes(authorUid)) userFollowing.push(authorUid);
            if (!authorFollowers.includes(currentUidReal)) authorFollowers.push(currentUidReal);
          }
          
          transaction.update(userRef, { 
            following: userFollowing,
            followingCount: userFollowing.length
          });
          transaction.update(authorRef, { 
            followers: authorFollowers,
            followersCount: authorFollowers.length
          });
        }
      }).catch(err => console.error("Firestore follow update failed:", err));
    });
  }

  // Bind Post Like
  const likeBtn = card.querySelector('.post-action-like');
  likeBtn.addEventListener('click', () => {
    togglePostLike(post.id, likeBtn);
  });

  // Bind Post Comments Drawer loading
  const commentTrigger = card.querySelector('.post-action-comment');
  const drawer = card.querySelector('.comments-drawer');
  const listDiv = card.querySelector('.comments-list');
  let commentListener = null;

  commentTrigger.addEventListener('click', () => {
    if (drawer.style.display === 'none') {
      drawer.style.display = 'block';
      // Start Realtime comment loading
      commentListener = loadPostComments(post.id, listDiv);
    } else {
      drawer.style.display = 'none';
      if (commentListener) commentListener(); // Unsubscribe
    }
  });

  // Bind comment post submission
  const submitCommentBtn = card.querySelector('.submit-comment-btn');
  const commentInput = card.querySelector('.comment-input-box');
  const commentsCountSpan = card.querySelector('.comments-count');

  submitCommentBtn.addEventListener('click', () => {
    addPostComment(post.id, commentInput, commentsCountSpan);
  });

  commentInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addPostComment(post.id, commentInput, commentsCountSpan);
  });

  // Bind Share copying link
  const shareBtn = card.querySelector('.post-action-share');
  shareBtn.addEventListener('click', () => {
    if (!STATE.currentUser) { showScreen('auth'); return; }
    
    // Copy a simulated share link to clipboard
    const shareText = `Check out ${author.fullname}'s post on YaarBuzz: "${post.caption.substring(0, 30)}..."`;
    navigator.clipboard.writeText(shareText).then(() => {
      window.showNotification("Post details copied to clipboard!", "success");
      showRewardToast(2);
    }).catch(err => console.error("Could not copy:", err));
  });

  return card;
}

// Transactional Firestore Like/Unlike Post
async function togglePostLike(postId, likeBtn) {
  if (!STATE.currentUser) { showScreen('auth'); return; }
  
  const postRef = db.collection('posts').doc(postId);
  const userUid = STATE.currentUser.uid;
  const likeRef = postRef.collection('likes').doc(userUid);
  
  try {
    const doc = await likeRef.get();
    const likeSvg = likeBtn.querySelector('svg');
    const likesCountSpan = likeBtn.querySelector('.likes-count');
    
    if (doc.exists) {
      await db.runTransaction(async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (postDoc.exists) {
          const currentLikes = Math.max(0, (postDoc.data().likesCount || 0) - 1);
          transaction.update(postRef, { likesCount: currentLikes });
          transaction.delete(likeRef);
          
          if (likesCountSpan) likesCountSpan.textContent = currentLikes;
        }
      });
      likeBtn.classList.remove('liked', 'active');
      if (likeSvg) {
        likeSvg.setAttribute('fill', 'none');
        likeSvg.style.color = 'var(--text-secondary)';
      }
    } else {
      await db.runTransaction(async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (postDoc.exists) {
          const currentLikes = (postDoc.data().likesCount || 0) + 1;
          transaction.update(postRef, { likesCount: currentLikes });
          transaction.set(likeRef, { timestamp: firebase.firestore.FieldValue.serverTimestamp() });
          
          if (likesCountSpan) likesCountSpan.textContent = currentLikes;
        }
      });
      likeBtn.classList.add('liked', 'active');
      if (likeSvg) {
        likeSvg.setAttribute('fill', 'var(--secondary-green)');
        likeSvg.style.color = 'var(--secondary-green)';
      }
      showRewardToast(1);
    }
  } catch (e) {
    console.error("Post like transaction failed:", e);
  }
}

// Load comments dynamically from Firestore subcollection
function loadPostComments(postId, listDiv) {
  return db.collection('posts').doc(postId).collection('comments')
    .orderBy('timestamp', 'asc')
    .onSnapshot(snapshot => {
      listDiv.innerHTML = '';
      if (snapshot.empty) {
        listDiv.innerHTML = '<div style="font-size:11px; color:var(--text-muted); text-align:center;">No comments yet.</div>';
        return;
      }
      snapshot.forEach(doc => {
        const c = doc.data();
        const row = document.createElement('div');
        row.style.fontSize = '12px';
        row.style.lineHeight = '1.4';
        row.innerHTML = `<strong style="color:var(--primary-orange);">@${c.username}:</strong> ${c.text}`;
        listDiv.appendChild(row);
      });
      listDiv.scrollTop = listDiv.scrollHeight;
    }, err => console.error("Error reading comments subcollection:", err));
}

// Add comment to Firestore subcollection transactionally
async function addPostComment(postId, commentInput, commentsCountSpan) {
  if (!STATE.currentUser) { showScreen('auth'); return; }
  
  const text = commentInput.value.trim();
  if (!text) return;
  
  const postRef = db.collection('posts').doc(postId);
  const commentData = {
    uid: STATE.currentUser.uid,
    username: STATE.currentUser.username,
    text: text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  commentInput.value = '';
  
  try {
    await db.runTransaction(async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (postDoc.exists) {
        const currentComments = (postDoc.data().commentsCount || 0) + 1;
        transaction.update(postRef, { commentsCount: currentComments });
        const newCommentRef = postRef.collection('comments').doc();
        transaction.set(newCommentRef, commentData);
        
        if (commentsCountSpan) commentsCountSpan.textContent = currentComments;
      }
    });
    showRewardToast(1);
  } catch (e) {
    console.error("Error posting comment:", e);
    window.showNotification("Comment posting failed: " + e.message, "error");
  }
}

// --- REELS VIEWER ENGINE ---
function setupReels() {
  const container = document.getElementById('reels-scroll-container');
  if (!container) return;

  // Real-time Firestore snapshot listener for Reels
  db.collection('reels').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
    STATE.reels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    container.innerHTML = '';
    
    if (STATE.reels.length === 0) {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; height:100%; width:100%; align-items:center; justify-content:center; color:white; padding:20px; text-align:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-orange)" stroke-width="2" style="margin-bottom:16px;"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 8 7 4-7 4Z"/></svg>
          <h3>No Reels Uploaded Yet</h3>
          <p style="font-size:12px; color:var(--text-secondary); margin-top:8px;">Be the first creator! Tap "+" to share a video reel.</p>
        </div>
      `;
      return;
    }

    STATE.reels.forEach(reel => {
      const item = document.createElement('div');
      item.className = 'reel-item';
      item.id = `reel-${reel.id}`;

      // Safe creator fallback to prevent TypeError crashes on malformed reels
      const creator = reel.creator || {
        uid: '',
        fullname: 'YaarBuzz Creator',
        username: 'creator',
        avatar: window.generateDefaultAvatar('YaarBuzz Creator')
      };

      // HTML5 video tag configured for high fidelity
      item.innerHTML = `
        <div class="reel-video-container" style="width:100%; height:100%; position:relative; background:#000; display:flex; align-items:center; justify-content:center;">
          <video class="reel-video-player" src="${reel.videoUrl}" loop playsinline muted style="width:100%; height:100%; object-fit:cover;"></video>
          
          <!-- Floating Play/Pause overlay -->
          <div class="reel-play-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s; z-index:2; cursor:pointer;">
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="white" stroke="white" opacity="0.8"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          
          <!-- Floating Sound Badge -->
          <div class="sound-badge" style="position:absolute; top:24px; right:16px; background:rgba(0,0,0,0.6); padding:8px; border-radius:50%; display:flex; cursor:pointer; z-index:10;" title="Toggle Mute">
            <svg class="sound-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path class="sound-waves" d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          </div>
        </div>

        <!-- Left Overlay Info Details -->
        <div class="reel-overlay">
          <div class="reel-creator">
            <img class="reel-avatar" src="${creator.avatar}">
            <span class="reel-username">@${creator.username}</span>
          </div>
          <p class="reel-caption">${reel.caption}</p>
          <span class="reel-points">📍 +20 XP Reward</span>
        </div>

        <!-- Right Overlay Vertical Toolbar -->
        <div class="reel-actions">
          <div class="reel-action-btn reel-like-trigger">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            <span class="reel-action-label">${reel.likes || 0}</span>
          </div>
          <div class="reel-action-btn reel-share-trigger">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
            <span class="reel-action-label">Share</span>
          </div>
        </div>
      `;

      const video = item.querySelector('.reel-video-player');
      const playOverlay = item.querySelector('.reel-play-overlay');
      const soundBadge = item.querySelector('.sound-badge');
      const soundIcon = item.querySelector('.sound-icon');
      const soundWaves = item.querySelector('.sound-waves');

      // 1. Play / Pause click toggle
      playOverlay.addEventListener('click', () => {
        if (video.paused) {
          video.play().catch(e => console.log("Play blocked:", e));
          playOverlay.style.opacity = 0;
        } else {
          video.pause();
          playOverlay.style.opacity = 1;
        }
      });

      // 2. Mute Toggle syncing globally
      if (STATE.isMuted) {
        soundWaves.style.display = 'none';
      }
      soundBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        STATE.isMuted = !STATE.isMuted;
        
        // Sync all video players
        document.querySelectorAll('.reel-video-player').forEach(v => {
          v.muted = STATE.isMuted;
        });

        // Sync all icons
        document.querySelectorAll('.sound-waves').forEach(sw => {
          sw.style.display = STATE.isMuted ? 'none' : 'block';
        });
      });

      // 3. Reels Likes logic
      const likeTrigger = item.querySelector('.reel-like-trigger');
      likeTrigger.addEventListener('click', () => {
        toggleReelLike(reel.id, likeTrigger);
      });

      // Check if logged in user already liked this reel
      const currentUid = STATE.currentUser ? STATE.currentUser.uid : '';
      if (currentUid) {
        db.collection('reels').doc(reel.id).collection('likes').doc(currentUid).get().then(doc => {
          if (doc.exists) {
            likeTrigger.querySelector('svg').setAttribute('fill', 'var(--primary-orange)');
            likeTrigger.querySelector('svg').style.stroke = 'var(--primary-orange)';
          }
        });
      }

      // 4. Reels Share link copy
      const shareTrigger = item.querySelector('.reel-share-trigger');
      shareTrigger.addEventListener('click', () => {
        if (!STATE.currentUser) { showScreen('auth'); return; }
        const shareLink = `YaarBuzz Reel by @${creator.username}: "${reel.caption}"`;
        navigator.clipboard.writeText(shareLink).then(() => {
          window.showNotification("Reel copied to clipboard!", "success");
          showRewardToast(2);
        });
      });

      container.appendChild(item);
    });

    // Start playback observer early
    initReelsVideoObserver();
  }, err => {
    console.error("Firestore loading reels failed:", err);
    window.logError("Load Reels Feed", err);
  });
}

// Transactional Firestore Like/Unlike Reels
async function toggleReelLike(reelId, likeBtn) {
  if (!STATE.currentUser) { showScreen('auth'); return; }
  
  const reelRef = db.collection('reels').doc(reelId);
  const userUid = STATE.currentUser.uid;
  const likeRef = reelRef.collection('likes').doc(userUid);
  
  try {
    const doc = await likeRef.get();
    const likeSvg = likeBtn.querySelector('svg');
    const labelSpan = likeBtn.querySelector('.reel-action-label');
    
    if (doc.exists) {
      await db.runTransaction(async (transaction) => {
        const reelDoc = await transaction.get(reelRef);
        if (reelDoc.exists) {
          const currentLikes = Math.max(0, (reelDoc.data().likes || 0) - 1);
          transaction.update(reelRef, { likes: currentLikes });
          transaction.delete(likeRef);
          
          if (labelSpan) labelSpan.textContent = currentLikes;
        }
      });
      likeSvg.setAttribute('fill', 'none');
      likeSvg.style.stroke = 'white';
    } else {
      await db.runTransaction(async (transaction) => {
        const reelDoc = await transaction.get(reelRef);
        if (reelDoc.exists) {
          const currentLikes = (reelDoc.data().likes || 0) + 1;
          transaction.update(reelRef, { likes: currentLikes });
          transaction.set(likeRef, { timestamp: firebase.firestore.FieldValue.serverTimestamp() });
          
          if (labelSpan) labelSpan.textContent = currentLikes;
        }
      });
      likeSvg.setAttribute('fill', 'var(--primary-orange)');
      likeSvg.style.stroke = 'var(--primary-orange)';
      showRewardToast(1);
    }
  } catch (e) {
    console.error("Reel like transaction failed:", e);
  }
}

// Intersection Observer for autoplaying scrolling reels
let reelsObserver = null;
function initReelsVideoObserver() {
  if (reelsObserver) reelsObserver.disconnect();
  
  reelsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target.querySelector('video');
      const overlay = entry.target.querySelector('.reel-play-overlay');
      if (!video) return;
      
      if (entry.isIntersecting) {
        // Pause all other players
        document.querySelectorAll('.reel-video-player').forEach(v => {
          if (v !== video) {
            v.pause();
            v.currentTime = 0;
            const otherOverlay = v.parentNode.querySelector('.reel-play-overlay');
            if (otherOverlay) otherOverlay.style.opacity = 1;
          }
        });
        
        // Play visible video
        video.muted = STATE.isMuted;
        video.play().then(() => {
          if (overlay) overlay.style.opacity = 0;
        }).catch(e => {
          console.log("Auto-play blocked:", e);
          if (overlay) overlay.style.opacity = 1;
        });
        
        // Dynamic View Tracking increment in Firestore
        const reelId = entry.target.id.replace('reel-', '');
        db.collection('reels').doc(reelId).update({
          views: firebase.firestore.FieldValue.increment(1)
        }).catch(err => console.error("Error updating reel views:", err));
      } else {
        video.pause();
        if (overlay) overlay.style.opacity = 1;
      }
    });
  }, {
    threshold: 0.6 // 60% visibility required to trigger play
  });
  
  document.querySelectorAll('.reel-item').forEach(item => {
    reelsObserver.observe(item);
  });
}

// --- CREATE & POST ENGINE ---
function setupCreate() {
  const tabReel = document.getElementById('create-tab-reel');
  const tabPhoto = document.getElementById('create-tab-photo');
  const tabStory = document.getElementById('create-tab-story');
  const tabText = document.getElementById('create-tab-text');

  const reelPanel = document.getElementById('create-reel-panel');
  const photoPanel = document.getElementById('create-photo-panel');

  tabReel.addEventListener('click', () => {
    tabReel.classList.add('active');
    tabPhoto.classList.remove('active');
    if (tabStory) tabStory.classList.remove('active');
    tabText.classList.remove('active');
    reelPanel.style.display = 'block';
    photoPanel.style.display = 'none';
    STATE.activeCreateTab = 'reel';
  });

  tabPhoto.addEventListener('click', () => {
    tabPhoto.classList.add('active');
    tabReel.classList.remove('active');
    if (tabStory) tabStory.classList.remove('active');
    tabText.classList.remove('active');
    photoPanel.style.display = 'block';
    reelPanel.style.display = 'none';
    STATE.activeCreateTab = 'photo';
  });

  if (tabStory) {
    tabStory.addEventListener('click', () => {
      tabStory.classList.add('active');
      tabReel.classList.remove('active');
      tabPhoto.classList.remove('active');
      tabText.classList.remove('active');
      photoPanel.style.display = 'block'; // Stories reuse same file input
      reelPanel.style.display = 'none';
      STATE.activeCreateTab = 'story';
    });
  }

  tabText.addEventListener('click', () => {
    tabText.classList.add('active');
    tabReel.classList.remove('active');
    tabPhoto.classList.remove('active');
    if (tabStory) tabStory.classList.remove('active');
    photoPanel.style.display = 'none';
    reelPanel.style.display = 'none';
    STATE.activeCreateTab = 'text';
  });

  // Auto-Save Drafts caption
  const captionInput = document.getElementById('create-caption-input');
  captionInput.value = STATE.drafts.caption;

  captionInput.addEventListener('input', () => {
    STATE.drafts.caption = captionInput.value;
    localStorage.setItem('yb_draft_caption', captionInput.value);
  });

  const publishBtn = document.getElementById('create-publish-btn');
  const progressBox = document.getElementById('upload-progress-container');
  const progressBar = document.getElementById('upload-progress-bar');
  const progressPercent = document.getElementById('upload-progress-percent');
  const progressText = document.getElementById('upload-progress-text');
  
  const reelInput = document.getElementById('reel-file-input');
  const photoInput = document.getElementById('photo-file-input');

  // Preview file selections labels
  if (reelInput) {
    reelInput.addEventListener('change', () => {
      const nameLabel = document.getElementById('reel-file-name');
      if (reelInput.files.length > 0) {
        nameLabel.textContent = "Selected: " + reelInput.files[0].name;
        nameLabel.style.display = 'block';
      } else {
        nameLabel.style.display = 'none';
      }
    });
  }

  if (photoInput) {
    photoInput.addEventListener('change', () => {
      const nameLabel = document.getElementById('photo-file-name');
      if (photoInput.files.length > 0) {
        nameLabel.textContent = "Selected: " + photoInput.files[0].name;
        nameLabel.style.display = 'block';
      } else {
        nameLabel.style.display = 'none';
      }
    });
  }

  const recordBtn = document.getElementById('create-record-btn');
  if (recordBtn) {
    recordBtn.addEventListener('click', async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        window.showNotification("Camera and Microphone access granted! Choose a video from your files.", "success");
      } catch (err) {
        window.showNotification("Camera access failed: " + err.message, "error");
      }
    });
  }

  // Robust Storage Upload Helper inside setupCreate
  function uploadFileToStorage(fileToUpload, folderName) {
    return new Promise((resolve, reject) => {
      const storageRef = storage.ref();
      const fileRef = storageRef.child(`uploads/${STATE.currentUser.uid}/${folderName}/${Date.now()}_${fileToUpload.name}`);
      
      let attempt = 0;
      const maxAttempts = 3;
      const timeoutDuration = 45000; // 45 seconds timeout per attempt

      function startUpload() {
        attempt++;
        console.log(`Starting upload attempt ${attempt} of ${maxAttempts} for ${fileToUpload.name}`);
        
        const uploadTask = fileRef.put(fileToUpload);
        let timeoutTimer = null;
        let lastBytesTransferred = 0;

        const resetTimeout = () => {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          timeoutTimer = setTimeout(() => {
            console.warn(`Upload attempt ${attempt} timed out (no progress for 45s)`);
            uploadTask.cancel();
          }, timeoutDuration);
        };

        resetTimeout();

        uploadTask.on('state_changed',
          (snapshot) => {
            if (snapshot.bytesTransferred > lastBytesTransferred) {
              lastBytesTransferred = snapshot.bytesTransferred;
              resetTimeout(); // Progress made, reset timeout timer
            }
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.width = `${progress}%`;
            progressPercent.textContent = `${Math.round(progress)}%`;
            progressText.textContent = `Uploading (Attempt ${attempt}/${maxAttempts})...`;
          },
          (error) => {
            if (timeoutTimer) clearTimeout(timeoutTimer);
            console.error(`Upload attempt ${attempt} failed:`, error);
            
            if (attempt < maxAttempts && error.code !== 'storage/canceled') {
              console.log(`Retrying upload in 2 seconds...`);
              setTimeout(startUpload, 2000);
            } else if (error.code === 'storage/canceled' && attempt < maxAttempts) {
              console.log(`Upload was timed out/canceled. Retrying attempt ${attempt + 1}...`);
              startUpload();
            } else {
              reject(error);
            }
          },
          async () => {
            if (timeoutTimer) clearTimeout(timeoutTimer);
            try {
              console.log(`Upload completed successfully! Fetching download URL...`);
              const downloadURL = await fileRef.getDownloadURL();
              console.log(`Successfully obtained download URL: ${downloadURL}`);
              resolve(downloadURL);
            } catch (e) {
              reject(e);
            }
          }
        );
      }

      startUpload();
    });
  }

  // Master Publish Action with audited Promise chain
  publishBtn.addEventListener('click', async () => {
    if (!STATE.currentUser) { showScreen('auth'); return; }
    
    if (!captionInput.value.trim() && STATE.activeCreateTab === 'text') {
      window.showNotification("Please write a caption/text to share!", "info");
      return;
    }

    publishBtn.disabled = true;
    progressBox.style.display = 'block';

    let fileToUpload = null;
    if (STATE.activeCreateTab === 'reel' && reelInput && reelInput.files.length > 0) {
      fileToUpload = reelInput.files[0];
    } else if ((STATE.activeCreateTab === 'photo' || STATE.activeCreateTab === 'story') && photoInput && photoInput.files.length > 0) {
      fileToUpload = photoInput.files[0];
    }

    if (fileToUpload) {
      const folderName = STATE.activeCreateTab === 'reel' ? 'reels' : (STATE.activeCreateTab === 'story' ? 'stories' : 'posts');
      
      uploadFileToStorage(fileToUpload, folderName)
        .then(async (downloadURL) => {
          await finalizePostCreation(downloadURL);
        })
        .catch((error) => {
          console.error("Storage upload failed completely:", error);
          window.showNotification(`Upload failed: ${error.message || 'Unknown network error'}. Please check your connection and try again.`, "error");
          publishBtn.disabled = false;
          progressBox.style.display = 'none';
        });
    } else {
      finalizePostCreation(null);
    }
  });

  async function finalizePostCreation(mediaUrl) {
    const postType = STATE.activeCreateTab;
    
    if (postType === 'reel') {
      if (!mediaUrl) {
        window.showNotification("Please select a video file to publish your Reel!", "info");
        publishBtn.disabled = false;
        progressBox.style.display = 'none';
        return;
      }

      const newReel = {
        creator: {
          uid: STATE.currentUser.uid,
          fullname: STATE.currentUser.fullname,
          username: STATE.currentUser.username,
          avatar: STATE.currentUser.avatar,
          city: STATE.currentUser.city || 'Unspecified'
        },
        videoUrl: mediaUrl,
        caption: captionInput.value.trim(),
        likes: 0,
        comments: 0,
        views: 0,
        points: 20,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        await db.collection('reels').add(newReel);
        await db.collection('users').doc(STATE.currentUser.uid).update({
          postsCount: firebase.firestore.FieldValue.increment(1)
        });
        
        // Reset creating controls
        captionInput.value = '';
        localStorage.removeItem('yb_draft_caption');
        STATE.drafts.caption = '';
        if (reelInput) reelInput.value = '';
        document.getElementById('reel-file-name').style.display = 'none';

        progressBox.style.display = 'none';
        publishBtn.disabled = false;
        showRewardToast(20);
        showScreen('reels');
      } catch (err) {
        window.showNotification("Failed to save reel in database: " + err.message, "error");
        progressBox.style.display = 'none';
        publishBtn.disabled = false;
      }
    } else if (postType === 'story') {
      if (!mediaUrl) {
        window.showNotification("Please select an image file to publish your Story!", "info");
        publishBtn.disabled = false;
        progressBox.style.display = 'none';
        return;
      }

      const newStory = {
        author: {
          uid: STATE.currentUser.uid,
          fullname: STATE.currentUser.fullname,
          username: STATE.currentUser.username,
          avatar: STATE.currentUser.avatar,
          city: STATE.currentUser.city || 'Unspecified'
        },
        mediaUrl: mediaUrl,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        await db.collection('stories').add(newStory);
        
        // Reset creating controls
        captionInput.value = '';
        localStorage.removeItem('yb_draft_caption');
        STATE.drafts.caption = '';
        if (photoInput) photoInput.value = '';
        document.getElementById('photo-file-name').style.display = 'none';

        progressBox.style.display = 'none';
        publishBtn.disabled = false;
        showRewardToast(5);
        showScreen('home');
      } catch (err) {
        window.showNotification("Failed to save story in database: " + err.message, "error");
        progressBox.style.display = 'none';
        publishBtn.disabled = false;
      }
    } else {
      if (postType === 'photo' && !mediaUrl) {
        window.showNotification("Please select a photo file!", "info");
        publishBtn.disabled = false;
        progressBox.style.display = 'none';
        return;
      }

      const newPost = {
        author: {
          uid: STATE.currentUser.uid,
          fullname: STATE.currentUser.fullname,
          username: STATE.currentUser.username,
          avatar: STATE.currentUser.avatar,
          city: STATE.currentUser.city || 'Unspecified'
        },
        type: postType === 'text' ? 'text' : 'photo',
        mediaUrl: mediaUrl,
        caption: captionInput.value.trim(),
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        points: 10,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        local: true
      };

      try {
        await db.collection('posts').add(newPost);
        await db.collection('users').doc(STATE.currentUser.uid).update({
          postsCount: firebase.firestore.FieldValue.increment(1)
        });
        
        // Reset creating controls
        captionInput.value = '';
        localStorage.removeItem('yb_draft_caption');
        STATE.drafts.caption = '';
        if (photoInput) photoInput.value = '';
        document.getElementById('photo-file-name').style.display = 'none';

        progressBox.style.display = 'none';
        publishBtn.disabled = false;
        showRewardToast(10);
        showScreen('home');
      } catch (err) {
        window.showNotification("Failed to save post in database: " + err.message, "error");
        progressBox.style.display = 'none';
        publishBtn.disabled = false;
      }
    }
  }
}

// --- SEARCH ENGINE ---
function setupSearch() {
  const tagsContainer = document.getElementById('trending-hashtags-container');
  if (!tagsContainer) return;
  
  tagsContainer.innerHTML = '';
  const hashtags = ['#yaarbuzz', '#localhero', '#reelsindia', '#incredibleindia', '#hustle', '#cricketlive'];
  
  hashtags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'suggestion-chip';
    chip.style.fontSize = '12px';
    chip.textContent = tag;
    chip.addEventListener('click', () => {
      const searchField = document.getElementById('search-input-field');
      searchField.value = tag;
      // Trigger search event
      searchField.dispatchEvent(new Event('input'));
    });
    tagsContainer.appendChild(chip);
  });

  const searchInput = document.getElementById('search-input-field');
  if (searchInput) {
    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const queryText = searchInput.value.trim().toLowerCase();
      
      if (!queryText) {
        // Clear search results view
        document.getElementById('trending-hashtags-container').style.display = 'flex';
        const oldResults = document.getElementById('search-results-container');
        if (oldResults) oldResults.remove();
        return;
      }
      
      searchTimeout = setTimeout(async () => {
        document.getElementById('trending-hashtags-container').style.display = 'none';
        
        let resultsContainer = document.getElementById('search-results-container');
        if (!resultsContainer) {
          resultsContainer = document.createElement('div');
          resultsContainer.id = 'search-results-container';
          resultsContainer.className = 'scrollable';
          resultsContainer.style.marginTop = '16px';
          resultsContainer.style.width = '100%';
          searchInput.parentNode.parentNode.appendChild(resultsContainer);
        }
        resultsContainer.innerHTML = '<div style="color:var(--text-muted); font-size:12px; text-align:center;">Searching...</div>';
        
        try {
          // Query creators
          const userSnapshot = await db.collection('users')
            .where('username', '>=', queryText)
            .where('username', '<=', queryText + '\uf8ff')
            .limit(5)
            .get();
            
          // Query posts
          const postSnapshot = await db.collection('posts')
            .where('caption', '>=', queryText)
            .where('caption', '<=', queryText + '\uf8ff')
            .limit(10)
            .get();
            
          resultsContainer.innerHTML = '';
          
          if (userSnapshot.empty && postSnapshot.empty) {
            resultsContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:20px;">No creators or posts match your search query.</div>';
            return;
          }
          
          if (!userSnapshot.empty) {
            const h4 = document.createElement('h4');
            h4.textContent = "Creators Found";
            h4.style.fontSize = "12px";
            h4.style.color = "var(--text-secondary)";
            h4.style.textTransform = "uppercase";
            h4.style.margin = "8px 0";
            resultsContainer.appendChild(h4);
            
            userSnapshot.forEach(doc => {
              const u = doc.data();
              const row = document.createElement('div');
              row.className = 'card';
              row.style.margin = '0 0 8px 0';
              row.style.padding = '8px 12px';
              row.style.display = 'flex';
              row.style.alignItems = 'center';
              row.style.gap = '10px';
              row.innerHTML = `
                <img src="${u.avatar}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                <div>
                  <div style="font-weight:600; font-size:13px; color:white;">${u.fullname}</div>
                  <div style="font-size:11px; color:var(--text-secondary);">@${u.username}</div>
                </div>
              `;
              resultsContainer.appendChild(row);
            });
          }
          
          if (!postSnapshot.empty) {
            const h4 = document.createElement('h4');
            h4.textContent = "Posts Found";
            h4.style.fontSize = "12px";
            h4.style.color = "var(--text-secondary)";
            h4.style.textTransform = "uppercase";
            h4.style.margin = "16px 0 8px 0";
            resultsContainer.appendChild(h4);
            
            postSnapshot.forEach(doc => {
              const p = doc.data();
              const card = createPostCard({ id: doc.id, ...p });
              card.style.margin = '0 0 10px 0';
              resultsContainer.appendChild(card);
            });
          }
        } catch (e) {
          console.error("Search query execution failed:", e);
          resultsContainer.innerHTML = '<div style="color:var(--danger-red); font-size:12px;">Search query execution failed.</div>';
        }
      }, 500);
    });
  }
}

// --- PROFILE & SETTINGS ---
function setupProfile() {
  document.getElementById('profile-edit-btn').addEventListener('click', () => {
    const panel = document.getElementById('profile-edit-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    
    // Fill profile detail fields
    document.getElementById('edit-fullname-input').value = STATE.currentUser ? STATE.currentUser.fullname : '';
    document.getElementById('edit-bio-input').value = STATE.currentUser ? (STATE.currentUser.bio || '') : '';
    
    const previewPic = document.getElementById('edit-profile-pic-preview');
    if (previewPic && STATE.currentUser) {
      previewPic.src = STATE.currentUser.avatar;
    }
  });

  const profilePicInput = document.getElementById('edit-profile-pic-input');
  const profilePicPreview = document.getElementById('edit-profile-pic-preview');
  let profilePicFile = null;

  if (profilePicInput) {
    profilePicInput.addEventListener('change', () => {
      if (profilePicInput.files.length > 0) {
        profilePicFile = profilePicInput.files[0];
        profilePicPreview.src = URL.createObjectURL(profilePicFile);
      }
    });
  }

  // Save profile updates to Firebase Storage and Firestore
  document.getElementById('edit-profile-save-btn').addEventListener('click', async () => {
    if (!STATE.currentUser) return;

    const fName = document.getElementById('edit-fullname-input').value.trim();
    const bioTxt = document.getElementById('edit-bio-input').value.trim();

    if (!fName) {
      window.showNotification("Full Name field cannot be left empty!", "error");
      return;
    }

    const saveBtn = document.getElementById('edit-profile-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving Profile...";

    try {
      let avatarUrl = STATE.currentUser.avatar;

      // Handle picture uploads
      if (profilePicFile) {
        const storageRef = storage.ref();
        const picRef = storageRef.child(`profile_pics/${STATE.currentUser.uid}/${Date.now()}_${profilePicFile.name}`);
        const uploadResult = await picRef.put(profilePicFile);
        avatarUrl = await uploadResult.ref.getDownloadURL();
      }

      // Update Firestore user document
      await db.collection('users').doc(STATE.currentUser.uid).update({
        fullname: fName,
        bio: bioTxt,
        avatar: avatarUrl
      });

      // Update Firebase Auth details
      const authUser = auth.currentUser;
      if (authUser) {
        await authUser.updateProfile({
          displayName: fName,
          photoURL: avatarUrl
        });
      }

      // Sync state variables
      STATE.currentUser.fullname = fName;
      STATE.currentUser.bio = bioTxt;
      STATE.currentUser.avatar = avatarUrl;
      profilePicFile = null;
      if (profilePicInput) profilePicInput.value = '';

      // Update UI components
      syncUserProfileUI(STATE.currentUser);
      document.getElementById('profile-user-bio').textContent = bioTxt;

      renderProfilePosts(); // Refresh profile stats/grid

      document.getElementById('profile-edit-panel').style.display = 'none';
      window.showNotification("Profile updated successfully!", "success");
    } catch (e) {
      console.error("Updating profile failed:", e);
      window.showNotification("Profile update failed: " + e.message, "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  });

  // Settings Actions
  document.getElementById('profile-settings-btn').addEventListener('click', () => {
    const panel = document.getElementById('profile-settings-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('settings-clear-cache-btn').addEventListener('click', () => {
    localStorage.clear();
    window.showNotification("Cache cleared successfully!", "success");
  });

  document.getElementById('settings-delete-account-btn').addEventListener('click', () => {
    window.showConfirm("Are you sure you want to delete your YaarBuzz account permanently?", async () => {
      const authUser = auth.currentUser;
      if (authUser) {
        try {
          await db.collection('users').doc(STATE.currentUser.uid).delete();
          await authUser.delete();
          window.showNotification("Account deleted permanently. Goodbye!", "success");
        } catch (e) {
          window.showNotification("Delete Account failed: " + e.message + "\nPlease re-log in to authorize this operation.", "error");
        }
      }
    });
  });
}

async function renderProfilePosts() {
  const container = document.getElementById('profile-grid-posts');
  if (!container || !STATE.currentUser) return;
  container.innerHTML = '<div style="grid-column: span 3; text-align:center; padding:20px; font-size:12px; color:var(--text-muted);">Loading posts...</div>';

  try {
    const snapshot = await db.collection('posts')
      .where('author.uid', '==', STATE.currentUser.uid)
      .orderBy('timestamp', 'desc')
      .get();
      
    // Also load own profile bio & accurate stats from Firestore user document
    const userDoc = await db.collection('users').doc(STATE.currentUser.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      
      const postsCount = data.postsCount || 0;
      const followersCount = data.followersCount || 0;
      const followingCount = data.followingCount || 0;
      const points = data.points || 0;

      document.getElementById('profile-user-bio').textContent = data.bio || '';
      document.getElementById('profile-stat-posts').textContent = postsCount;
      document.getElementById('profile-stat-followers').textContent = followersCount;
      document.getElementById('profile-stat-following').textContent = followingCount;
      document.getElementById('profile-stat-points').textContent = points;
    } else {
      document.getElementById('profile-user-bio').textContent = '';
      document.getElementById('profile-stat-posts').textContent = 0;
      document.getElementById('profile-stat-followers').textContent = 0;
      document.getElementById('profile-stat-following').textContent = 0;
      document.getElementById('profile-stat-points').textContent = 0;
    }

    container.innerHTML = '';
    if (snapshot.empty) {
      container.innerHTML = `<div style="grid-column: span 3; text-align:center; padding:40px; color:var(--text-muted); font-size:13px;">No posts created yet.<br>Create a Post or Reel to start earning points!</div>`;
      return;
    }

    snapshot.forEach(doc => {
      const post = doc.data();
      const item = document.createElement('div');
      item.className = 'grid-item';
      item.style.position = 'relative';
      item.style.cursor = 'pointer';

      if (post.type === 'photo') {
        item.innerHTML = `
          <img src="${post.mediaUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:var(--radius-sm);">
          <span class="grid-badge" style="position:absolute; bottom:6px; right:6px; background:rgba(0,0,0,0.6); color:white; font-size:9px; padding:2px 6px; border-radius:4px;">Photo</span>
        `;
      } else {
        item.innerHTML = `
          <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:linear-gradient(45deg, #111, #333); color:white; font-size:10px; font-weight:700; padding:8px; text-align:center; border-radius:var(--radius-sm); overflow:hidden;">
            ${post.caption.substring(0, 30)}${post.caption.length > 30 ? '...' : ''}
          </div>
          <span class="grid-badge" style="position:absolute; bottom:6px; right:6px; background:rgba(0,0,0,0.6); color:white; font-size:9px; padding:2px 6px; border-radius:4px;">Text</span>
        `;
      }

      item.addEventListener('click', () => {
        window.showNotification(`"${post.caption}" | Likes: ${post.likesCount || 0} | Comments: ${post.commentsCount || 0}`, "info");
      });

      container.appendChild(item);
    });
  } catch (e) {
    console.error("Error rendering profile grid:", e);
    container.innerHTML = '<div style="grid-column: span 3; text-align:center; padding:20px; font-size:12px; color:var(--danger-red);">Could not load posts.</div>';
  }
}

// --- NON-MVP PLACEHOLDERS (DO NOT IMPLEMENT YET) ---
function setupInbox() {
  // Inbox direct messages are disabled for Phase 1 MVP
  const threadsContainer = document.getElementById('chat-threads-container');
  if (threadsContainer) {
    threadsContainer.innerHTML = `
      <div style="text-align:center; padding:48px 16px; color:var(--text-secondary);">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary-orange)" stroke-width="2" style="margin-bottom:12px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <h4 style="color:white; margin-bottom:4px;">Inbox Messages Coming Soon!</h4>
        <p style="font-size:11px;">Hyperlocal direct messaging is currently being developed and will release in the next major build.</p>
      </div>
    `;
  }
}

function setupLeaderboardPlaceholder() {
  const container = document.getElementById('leaderboard-full-list');
  if (container) {
    container.innerHTML = `
      <div style="text-align:center; padding:32px 16px; color:var(--text-secondary);">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary-orange)" stroke-width="2" style="margin-bottom:12px;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a6 6 0 0 1 6 6v1H6V8a6 6 0 0 1 6-6Z"/></svg>
        <h4 style="color:white; margin-bottom:4px;">Loading Leaderboard...</h4>
        <p style="font-size:11px;">Fetching top creators...</p>
      </div>
    `;
  }
}

// Real-time Leaderboard fetching users by XP points descending
function setupLeaderboardReal() {
  try {
    db.collection('users').orderBy('points', 'desc').limit(20).get().then(snapshot => {
      const users = [];
      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });

      // Populate Top 3 Podium
      const podiumPositions = [1, 2, 3];
      podiumPositions.forEach(pos => {
        const user = users[pos - 1];
        const avatarEl = document.getElementById(`podium-${pos}-avatar`);
        const nameEl = document.getElementById(`podium-${pos}-name`);
        if (avatarEl && nameEl) {
          if (user) {
            avatarEl.src = user.avatar || window.generateDefaultAvatar(user.fullname || 'User');
            nameEl.textContent = user.fullname || user.username || 'User';
          } else {
            avatarEl.src = window.generateDefaultAvatar('Empty');
            nameEl.textContent = '—';
          }
        }
      });

      // Populate remaining rows (rank 4+)
      const container = document.getElementById('leaderboard-full-list');
      if (container) {
        if (users.length === 0) {
          container.innerHTML = `
            <div style="text-align:center; padding:32px 16px; color:var(--text-secondary);">
              <h4 style="color:white; margin-bottom:4px;">No users yet!</h4>
              <p style="font-size:11px;">Be the first to earn XP by posting, creating reels, and engaging with the community.</p>
            </div>
          `;
          return;
        }

        container.innerHTML = '';
        users.slice(3).forEach((user, index) => {
          const rank = index + 4;
          const userAvatar = user.avatar || window.generateDefaultAvatar(user.fullname || 'User');
          const row = document.createElement('div');
          row.className = 'leaderboard-item';
          row.innerHTML = `
            <span class="rank-badge">#${rank}</span>
            <img src="${userAvatar}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
            <div style="flex:1;">
              <div style="font-weight:600; font-size:13px;">${user.fullname || user.username || 'User'}</div>
              <div style="font-size:11px; color:var(--text-secondary);">@${user.username || 'user'}</div>
            </div>
            <div style="font-weight:700; color:var(--secondary-green); font-size:13px;">${user.points || 0} XP</div>
          `;
          container.appendChild(row);
        });
      }
    }).catch(err => {
      console.error('Leaderboard fetch failed:', err);
      window.logError('Leaderboard Fetch', err);
    });
  } catch (e) {
    console.error('Leaderboard setup error:', e);
    window.logError('Leaderboard Setup', e);
  }
}

function setupAdminDashboard() {
  // Hidden completely in MVP
}
