/**
 * YaarBuzz - Master Client JavaScript Engine
 * Production-Ready MVP Connected to Supabase
 */

// --- CENTRALIZED ERROR LOGGING SYSTEM ---
window.logError = async function(feature, error) {
  console.error(`[ERROR] Feature: ${feature} | Message: ${error.message || error}`, error);

  if (typeof supabase !== 'undefined') {
    try {
      const userId = (STATE.currentUser && STATE.currentUser.uid) ? STATE.currentUser.uid : null;
      await supabase.from('errors').insert({
        feature: feature,
        message: error.message || String(error),
        stack: error.stack || 'No stack trace available',
        user_id: userId,
        user_agent: navigator.userAgent
      });
    } catch (e) {
      console.warn("Error logger write failed:", e);
    }
  }
};

// Avatar fallback
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
  const bgColor = type === 'error' ? '#EF4444' : (type === 'success' ? '#10B981' : '#F97316');

  toast.style.cssText = `
    background: ${bgColor}; color: #FFFFFF; padding: 14px 20px; border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
    font-family: 'Outfit', 'Inter', sans-serif; font-size: 14px; font-weight: 600;
    min-width: 280px; max-width: 360px; display: flex; align-items: center;
    justify-content: space-between; opacity: 0; transform: translateY(-20px);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;

  toast.innerHTML = `
    <span style="flex: 1; margin-right: 12px; line-height: 1.4;">${message}</span>
    <span class="notification-close" style="cursor: pointer; font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.8);">&times;</span>
  `;

  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 20);

  const closeBtn = toast.querySelector('.notification-close');
  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 400);
  };
  closeBtn.addEventListener('click', dismiss);
  setTimeout(dismiss, 4500);
};

window.showConfirm = function(message, onConfirm) {
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 17, 21, 0.85); backdrop-filter: blur(6px);
    z-index: 999999; display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.25s ease;
  `;

  backdrop.innerHTML = `
    <div style="background: #1A1D24; border: 1px solid #2D3139; border-radius: 16px; width: 90%; max-width: 380px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6); transform: scale(0.9); transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
      <h3 style="margin-top: 0; margin-bottom: 12px; font-family: 'Outfit', sans-serif; color: #FFFFFF; font-size: 18px; font-weight: 700;">Confirm Action</h3>
      <p style="font-family: 'Inter', sans-serif; font-size: 14px; color: #A0A5B1; line-height: 1.5; margin-bottom: 24px;">${message}</p>
      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <button id="confirm-cancel-btn" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #FFFFFF; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
        <button id="confirm-ok-btn" style="background: #EF4444; border: none; color: #FFFFFF; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer;">Confirm</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  setTimeout(() => {
    backdrop.style.opacity = '1';
    backdrop.querySelector('div').style.transform = 'scale(1)';
  }, 10);

  const dismiss = () => {
    backdrop.style.opacity = '0';
    backdrop.querySelector('div').style.transform = 'scale(0.9)';
    setTimeout(() => backdrop.remove(), 250);
  };

  backdrop.querySelector('#confirm-cancel-btn').addEventListener('click', dismiss);
  backdrop.querySelector('#confirm-ok-btn').addEventListener('click', () => { dismiss(); onConfirm(); });
};

// --- GLOBAL DATABASE / STATE ---
const STATE = {
  currentLanguage: 'en',
  currentTheme: 'dark',
  currentScreen: 'onboarding',
  currentUser: null,
  isMuted: true,
  activeFeedTab: 'foryou',
  activeCreateTab: 'reel',
  activeOnboardingSlide: 0,
  drafts: { caption: localStorage.getItem('yb_draft_caption') || '' },
  posts: [],
  reels: []
};

let LOCALIZATION_DB = {};

// Helper: Get server timestamp
function serverTimestamp() {
  return new Date().toISOString();
}

// --- APP INITIALIZER ---
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('localization.json');
    LOCALIZATION_DB = await res.json();
  } catch (e) {
    console.error('Failed to load translations', e);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log("SW registration failed", err));
  }

  initApp();
});

function initApp() {
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

      if (!STATE.currentUser && targetId !== 'auth' && targetId !== 'onboarding') {
        showScreen('auth');
        return;
      }

      navItems.forEach(i => i.classList.remove('active'));
      if (item.classList.contains('nav-item')) item.classList.add('active');

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
  const unprotectedScreens = ['auth', 'onboarding', 'splash', 'profile-setup'];
  if (!STATE.currentUser && !unprotectedScreens.includes(screenId)) {
    showScreen('auth');
    return;
  }

  STATE.currentScreen = screenId;

  document.querySelectorAll('.screen').forEach(screen => screen.style.display = 'none');

  const activeScreen = document.getElementById(`screen-${screenId}`);
  if (activeScreen) {
    activeScreen.style.display = (screenId === 'reels' || screenId === 'inbox' || screenId === 'leaderboard') ? 'block' : 'flex';
  }

  if (screenId === 'home') renderFeedList();
  else if (screenId === 'profile') renderProfilePosts();
  else if (screenId === 'reels') setTimeout(initReelsVideoObserver, 200);
  else if (screenId === 'leaderboard') setupLeaderboardReal();
}

// --- FLOATING REWARD TOAST ENGINE ---
async function showRewardToast(pointsVal) {
  const toast = document.getElementById('global-reward-toast');
  const dict = LOCALIZATION_DB[STATE.currentLanguage];
  const toastText = document.getElementById('reward-toast-text');

  if (dict && dict['points_gained']) {
    toastText.textContent = dict['points_gained'].replace('{points}', pointsVal);
  } else {
    toastText.textContent = `+${pointsVal} XP Points!`;
  }

  if (STATE.currentUser) {
    try {
      await supabase.from('users')
        .update({ points: (STATE.currentUser.points || 0) + pointsVal })
        .eq('id', STATE.currentUser.id);

      STATE.currentUser.points = (STATE.currentUser.points || 0) + pointsVal;
      document.getElementById('profile-stat-points').textContent = STATE.currentUser.points;
    } catch (err) {
      console.error("Error incrementing user points:", err);
    }
  }

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
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
    loginBtn.addEventListener('click', () => showScreen('auth'));
  }
}

// --- STORIES VIEW ---
let storiesChannel = null;

async function setupStories() {
  const container = document.getElementById('stories-container');
  if (!container) return;

  // Initial load
  await loadStories();

  // Subscribe to real-time updates
  storiesChannel = supabase.channel('stories-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => loadStories())
    .subscribe();
}

async function loadStories() {
  const container = document.getElementById('stories-container');
  if (!container) return;

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    container.innerHTML = '';

    // Add current user's story first
    const myAvatar = STATE.currentUser ? (STATE.currentUser.avatar || window.generateDefaultAvatar(STATE.currentUser.fullname)) : window.generateDefaultAvatar('YaarBuzz User');
    container.innerHTML += `
      <div class="story-item" id="story-item-my" onclick="viewMyStory()">
        <div class="story-avatar-ring viewed">
          <img id="story-my-avatar" class="story-avatar" src="${myAvatar}" alt="Your Story">
        </div>
        <span class="story-username">Your Story</span>
      </div>
    `;

    if (stories) {
      stories.forEach(story => {
        const avatar = story.author_avatar || window.generateDefaultAvatar(story.author_fullname);
        container.innerHTML += `
          <div class="story-item" onclick="viewStoryDetail('${story.media_url}', '${story.id}', '${story.author_id}')">
            <div class="story-avatar-ring">
              <img class="story-avatar" src="${avatar}" alt="${story.author_username}">
            </div>
            <span class="story-username">${story.author_username}</span>
          </div>
        `;
      });
    }
  } catch (err) {
    console.error("Error loading stories:", err);
    window.logError("Load Stories Feed", err);
  }
}

window.viewMyStory = async function() {
  if (!STATE.currentUser) { showScreen('auth'); return; }

  try {
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .eq('author_id', STATE.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (stories && stories.length > 0) {
      const story = stories[0];
      window.viewStoryDetail(story.media_url, story.id, STATE.currentUser.id);
    } else {
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

window.viewStoryDetail = function(url, storyId, authorId) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.95); z-index: 2000; display: flex;
    flex-direction: column; align-items: center; justify-content: center; cursor: pointer;
  `;

  let deleteBtnHtml = '';
  if (STATE.currentUser && storyId && authorId === STATE.currentUser.id) {
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

  overlay.addEventListener('click', async (e) => {
    if (e.target.classList.contains('story-delete-btn')) {
      e.stopPropagation();
      window.showConfirm("Are you sure you want to delete this story permanently?", async () => {
        try {
          await supabase.from('stories').delete().eq('id', storyId);
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
let feedChannel = null;

async function setupFeed() {
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

  // Initial load
  await loadPosts();

  // Subscribe to real-time updates
  feedChannel = supabase.channel('posts-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
      loadPosts();
    })
    .subscribe();
}

async function loadPosts() {
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    STATE.posts = posts || [];
    if (STATE.currentScreen === 'home') {
      renderFeedList();
    }
  } catch (err) {
    console.error("Error loading posts:", err);
    window.logError("Load Posts Feed", err);
  }
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
      postsToRender = STATE.posts.filter(p => p.author_city === userCity);
    }
  }

  if (postsToRender.length === 0) {
    const currentCity = STATE.currentUser ? STATE.currentUser.city : 'your city';
    container.innerHTML = `
      <div style="text-align:center; padding: 48px 16px; color: var(--text-secondary);">
        <p style="font-size: 14px;">No posts published in ${currentCity} yet.</p>
        <p style="font-size: 12px; margin-top:4px;">Be the first creator from ${currentCity}!</p>
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

  const author = {
    id: post.author_id,
    fullname: post.author_fullname || 'YaarBuzz User',
    username: post.author_username || 'user',
    avatar: post.author_avatar || window.generateDefaultAvatar(post.author_fullname || 'User'),
    city: post.author_city
  };

  const likesCount = post.likes_count || 0;
  const commentsCount = post.comments_count || 0;

  let mediaHtml = '';
  if (post.type === 'photo' && post.media_url) {
    mediaHtml = `
      <div class="post-media-container">
        <img class="post-media" src="${post.media_url}" alt="Post Image">
      </div>
    `;
  }

  let followButtonHtml = '';
  if (STATE.currentUser && author.id && author.id !== STATE.currentUser.id) {
    const isFollowing = STATE.currentUser.following && STATE.currentUser.following.includes(author.id);
    followButtonHtml = `
      <button class="btn-follow-toggle" data-uid="${author.id}" style="background:${isFollowing ? 'var(--surface-color)' : 'var(--primary-orange)'}; color:white; border:${isFollowing ? '1px solid var(--border-color)' : 'none'}; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:700; cursor:pointer; margin-left:8px;">
        ${isFollowing ? 'Following' : 'Follow'}
      </button>
    `;
  }

  let timeStr = 'Just now';
  if (post.created_at) {
    const postDate = new Date(post.created_at);
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
    <div class="comments-drawer" style="display:none; margin-top:12px; padding-top:12px; border-top:1px solid var(--border-color);">
      <div class="comments-list" style="display:flex; flex-direction:column; gap:8px; max-height:160px; overflow-y:auto; margin-bottom:10px;"></div>
      <div style="display:flex; gap:8px;">
        <input type="text" class="input-field comment-input-box" placeholder="Add a comment..." style="padding:6px 12px; border-radius:20px; font-size:12px;">
        <button class="btn btn-primary submit-comment-btn" style="width:auto; padding:6px 12px; font-size:12px; border-radius:20px;">Post</button>
      </div>
    </div>
  `;

  // Check if user liked this post
  if (STATE.currentUser) {
    supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', STATE.currentUser.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const likeBtn = card.querySelector('.post-action-like');
          const likeSvg = likeBtn.querySelector('svg');
          likeBtn.classList.add('liked', 'active');
          likeSvg.setAttribute('fill', 'var(--secondary-green)');
          likeSvg.style.color = 'var(--secondary-green)';
        }
      });
  }

  // Bind follow toggle
  const followBtn = card.querySelector('.btn-follow-toggle');
  if (followBtn) {
    followBtn.addEventListener('click', async () => {
      if (!STATE.currentUser) { showScreen('auth'); return; }

      const authorId = author.id;
      if (!authorId) return;

      let following = STATE.currentUser.following || [];
      const isFollowing = following.includes(authorId);

      if (isFollowing) {
        following = following.filter(id => id !== authorId);
        followBtn.textContent = 'Follow';
        followBtn.style.background = 'var(--primary-orange)';
        followBtn.style.border = 'none';
      } else {
        following.push(authorId);
        followBtn.textContent = 'Following';
        followBtn.style.background = 'var(--surface-color)';
        followBtn.style.border = '1px solid var(--border-color)';
        showRewardToast(5);
      }

      STATE.currentUser.following = following;
      STATE.currentUser.following_count = following.length;

      await supabase.from('users').update({ following, following_count: following.length }).eq('id', STATE.currentUser.id);

      // Update target's followers
      const { data: targetUser } = await supabase.from('users').select('followers, followers_count').eq('id', authorId).maybeSingle();
      if (targetUser) {
        let targetFollowers = targetUser.followers || [];
        if (isFollowing) {
          targetFollowers = targetFollowers.filter(id => id !== STATE.currentUser.id);
        } else {
          if (!targetFollowers.includes(STATE.currentUser.id)) targetFollowers.push(STATE.currentUser.id);
        }
        await supabase.from('users').update({ followers: targetFollowers, followers_count: targetFollowers.length }).eq('id', authorId);
      }
    });
  }

  // Bind like
  const likeBtn = card.querySelector('.post-action-like');
  likeBtn.addEventListener('click', () => togglePostLike(post.id, likeBtn));

  // Bind comments
  const commentTrigger = card.querySelector('.post-action-comment');
  const drawer = card.querySelector('.comments-drawer');
  const listDiv = card.querySelector('.comments-list');
  let commentListener = null;

  commentTrigger.addEventListener('click', async () => {
    if (drawer.style.display === 'none') {
      drawer.style.display = 'block';
      await loadPostComments(post.id, listDiv);
    } else {
      drawer.style.display = 'none';
    }
  });

  const submitCommentBtn = card.querySelector('.submit-comment-btn');
  const commentInput = card.querySelector('.comment-input-box');
  const commentsCountSpan = card.querySelector('.comments-count');

  submitCommentBtn.addEventListener('click', () => addPostComment(post.id, commentInput, commentsCountSpan));
  commentInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addPostComment(post.id, commentInput, commentsCountSpan);
  });

  // Bind share
  const shareBtn = card.querySelector('.post-action-share');
  shareBtn.addEventListener('click', () => {
    if (!STATE.currentUser) { showScreen('auth'); return; }
    const shareText = `Check out ${author.fullname}'s post on YaarBuzz: "${post.caption.substring(0, 30)}..."`;
    navigator.clipboard.writeText(shareText).then(() => {
      window.showNotification("Post details copied to clipboard!", "success");
      showRewardToast(2);
    }).catch(err => console.error("Could not copy:", err));
  });

  return card;
}

async function togglePostLike(postId, likeBtn) {
  if (!STATE.currentUser) { showScreen('auth'); return; }

  const likeSvg = likeBtn.querySelector('svg');
  const likesCountSpan = likeBtn.querySelector('.likes-count');

  try {
    const { data: existing } = await supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', STATE.currentUser.id).maybeSingle();

    if (existing) {
      // Unlike
      await supabase.from('post_likes').delete().eq('id', existing.id);
      await supabase.rpc('decrement_post_likes', { post_id: postId });

      likeBtn.classList.remove('liked', 'active');
      likeSvg.setAttribute('fill', 'none');
      likeSvg.style.color = 'var(--text-secondary)';

      // Reload to get current count
      const { data: post } = await supabase.from('posts').select('likes_count').eq('id', postId).maybeSingle();
      if (post && likesCountSpan) likesCountSpan.textContent = post.likes_count;
    } else {
      // Like
      await supabase.from('post_likes').insert({ post_id: postId, user_id: STATE.currentUser.id });
      await supabase.rpc('increment_post_likes', { post_id: postId });

      likeBtn.classList.add('liked', 'active');
      likeSvg.setAttribute('fill', 'var(--secondary-green)');
      likeSvg.style.color = 'var(--secondary-green)';
      showRewardToast(1);

      const { data: post } = await supabase.from('posts').select('likes_count').eq('id', postId).maybeSingle();
      if (post && likesCountSpan) likesCountSpan.textContent = post.likes_count;
    }
  } catch (e) {
    console.error("Post like error:", e);
  }
}

async function loadPostComments(postId, listDiv) {
  try {
    const { data: comments, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    listDiv.innerHTML = '';
    if (!comments || comments.length === 0) {
      listDiv.innerHTML = '<div style="font-size:11px; color:var(--text-muted); text-align:center;">No comments yet.</div>';
      return;
    }

    comments.forEach(c => {
      const row = document.createElement('div');
      row.style.fontSize = '12px';
      row.style.lineHeight = '1.4';
      row.innerHTML = `<strong style="color:var(--primary-orange);">@${c.username}:</strong> ${c.text}`;
      listDiv.appendChild(row);
    });
    listDiv.scrollTop = listDiv.scrollHeight;
  } catch (err) {
    console.error("Error loading comments:", err);
  }
}

async function addPostComment(postId, commentInput, commentsCountSpan) {
  if (!STATE.currentUser) { showScreen('auth'); return; }

  const text = commentInput.value.trim();
  if (!text) return;

  try {
    const { error } = await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: STATE.currentUser.id,
      username: STATE.currentUser.username,
      text: text
    });

    if (error) throw error;

    commentInput.value = '';
    showRewardToast(1);

    // Reload comments
    const commentsList = commentInput.parentElement.previousElementSibling;
    await loadPostComments(postId, commentsList);

    // Update count
    const { data: post } = await supabase.from('posts').select('comments_count').eq('id', postId).maybeSingle();
    if (post && commentsCountSpan) commentsCountSpan.textContent = post.comments_count;
  } catch (e) {
    console.error("Error posting comment:", e);
    window.showNotification("Comment posting failed: " + e.message, "error");
  }
}

// --- REELS VIEWER ENGINE ---
let reelsChannel = null;

async function setupReels() {
  const container = document.getElementById('reels-scroll-container');
  if (!container) return;

  await loadReels();

  reelsChannel = supabase.channel('reels-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reels' }, () => loadReels())
    .subscribe();
}

async function loadReels() {
  const container = document.getElementById('reels-scroll-container');
  if (!container) return;

  try {
    const { data: reels, error } = await supabase
      .from('reels')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    STATE.reels = reels || [];
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

      const creator = {
        id: reel.creator_id,
        fullname: reel.creator_fullname || 'YaarBuzz Creator',
        username: reel.creator_username || 'creator',
        avatar: reel.creator_avatar || window.generateDefaultAvatar(reel.creator_fullname || 'Creator')
      };

      item.innerHTML = `
        <div class="reel-video-container" style="width:100%; height:100%; position:relative; background:#000; display:flex; align-items:center; justify-content:center;">
          <video class="reel-video-player" src="${reel.video_url}" loop playsinline muted style="width:100%; height:100%; object-fit:cover;"></video>
          <div class="reel-play-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s; z-index:2; cursor:pointer;">
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="white" stroke="white" opacity="0.8"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <div class="sound-badge" style="position:absolute; top:24px; right:16px; background:rgba(0,0,0,0.6); padding:8px; border-radius:50%; display:flex; cursor:pointer; z-index:10;" title="Toggle Mute">
            <svg class="sound-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path class="sound-waves" style="display:${STATE.isMuted ? 'none' : 'block'}" d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          </div>
        </div>
        <div class="reel-overlay">
          <div class="reel-creator">
            <img class="reel-avatar" src="${creator.avatar}">
            <span class="reel-username">@${creator.username}</span>
          </div>
          <p class="reel-caption">${reel.caption || ''}</p>
          <span class="reel-points">+20 XP Reward</span>
        </div>
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

      playOverlay.addEventListener('click', () => {
        if (video.paused) {
          video.play().catch(e => console.log("Play blocked:", e));
          playOverlay.style.opacity = 0;
        } else {
          video.pause();
          playOverlay.style.opacity = 1;
        }
      });

      soundBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        STATE.isMuted = !STATE.isMuted;
        document.querySelectorAll('.reel-video-player').forEach(v => v.muted = STATE.isMuted);
        document.querySelectorAll('.sound-waves').forEach(sw => sw.style.display = STATE.isMuted ? 'none' : 'block');
      });

      const likeTrigger = item.querySelector('.reel-like-trigger');
      likeTrigger.addEventListener('click', () => toggleReelLike(reel.id, likeTrigger));

      // Check if liked
      if (STATE.currentUser) {
        supabase.from('reel_likes').select('id').eq('reel_id', reel.id).eq('user_id', STATE.currentUser.id).maybeSingle()
          .then(({ data }) => {
            if (data) {
              likeTrigger.querySelector('svg').setAttribute('fill', 'var(--primary-orange)');
              likeTrigger.querySelector('svg').style.stroke = 'var(--primary-orange)';
            }
          });
      }

      const shareTrigger = item.querySelector('.reel-share-trigger');
      shareTrigger.addEventListener('click', () => {
        if (!STATE.currentUser) { showScreen('auth'); return; }
        const shareLink = `YaarBuzz Reel by @${creator.username}: "${reel.caption || ''}"`;
        navigator.clipboard.writeText(shareLink).then(() => {
          window.showNotification("Reel copied to clipboard!", "success");
          showRewardToast(2);
        });
      });

      container.appendChild(item);
    });

    initReelsVideoObserver();
  } catch (err) {
    console.error("Error loading reels:", err);
    window.logError("Load Reels Feed", err);
  }
}

async function toggleReelLike(reelId, likeBtn) {
  if (!STATE.currentUser) { showScreen('auth'); return; }

  const likeSvg = likeBtn.querySelector('svg');
  const labelSpan = likeBtn.querySelector('.reel-action-label');

  try {
    const { data: existing } = await supabase.from('reel_likes').select('id').eq('reel_id', reelId).eq('user_id', STATE.currentUser.id).maybeSingle();

    if (existing) {
      await supabase.from('reel_likes').delete().eq('id', existing.id);
      await supabase.rpc('decrement_reel_likes', { reel_id: reelId });

      likeSvg.setAttribute('fill', 'none');
      likeSvg.style.stroke = 'white';

      const { data: reel } = await supabase.from('reels').select('likes').eq('id', reelId).maybeSingle();
      if (reel && labelSpan) labelSpan.textContent = reel.likes;
    } else {
      await supabase.from('reel_likes').insert({ reel_id: reelId, user_id: STATE.currentUser.id });
      await supabase.rpc('increment_reel_likes', { reel_id: reelId });

      likeSvg.setAttribute('fill', 'var(--primary-orange)');
      likeSvg.style.stroke = 'var(--primary-orange)';
      showRewardToast(1);

      const { data: reel } = await supabase.from('reels').select('likes').eq('id', reelId).maybeSingle();
      if (reel && labelSpan) labelSpan.textContent = reel.likes;
    }
  } catch (e) {
    console.error("Reel like error:", e);
  }
}

let reelsObserver = null;
function initReelsVideoObserver() {
  if (reelsObserver) reelsObserver.disconnect();

  reelsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target.querySelector('video');
      const overlay = entry.target.querySelector('.reel-play-overlay');
      if (!video) return;

      if (entry.isIntersecting) {
        document.querySelectorAll('.reel-video-player').forEach(v => {
          if (v !== video) {
            v.pause();
            v.currentTime = 0;
            const otherOverlay = v.parentNode.querySelector('.reel-play-overlay');
            if (otherOverlay) otherOverlay.style.opacity = 1;
          }
        });

        video.muted = STATE.isMuted;
        video.play().then(() => {
          if (overlay) overlay.style.opacity = 0;
        }).catch(e => {
          if (overlay) overlay.style.opacity = 1;
        });

        const reelId = entry.target.id.replace('reel-', '');
        supabase.from('reels').update({ views: (STATE.reels.find(r => r.id === reelId)?.views || 0) + 1 }).eq('id', reelId)
          .catch(err => console.error("Error updating reel views:", err));
      } else {
        video.pause();
        if (overlay) overlay.style.opacity = 1;
      }
    });
  }, { threshold: 0.6 });

  document.querySelectorAll('.reel-item').forEach(item => reelsObserver.observe(item));
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
    [tabReel, tabPhoto, tabStory, tabText].forEach(t => t.classList.remove('active'));
    tabReel.classList.add('active');
    reelPanel.style.display = 'block';
    photoPanel.style.display = 'none';
    STATE.activeCreateTab = 'reel';
  });

  tabPhoto.addEventListener('click', () => {
    [tabReel, tabPhoto, tabStory, tabText].forEach(t => t.classList.remove('active'));
    tabPhoto.classList.add('active');
    photoPanel.style.display = 'block';
    reelPanel.style.display = 'none';
    STATE.activeCreateTab = 'photo';
  });

  if (tabStory) {
    tabStory.addEventListener('click', () => {
      [tabReel, tabPhoto, tabStory, tabText].forEach(t => t.classList.remove('active'));
      tabStory.classList.add('active');
      photoPanel.style.display = 'block';
      reelPanel.style.display = 'none';
      STATE.activeCreateTab = 'story';
    });
  }

  tabText.addEventListener('click', () => {
    [tabReel, tabPhoto, tabStory, tabText].forEach(t => t.classList.remove('active'));
    tabText.classList.add('active');
    photoPanel.style.display = 'none';
    reelPanel.style.display = 'none';
    STATE.activeCreateTab = 'text';
  });

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
        window.showNotification("Camera and Microphone access granted!", "success");
      } catch (err) {
        window.showNotification("Camera access failed: " + err.message, "error");
      }
    });
  }

  async function uploadFileToStorage(file, folder) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${STATE.currentUser.id}/${folder}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage.from('uploads').upload(fileName, file, {
      onUploadProgress: (progress) => {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
      }
    });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  publishBtn.addEventListener('click', async () => {
    if (!STATE.currentUser) { showScreen('auth'); return; }

    if (!captionInput.value.trim() && STATE.activeCreateTab === 'text') {
      window.showNotification("Please write a caption to share!", "info");
      return;
    }

    publishBtn.disabled = true;
    progressBox.style.display = 'block';

    let fileToUpload = null;
    if (STATE.activeCreateTab === 'reel' && reelInput?.files.length > 0) {
      fileToUpload = reelInput.files[0];
    } else if ((STATE.activeCreateTab === 'photo' || STATE.activeCreateTab === 'story') && photoInput?.files.length > 0) {
      fileToUpload = photoInput.files[0];
    }

    try {
      let mediaUrl = null;

      if (fileToUpload) {
        progressText.textContent = `Uploading...`;
        const folder = STATE.activeCreateTab === 'reel' ? 'reels' : (STATE.activeCreateTab === 'story' ? 'stories' : 'posts');
        mediaUrl = await uploadFileToStorage(fileToUpload, folder);
      }

      if (STATE.activeCreateTab === 'reel') {
        if (!mediaUrl) {
          window.showNotification("Please select a video file!", "info");
          publishBtn.disabled = false;
          progressBox.style.display = 'none';
          return;
        }

        const { error } = await supabase.from('reels').insert({
          creator_id: STATE.currentUser.id,
          creator_uid: STATE.currentUser.id,
          creator_fullname: STATE.currentUser.fullname,
          creator_username: STATE.currentUser.username,
          creator_avatar: STATE.currentUser.avatar,
          creator_city: STATE.currentUser.city,
          video_url: mediaUrl,
          caption: captionInput.value.trim(),
          likes: 0,
          comments: 0,
          views: 0,
          points: 20
        });

        if (error) throw error;

        await supabase.rpc('increment_user_posts', { user_id: STATE.currentUser.id });

        captionInput.value = '';
        localStorage.removeItem('yb_draft_caption');
        if (reelInput) reelInput.value = '';
        document.getElementById('reel-file-name').style.display = 'none';

        progressBox.style.display = 'none';
        publishBtn.disabled = false;
        showRewardToast(20);
        showScreen('reels');
      } else if (STATE.activeCreateTab === 'story') {
        if (!mediaUrl) {
          window.showNotification("Please select an image file!", "info");
          publishBtn.disabled = false;
          progressBox.style.display = 'none';
          return;
        }

        const { error } = await supabase.from('stories').insert({
          author_id: STATE.currentUser.id,
          author_uid: STATE.currentUser.id,
          author_fullname: STATE.currentUser.fullname,
          author_username: STATE.currentUser.username,
          author_avatar: STATE.currentUser.avatar,
          author_city: STATE.currentUser.city,
          media_url: mediaUrl
        });

        if (error) throw error;

        captionInput.value = '';
        localStorage.removeItem('yb_draft_caption');
        if (photoInput) photoInput.value = '';
        document.getElementById('photo-file-name').style.display = 'none';

        progressBox.style.display = 'none';
        publishBtn.disabled = false;
        showRewardToast(5);
        showScreen('home');
      } else {
        if (STATE.activeCreateTab === 'photo' && !mediaUrl) {
          window.showNotification("Please select a photo file!", "info");
          publishBtn.disabled = false;
          progressBox.style.display = 'none';
          return;
        }

        const { error } = await supabase.from('posts').insert({
          author_id: STATE.currentUser.id,
          author_uid: STATE.currentUser.id,
          author_fullname: STATE.currentUser.fullname,
          author_username: STATE.currentUser.username,
          author_avatar: STATE.currentUser.avatar,
          author_city: STATE.currentUser.city,
          type: STATE.activeCreateTab === 'text' ? 'text' : 'photo',
          media_url: mediaUrl,
          caption: captionInput.value.trim(),
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          points: 10,
          is_local: true
        });

        if (error) throw error;

        await supabase.rpc('increment_user_posts', { user_id: STATE.currentUser.id });

        captionInput.value = '';
        localStorage.removeItem('yb_draft_caption');
        if (photoInput) photoInput.value = '';
        document.getElementById('photo-file-name').style.display = 'none';

        progressBox.style.display = 'none';
        publishBtn.disabled = false;
        showRewardToast(10);
        showScreen('home');
      }
    } catch (err) {
      window.showNotification("Failed to save: " + err.message, "error");
      progressBox.style.display = 'none';
      publishBtn.disabled = false;
    }
  });
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
          resultsContainer.style.cssText = 'margin-top: 16px; width: 100%;';
          searchInput.parentNode.parentNode.appendChild(resultsContainer);
        }
        resultsContainer.innerHTML = '<div style="color:var(--text-muted); font-size:12px; text-align:center;">Searching...</div>';

        try {
          const { data: users } = await supabase
            .from('users')
            .select('*')
            .ilike('username', `${queryText}%`)
            .limit(5);

          const { data: posts } = await supabase
            .from('posts')
            .select('*')
            .ilike('caption', `%${queryText}%`)
            .limit(10);

          resultsContainer.innerHTML = '';

          if ((!users || users.length === 0) && (!posts || posts.length === 0)) {
            resultsContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:20px;">No results found.</div>';
            return;
          }

          if (users && users.length > 0) {
            const h4 = document.createElement('h4');
            h4.textContent = "Creators Found";
            h4.style.cssText = "font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin: 8px 0;";
            resultsContainer.appendChild(h4);

            users.forEach(u => {
              const row = document.createElement('div');
              row.className = 'card';
              row.style.cssText = 'margin: 0 0 8px 0; padding: 8px 12px; display: flex; align-items: center; gap: 10px;';
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

          if (posts && posts.length > 0) {
            const h4 = document.createElement('h4');
            h4.textContent = "Posts Found";
            h4.style.cssText = "font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin: 16px 0 8px 0;";
            resultsContainer.appendChild(h4);

            posts.forEach(p => {
              const card = createPostCard(p);
              card.style.margin = '0 0 10px 0';
              resultsContainer.appendChild(card);
            });
          }
        } catch (e) {
          console.error("Search error:", e);
          resultsContainer.innerHTML = '<div style="color:var(--danger-red); font-size:12px;">Search failed.</div>';
        }
      }, 500);
    });
  }
}

// --- PROFILE & SETTINGS ---
function setupProfile() {
  document.getElementById('profile-edit-btn')?.addEventListener('click', () => {
    const panel = document.getElementById('profile-edit-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';

    document.getElementById('edit-fullname-input').value = STATE.currentUser?.fullname || '';
    document.getElementById('edit-bio-input').value = STATE.currentUser?.bio || '';

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

  document.getElementById('edit-profile-save-btn')?.addEventListener('click', async () => {
    if (!STATE.currentUser) return;

    const fName = document.getElementById('edit-fullname-input').value.trim();
    const bioTxt = document.getElementById('edit-bio-input').value.trim();

    if (!fName) {
      window.showNotification("Full Name cannot be empty!", "error");
      return;
    }

    const saveBtn = document.getElementById('edit-profile-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      let avatarUrl = STATE.currentUser.avatar;

      if (profilePicFile) {
        const fileExt = profilePicFile.name.split('.').pop();
        const fileName = `${STATE.currentUser.id}/profile/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('profile_pics').upload(fileName, profilePicFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('profile_pics').getPublicUrl(fileName);
          avatarUrl = urlData.publicUrl;
        }
      }

      await supabase.from('users').update({
        fullname: fName,
        bio: bioTxt,
        avatar: avatarUrl
      }).eq('id', STATE.currentUser.id);

      await supabase.auth.updateUser({
        data: { fullname: fName, avatar: avatarUrl }
      });

      STATE.currentUser.fullname = fName;
      STATE.currentUser.bio = bioTxt;
      STATE.currentUser.avatar = avatarUrl;
      profilePicFile = null;
      if (profilePicInput) profilePicInput.value = '';

      syncUserProfileUI(STATE.currentUser);
      document.getElementById('profile-user-bio').textContent = bioTxt;

      renderProfilePosts();
      document.getElementById('profile-edit-panel').style.display = 'none';
      window.showNotification("Profile updated successfully!", "success");
    } catch (e) {
      console.error("Profile update failed:", e);
      window.showNotification("Profile update failed: " + e.message, "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  });

  document.getElementById('profile-settings-btn')?.addEventListener('click', () => {
    const panel = document.getElementById('profile-settings-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('settings-clear-cache-btn')?.addEventListener('click', () => {
    localStorage.clear();
    window.showNotification("Cache cleared successfully!", "success");
  });

  document.getElementById('settings-delete-account-btn')?.addEventListener('click', () => {
    window.showConfirm("Are you sure you want to delete your YaarBuzz account permanently?", async () => {
      try {
        await supabase.from('users').delete().eq('id', STATE.currentUser.id);
        await supabase.auth.admin.deleteUser(STATE.currentUser.id);
        window.showNotification("Account deleted permanently. Goodbye!", "success");
        STATE.currentUser = null;
        showScreen('auth');
      } catch (e) {
        window.showNotification("Delete Account failed: " + e.message, "error");
      }
    });
  });
}

async function renderProfilePosts() {
  const container = document.getElementById('profile-grid-posts');
  if (!container || !STATE.currentUser) return;

  container.innerHTML = '<div style="grid-column: span 3; text-align:center; padding:20px; font-size:12px; color:var(--text-muted);">Loading posts...</div>';

  try {
    const { data: userDoc } = await supabase.from('users').select('*').eq('id', STATE.currentUser.id).maybeSingle();

    if (userDoc) {
      document.getElementById('profile-user-bio').textContent = userDoc.bio || '';
      document.getElementById('profile-stat-posts').textContent = userDoc.posts_count || 0;
      document.getElementById('profile-stat-followers').textContent = userDoc.followers_count || 0;
      document.getElementById('profile-stat-following').textContent = userDoc.following_count || 0;
      document.getElementById('profile-stat-points').textContent = userDoc.points || 0;
    }

    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', STATE.currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    container.innerHTML = '';
    if (!posts || posts.length === 0) {
      container.innerHTML = `<div style="grid-column: span 3; text-align:center; padding:40px; color:var(--text-muted); font-size:13px;">No posts created yet.</div>`;
      return;
    }

    posts.forEach(post => {
      const item = document.createElement('div');
      item.className = 'grid-item';
      item.style.cssText = 'position: relative; cursor: pointer;';

      if (post.type === 'photo') {
        item.innerHTML = `
          <img src="${post.media_url}" style="width:100%; height:100%; object-fit:cover; border-radius:var(--radius-sm);">
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
        window.showNotification(`"${post.caption}" | Likes: ${post.likes_count || 0}`, "info");
      });

      container.appendChild(item);
    });
  } catch (e) {
    console.error("Error rendering profile grid:", e);
    container.innerHTML = '<div style="grid-column: span 3; text-align:center; padding:20px; font-size:12px; color:var(--danger-red);">Could not load posts.</div>';
  }
}

// --- LEADERBOARD ---
async function setupLeaderboardReal() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('points', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Update podium
    [1, 2, 3].forEach(pos => {
      const user = users?.[pos - 1];
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

    const container = document.getElementById('leaderboard-full-list');
    if (container) {
      if (!users || users.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:32px 16px; color:var(--text-secondary);">
            <h4 style="color:white; margin-bottom:4px;">No users yet!</h4>
            <p style="font-size:11px;">Be the first to earn XP!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      users.slice(3).forEach((user, index) => {
        const rank = index + 4;
        const row = document.createElement('div');
        row.className = 'leaderboard-item';
        row.innerHTML = `
          <span class="rank-badge">#${rank}</span>
          <img src="${user.avatar || window.generateDefaultAvatar(user.fullname || 'User')}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
          <div style="flex:1;">
            <div style="font-weight:600; font-size:13px;">${user.fullname || user.username || 'User'}</div>
            <div style="font-size:11px; color:var(--text-secondary);">@${user.username || 'user'}</div>
          </div>
          <div style="font-weight:700; color:var(--secondary-green); font-size:13px;">${user.points || 0} XP</div>
        `;
        container.appendChild(row);
      });
    }
  } catch (err) {
    console.error('Leaderboard fetch failed:', err);
    window.logError('Leaderboard Fetch', err);
  }
}

// Placeholder for inbox
function setupInbox() {
  const threadsContainer = document.getElementById('chat-threads-container');
  if (threadsContainer) {
    threadsContainer.innerHTML = `
      <div style="text-align:center; padding:48px 16px; color:var(--text-secondary);">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary-orange)" stroke-width="2" style="margin-bottom:12px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <h4 style="color:white; margin-bottom:4px;">Inbox Coming Soon!</h4>
        <p style="font-size:11px;">Direct messaging is under development.</p>
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

console.log('[App] YaarBuzz App Engine loaded');
