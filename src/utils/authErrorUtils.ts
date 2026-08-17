/**
 * Formats Firebase Auth error codes into clean, professional, high-class English error messages.
 * Eliminates technical jargon like "Firebase: Error (auth/user-not-found)" or "invalid-credential".
 */
export function formatAuthErrorMessage(err: unknown, madrasaName?: string): string {
  const code = (err as any)?.code || '';
  const rawMessage = err instanceof Error ? err.message : String(err || '');

  // 1. Unregistered Email / User Not Found
  if (code === 'auth/user-not-found' || rawMessage.includes('user-not-found')) {
    return `This email is not registered with ${madrasaName ? madrasaName : 'this Madrasa'}. Please double-check your email or contact your Administrator to register your account.`;
  }

  // 2. Invalid Credentials / Wrong Password / Unregistered
  if (code === 'auth/invalid-credential' || rawMessage.includes('invalid-credential')) {
    return `Invalid email or password. If your email is not registered yet, please contact your ${madrasaName ? madrasaName : 'Madrasa'} Administrator to create your account.`;
  }

  // 3. Wrong Password
  if (code === 'auth/wrong-password' || rawMessage.includes('wrong-password')) {
    return `Incorrect password. Please verify your password and try again, or click "Forgot Password?" below to reset it.`;
  }

  // 4. Too Many Requests / Security Lockout
  if (code === 'auth/too-many-requests' || rawMessage.includes('too-many-requests')) {
    return `Account temporarily locked due to multiple failed login attempts. Please wait a few minutes and try again.`;
  }

  // 5. Invalid Email format
  if (code === 'auth/invalid-email' || rawMessage.includes('invalid-email')) {
    return `Please enter a valid email address format (e.g. user@domain.com).`;
  }

  // 6. User Account Disabled
  if (code === 'auth/user-disabled' || rawMessage.includes('user-disabled')) {
    return `Your account has been deactivated. Please contact your Madrasa Administrator for support.`;
  }

  // Clean raw "Firebase:" prefix for any unexpected error
  if (rawMessage.includes('Firebase:')) {
    const cleaned = rawMessage
      .replace(/^Firebase:\s*/i, '')
      .replace(/\(auth\/[a-z-]+\)\.?/i, '')
      .trim();
    return cleaned || 'Invalid login credentials.';
  }

  return rawMessage || 'Invalid login credentials.';
}
