import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ApiService } from '@/services/api'
import { getFromStorage, setToStorage, removeFromStorage } from '@/utils'
import { useRouter } from 'vue-router'

interface User {
  id: string
  username: string
}

export const useAuthStore = defineStore('auth', () => {
    const router = useRouter()
  // State
  const user = ref<User | null>(getFromStorage('user', null))
  const session = ref<string | null>(getFromStorage('session', null))

  // Computed
  const isAuthenticated = computed(() => !!session.value && !!user.value)

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

  const register = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await ApiService.callConceptAction<
        { user: string; session: string } | { error: string }
      >('PasswordAuthentication', 'register', { username, password })

      if ('error' in response) {
        throw new Error(response.error || 'Registration failed')
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

  return {
    // State
    user,
    session,

    // Computed
    isAuthenticated,

    // Actions
    login,
    register,
    logout,
  }
})