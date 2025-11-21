import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // TODO: edit
  }),
  actions: {
    login(user) {
      this.user = user
    },
    logout() {
      this.user = null
    },
  },
})
