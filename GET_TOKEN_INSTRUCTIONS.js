// Add this temporarily to your App.js or any component to get the token
// Run this in the browser console after the app loads:

// Method 1: Check localStorage
console.log('🔑 Token from localStorage:', localStorage.getItem('token') || localStorage.getItem('firebaseToken') || localStorage.getItem('authToken'));

// Method 2: Get from auth instance
import { auth } from './firebaseConfig';
auth.currentUser?.getIdToken().then(token => {
  console.log('🔑 Firebase Token:', token);
  // Copy this token
});

// Method 3: Check Network tab
// Open DevTools > Network > Filter by "user" > Look at any request > Copy the Authorization header (remove "Bearer " prefix)
