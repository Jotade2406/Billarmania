import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  staffBranchId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

function loadFromStorage(): Pick<AuthState, 'user' | 'token'> {
  try {
    const token = localStorage.getItem('bm_token');
    const raw = localStorage.getItem('bm_user');
    const user = raw ? (JSON.parse(raw) as AuthUser) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadFromStorage(),
  isAuthenticated: !!loadFromStorage().token,

  login(token, user) {
    localStorage.setItem('bm_token', token);
    localStorage.setItem('bm_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout() {
    localStorage.removeItem('bm_token');
    localStorage.removeItem('bm_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
