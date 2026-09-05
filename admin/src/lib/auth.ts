export interface AdminCredentials {
  username: string;
  password: string;
}

const DEFAULT_CREDENTIALS: AdminCredentials = {
  username: 'Richo@123',
  password: '123'
};

const STORAGE_KEYS = {
  SESSION: 'richo_auth_session',
  CREDENTIALS: 'richo_admin_credentials'
};

export function getAdminCredentials(): AdminCredentials {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.username && parsed.password) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading admin credentials from storage', e);
  }
  return DEFAULT_CREDENTIALS;
}

export function updateAdminCredentials(newUsername: string, newPassword: string): boolean {
  try {
    const creds: AdminCredentials = {
      username: newUsername.trim(),
      password: newPassword
    };
    localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(creds));
    
    // Update active session if user is logged in
    const session = getSessionUser();
    if (session) {
      localStorage.setItem(STORAGE_KEYS.SESSION, creds.username);
    }
    return true;
  } catch (e) {
    console.error('Error updating admin credentials', e);
    return false;
  }
}

export function authenticate(username: string, password: string): { success: boolean; error?: string } {
  const creds = getAdminCredentials();
  
  if (username.trim() === creds.username && password === creds.password) {
    localStorage.setItem(STORAGE_KEYS.SESSION, creds.username);
    return { success: true };
  }

  return { success: false, error: 'Invalid username or password. Please check your credentials.' };
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem(STORAGE_KEYS.SESSION));
}

export function getSessionUser(): string | null {
  return localStorage.getItem(STORAGE_KEYS.SESSION);
}
