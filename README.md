# CineLink

> **🔒 SECURITY NOTICE**: If you cloned or forked this repository before January 31, 2026, please read [SECURITY_INSTRUCTIONS.md](SECURITY_INSTRUCTIONS.md) immediately. API keys were previously exposed and must be rotated.

CineLink is a mobile application built with Expo React Native that allows users to explore, search, and manage their favorite movies and TV series. The app features a dynamic theme switcher (light/dark mode), OTA (over-the-air) updates, and a modern UI with animated components. It leverages the TMDB API for movie data and has a Node.js backend for caching and user management.
Features

Movie & Series Exploration: Browse trending movies, popular hits, and personalized recommendations.
Details Screen: View detailed information, including plots, ratings, and episode lists for series.
Favorites Management: Add or remove movies/series to a favorites list.
Trailer Playback: Watch official trailers using YouTube integration.
Theme Customization: Switch between light and dark themes with a polished settings interface.
OTA Updates: Receive app updates without app store submissions (via Expo EAS).
Responsive Design: Optimized for both iOS and Android with smooth animations.

Prerequisites

Node.js (v14 or later)
Expo CLI (npm install -g expo-cli or npm install -g @expo/cli)
Git
An OMDB API key (for movie data)
A YouTube API key (for trailers, stored in a .env file)

## Installation

### ⚠️ Security First!

**CRITICAL**: This project previously had exposed API keys. If you're a collaborator or forking this repo, please read [SECURITY_INSTRUCTIONS.md](SECURITY_INSTRUCTIONS.md) immediately.

### Prerequisites

- Node.js (v14 or later)
- Expo CLI (npm install -g expo-cli or npm install -g @expo/cli)
- Git
- A TMDB API key (for backend - [Get it here](https://www.themoviedb.org/settings/api))
- An OMDB API key (optional - [Get it here](http://www.omdbapi.com/apikey.aspx))
- Firebase project ([Create one here](https://console.firebase.google.com/))

### Clone the Repository

```bash
git clone https://github.com/JosmonNoronha/Cine-link.git
cd CineLink
```

### Install Dependencies

```bash
npm install
```

> **Note**: The backend is deployed separately to Render. For local backend development, clone the [backend repository](https://github.com/JosmonNoronha/CineLink-backend-N) separately.

### Set Up Environment Variables

#### Frontend Setup

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:

   ```bash
   # Get these from Firebase Console → Project Settings
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   FIREBASE_MEASUREMENT_ID=your_measurement_id

   # Get from http://www.omdbapi.com/apikey.aspx
   OMDB_API_KEY=your_omdb_api_key

   # Backend URL (deployed to Render)
   EXPO_PUBLIC_API_BASE_URL=https://your-backend-url.onrender.com/api
   EXPO_PUBLIC_PRODUCTION_API_URL=https://your-backend-url.onrender.com/api
   ```

3. **Never commit your `.env` file!** It's already in `.gitignore`.

#### Backend Setup (Optional - for local development only)

The backend is deployed separately to Render. If you want to run it locally:

1. Clone the backend repository:

   ```bash
   git clone https://github.com/JosmonNoronha/CineLink-backend-N.git backend
   cd backend
   npm install
   cp .env.example .env
   ```

2. Follow the backend repository's README for setup instructions.

### Start the Development Server

```bash
npx expo start
```

The app will connect to the backend deployed on Render.

> **Local Backend (Optional)**: If you cloned the backend repo and want to test locally, start it with `cd backend && npm run dev` and update your `.env` to use `http://localhost:5001/api`.

Use the Expo Go app on your mobile device or an emulator to run the app.
Press a to open in an Android emulator, i for iOS simulator, or scan the QR code with Expo Go.

Usage

Home Screen: Explore trending movies, popular hits, and personalized suggestions.
Search Screen: Search for movies or series (implement search functionality in SearchScreen.js if not already done).
Details Screen: Tap a movie/series to view details, add to favorites, or watch a trailer.
Favorites Screen: View and manage your favorite items.
Settings Screen: Toggle dark/light theme and check for app updates.

Project Structure
CineLink/
├── assets/ # Static assets (images, etc.)
├── components/ # Reusable UI components (e.g., MovieCard, ShimmerMovieCard)
├── contexts/ # Context providers (e.g., ThemeContext)
├── screens/ # Screen components (e.g., HomeScreen, SettingsScreen)
├── services/ # API service logic
├── utils/ # Utility functions (e.g., storage)
├── App.js # Main app entry point
├── app.json # Expo configuration
├── package.json # Project dependencies and scripts
└── .gitignore # Ignored files (e.g., node_modules, .env)

Building and Deploying
Build for Production
eas build -p android
eas build -p ios

Follow Expo’s documentation for app store submission.

Push OTA Updates
eas update --branch production --message "Your update description"

Contributing

Fork the repository.
Create a new branch (git checkout -b feature/your-feature).
Make your changes and commit them (git commit -m "Add your feature").
Push to the branch (git push origin feature/your-feature).
Open a pull request.

License
This project is licensed under the MIT License - see the LICENSE file for details.
Acknowledgments

Expo for the React Native framework.
OMDB API for movie data.
YouTube API for trailer integration.
React Native Community for libraries and support.

Contact
For questions or support, reach out to Josmon Noronha at josmonnoronha2004@gmail.com.

---

## Backend API (Render)

This repo now includes a Node/Express backend in the `backend/` folder that the mobile app can talk to at `/api/*`.

### Deploy on Render

- This repo includes a Render Blueprint at [render.yaml](render.yaml).
- In Render: **New +** → **Blueprint** → select the repo → apply.

### Required environment variables (Render)

- `TMDB_API_KEY` (required)

### Optional environment variables

- `CORS_ORIGIN` (comma-separated allowlist; empty means allow all)
- `REDIS_URL` (enables Redis cache)
- `SENTRY_DSN` and `SENTRY_TRACES_SAMPLE_RATE`

### Firebase Admin (required only for `/api/user/*` routes)

Pick one option:

- `FIREBASE_SERVICE_ACCOUNT_JSON` (recommended; paste the service account JSON as a single env var)

OR

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (replace newlines with `\n`)

If you don’t set Firebase Admin credentials, unauthenticated endpoints (like `/api/health` and movie/search endpoints) still work, but `/api/user/*` will fail.
