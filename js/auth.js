/**
 * Supabase Auth Client
 * Handles OAuth flow, session management, and user state
 */

const SUPABASE_URL = 'https://ijsvnrzlzzqfvcvysbjp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc3ZucnpsenpxZnZjdnlzYmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3MTc4MDAsImV4cCI6MTc0NjM0OTgwMH0.A1fTxPx8LQnnvOvqzTLF-y-hDLy1phSWJR3aW45QJho';
const SESSION_KEY = 'sb_auth_session';
const USER_KEY = 'sb_auth_user';

class SupabaseAuth {
  constructor() {
    this.session = this.getSession();
    this.user = this.getUser();
  }

  /**
   * Get stored session from localStorage
   */
  getSession() {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get stored user from localStorage
   */
  getUser() {
    try {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.session && !!this.user;
  }

  /**
   * Extract auth data from URL fragment (OAuth callback)
   * Supabase returns: #access_token=xxx&token_type=bearer&expires_in=3600&refresh_token=yyy&type=recovery
   */
  async handleOAuthCallback() {
    try {
      const hash = window.location.hash;
      if (!hash) {
        // No hash, return false
        return false;
      }

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken) {
        return false;
      }

      console.log('OAuth token found in URL, processing...');

      // Store session
      const session = {
        accessToken,
        refreshToken,
        expiresIn: params.get('expires_in'),
        expiresAt: Date.now() + (parseInt(params.get('expires_in')) * 1000),
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      console.log('Session stored');

      // Fetch user info from Supabase
      const success = await this.fetchUserProfile(accessToken);
      
      if (success) {
        // Clear hash from URL without reloading
        console.log('Clearing URL hash');
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        
        // Reload auth state
        this.session = this.getSession();
        this.user = this.getUser();
        console.log('Auth state reloaded, user:', this.user?.email);
      }
      
      return success;
    } catch (e) {
      console.error('OAuth callback error:', e);
      return false;
    }
  }

  /**
   * Fetch authenticated user's profile from Supabase
   */
  async fetchUserProfile(accessToken) {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const user = await response.json();

      // Store user
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      this.user = user;
      this.session = this.getSession();

      return true;
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
      return false;
    }
  }

  /**
   * Sign out user
   */
  logout() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    this.session = null;
    this.user = null;
  }

  /**
   * Get user's display name
   */
  getDisplayName() {
    if (!this.user) {
      console.log('getDisplayName: No user object');
      return 'User';
    }
    
    const name = this.user.user_metadata?.name || this.user.email || 'User';
    console.log('getDisplayName:', {
      name,
      has_metadata: !!this.user.user_metadata,
      metadata_name: this.user.user_metadata?.name,
      email: this.user.email
    });
    return name;
  }

  /**
   * Get user's avatar URL
   */
  getAvatarUrl() {
    if (!this.user) return null;
    return this.user.user_metadata?.avatar_url || null;
  }

  /**
   * Get user ID
   */
  getUserId() {
    return this.user?.id || null;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseAuth;
}
