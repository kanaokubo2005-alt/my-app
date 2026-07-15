import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import type { User } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCz95bnLyrhNVxMQFSg6W2IyUV98ZD9uBo",
  authDomain: "todone-1ae64.firebaseapp.com",
  projectId: "todone-1ae64",
  storageBucket: "todone-1ae64.firebasestorage.app",
  messagingSenderId: "762075929612",
  appId: "1:762075929612:web:5ea6e46c4f42f02aa76229",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Calendar permission is requested separately after login, so users see a
// dedicated consent screen explaining why it is needed.
provider.addScope("https://www.googleapis.com/auth/userinfo.profile");
provider.addScope("https://www.googleapis.com/auth/userinfo.email");

// Force select account
provider.setCustomParameters({
  prompt: "select_account",
});

export const initAuth = (
  onAuthSuccess?: (user: User) => void,
  onAuthFailure?: () => void,
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (token) {
      localStorage.setItem("todone_google_token", token);
    }
    return result.user;
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  }
};

export const logout = async () => {
  localStorage.removeItem("todone_google_token");
  await signOut(auth);
};

export const getFirebaseToken = async (): Promise<string | null> => {
  return auth.currentUser ? await auth.currentUser.getIdToken() : null;
};
