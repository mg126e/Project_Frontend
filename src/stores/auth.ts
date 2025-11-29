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
      const response = await ApiService.callConceptAction<
        { user: string; session: string } | { error: string }
      >('PasswordAuthentication', 'authenticate', { username, password })

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
      const response = await ApiService.callConceptAction<
        { user: string; session: string } | { error: string }
      >('PasswordAuthentication', 'register', {
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

      // Fetch user profile after registration (auto-creates if missing)
      try {
        // Dynamically import to avoid circular dependency
        const { useProfileStore } = await import('@/stores/profile');
        const profileStore = useProfileStore();
        await profileStore.fetchProfile();
      } catch (e) {
        // Log but do not block registration if profile fetch/creation fails
        console.error('Failed to fetch/create profile after registration:', e);
      }

      return true
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    // Redirect to login page first
    if (router.currentRoute.value.path !== '/login') {
      await router.push('/login')
    }
    // Now clear user/session after navigation
    user.value = null
    session.value = null
    removeFromStorage('user')
    removeFromStorage('session')
  }

  const changePassword = async (oldPassword: string, newPassword: string): Promise<true | string> => {
    try {
      if (!user.value?.id) {
        return 'User not found.';
      }
      const response = await ApiService.callConceptAction<any>(
        'PasswordAuthentication', 'changePassword', {
        user: user.value.id,
        oldPassword,
        newPassword,
      });
      // Accept various success shapes, or empty/undefined response
      if (
        response === undefined || response === null ||
        (typeof response === 'object' && (
          Object.keys(response).length === 0 ||
          response.success === true ||
          response.result === 'ok' ||
          response.status === 'success')
        ) ||
        (typeof response === 'string' && response.toLowerCase().includes('success'))
      ) {
        return true;
      }
      if (response && typeof response === 'object' && response.error) {
        return response.error;
      }
      return 'Failed to change password.';
    } catch (error: any) {
      return error?.message || 'Failed to change password.';
    }
  };

  const deleteUser = async (): Promise<true | string> => {
    try {
      if (!user.value?.id) {
        return 'User not found.';
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