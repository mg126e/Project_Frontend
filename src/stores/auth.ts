import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ApiService } from '@/services/api'
import { getFromStorage, setToStorage, removeFromStorage } from '@/utils'
import { useRouter } from 'vue-router'

interface User {
  id: string
  username: string
  email?: string
}

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()
  // State
  const user = ref<User | null>(null)
  const session = ref<string | null>(null)
  const ready = ref(false)

  // Computed
  const isAuthenticated = computed(() => !!session.value && !!user.value)

  // Initialize auth state from storage (async for future extensibility)
  async function init() {
    user.value = getFromStorage('user', null)
    session.value = getFromStorage('session', null)
    ready.value = true
  }

  // Actions
const login = async (username: string, password: string): Promise<boolean> => {
  try {
    const response = await ApiService.post<
      { user: string; session: string } | { error: string }
    >('/PasswordAuthentication/authenticate', { username, password })


    if ('error' in response) {
      return false
    }

    const { user: userId, session: sessionToken } = response
    const userData = {
      id: userId,
      username: username,
    }

    user.value = userData
    session.value = sessionToken
    setToStorage('user', userData)
    setToStorage('session', sessionToken)

    return true
  } catch (error) {
    return false
  }
}

const register = async (username: string, password: string, email?: string): Promise<boolean> => {
  try {
    const response = await ApiService.post<
      { user: string; session: string } | { error: string }
    >('/PasswordAuthentication/register', {
      username,
      password,
      ...(email ? { email } : {}),
    })

    if ('error' in response) {
      throw new Error(response.error || 'Registration failed')
    }

    const { user: userId, session: sessionToken } = response
    const userData = {
      id: userId,
      username: username,
      ...(email ? { email } : {}),
    }

    user.value = userData
    session.value = sessionToken
    setToStorage('user', userData)
    setToStorage('session', sessionToken)

    // Profile is auto-created by backend sync, just fetch it
    try {
      const { useProfileStore } = await import('@/stores/profile');
      const profileStore = useProfileStore();
      await profileStore.fetchProfile();
    } catch (e) {
      console.error('Failed to fetch profile after registration:', e);
    }

    return true
  } catch (error) {
    throw error
  }
}

const logout = async () => {
  try {
    if (session.value) {
      await ApiService.post('/logout', { session: session.value })
    }
  } catch (e) {
    console.error('Logout error:', e)
  } finally {
    user.value = null
    session.value = null
    removeFromStorage('user')
    removeFromStorage('session')
    
    if (router.currentRoute.value.path !== '/login') {
      await router.push('/login')
    }
  }
}

const changePassword = async (oldPassword: string, newPassword: string): Promise<true | string> => {
  try {
    if (!session.value) {
      return 'Session not found.';
    }
    const response = await ApiService.post<any>(
      '/PasswordAuthentication/changePassword', {
      session: session.value,
      oldPassword,
      newPassword,
    });
    
    if (response && response.error) {
      return response.error;
    }
    return true;
  } catch (error: any) {
    return error?.message || 'Failed to change password.';
  }
};

  const deleteUser = async (): Promise<true | string> => {
    try {
      if (!user.value?.id) {
        return 'User not found.';
      }
      if (!session.value) {
        return 'Session not found. Please log out and log in again.';
      }
      // Call closeProfile which triggers backend sync to delete user from PasswordAuthentication
      const { useProfileStore } = await import('@/stores/profile');
      const profileStore = useProfileStore();
      await profileStore.closeProfile();
      
      // After closing profile, the backend will delete the user
      // So we need to log out
      await logout();
      return true;
    } catch (error: any) {
      return error?.message || 'Failed to delete account.';
    }
  };

  return {
    // State
    user,
    session,
    ready,

    // Computed
    isAuthenticated,

    // Actions
    login,
    register,
    logout,
    changePassword,
    deleteUser,
    init
  }
})