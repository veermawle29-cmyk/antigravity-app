# YaarBuzz - India's Gamified Social App

YaarBuzz is a PWA-ready, premium, highly gamified social app built for India. It lets users connect, share their moments, watch reels, earn awards/points, and customize their profiles with ease.

## Key Features

- **Gamified User Experience**: Earn points, unlock badges, and level up as you participate and engage with the community.
- **Short-form Reels / Videos**: Share and scroll through modern, immersive vertical video reels with seamless interactions.
- **Dynamic Localization**: Native support for English, Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, and Kannada.
- **PWA Ready**: Works offline, installs on home screen, and updates in the background.
- **Robust Firebase Back-end**: Realtime data syncing, user authentication, and media storage integration.
- **Advanced Admin Panel**: Dedicated interface for moderation, configuration, and managing gamified achievements.

## Tech Stack

- **Frontend**: Semantic HTML5, Premium Vanilla CSS (custom design tokens, glassmorphism, dynamic variables, modern gradients), Modern ES6+ JavaScript.
- **Backend Services**: Firebase Authentication, Firestore Database, Firebase Storage.
- **PWA Tech**: Service Workers, Web App Manifest.
- **Deployment**: Vercel configuration provided.

## Getting Started

1. Set up your Firebase project and update `firebase-config.js` with your credentials.
2. Configure rules using `firestore.rules` and `storage.rules`.
3. To test locally:
   - Run a local server (e.g., using `serve.ps1` or `npx live-server`).
4. To deploy:
   - Deploy to Vercel or any static file hosting service.
