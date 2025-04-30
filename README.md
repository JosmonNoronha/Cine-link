CineLink
CineLink is a mobile application built with Expo React Native that allows users to explore, search, and manage their favorite movies and TV series. The app features a dynamic theme switcher (light/dark mode), OTA (over-the-air) updates, and a modern UI with animated components. It leverages the OMDB API for movie data and YouTube API for trailers.
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

Installation
Clone the Repository
git clone https://github.com/JosmonNoronha/Cine-link.git
cd CineLink

Install Dependencies
npm install

Set Up Environment Variables

Create a .env file in the root directory.
Add the following variables (replace with your actual keys):YOUTUBE_API_KEY=your_youtube_api_key
OMDB_API_KEY=your_omdb_api_key

Note: .env is gitignored to protect sensitive data.

Start the Development Server
npx expo start

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
