import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile, UserRole } from '../types';
import { auditService } from './auditService';

export const authService = {
  /**
   * Listen to Firebase auth state changes
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Log in user with Email and Password
   */
  async login(email: string, pass: string): Promise<UserProfile> {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const uid = userCredential.user.uid;
    const profile = await this.getUserProfile(uid);

    if (!profile) {
      throw new Error('User profile record not found in system database.');
    }

    if (profile.status === 'suspended' || profile.status === 'inactive') {
      await this.logout();
      throw new Error(`Account is currently ${profile.status}. Please contact system administrator.`);
    }

    // Real-time Audit History Log
    await auditService.logActivity({
      tenantId: profile.tenantId || 'CORE',
      userId: profile.uid,
      userName: profile.displayName || profile.email,
      userRole: profile.role,
      userEmail: profile.email,
      action: 'USER_LOGIN',
      actionCategory: 'AUTHENTICATION',
      details: `${profile.role} User '${profile.displayName || profile.email}' logged into portal`
    });

    return profile;
  },

  /**
   * Logout user and clear local session state
   */
  async logout(): Promise<void> {
    // Real-time Audit History Log
    await auditService.logActivity({
      action: 'USER_LOGOUT',
      actionCategory: 'AUTHENTICATION',
      details: `User signed out of active session`
    });

    await firebaseSignOut(auth);
    localStorage.removeItem('ilmifa_active_tenant');
    localStorage.removeItem('ilmifa_current_user');
  },

  /**
   * Send Firebase password reset email
   */
  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  /**
   * Fetch user document from users/{uid}
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.warn('Firestore fetch failed, checking localStorage backup for dev:', error);
      const local = localStorage.getItem(`user_profile_${uid}`);
      return local ? JSON.parse(local) : null;
    }
  },

  /**
   * Create or update user profile document
   */
  async setUserProfile(profile: UserProfile): Promise<void> {
    try {
      const docRef = doc(db, 'users', profile.uid);
      await setDoc(docRef, profile, { merge: true });
    } catch (err) {
      console.warn('Firestore setDoc failed, saving to localStorage backup:', err);
    }
    localStorage.setItem(`user_profile_${profile.uid}`, JSON.stringify(profile));
  }
};
