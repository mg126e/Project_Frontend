import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ApiService } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

/**
 * Store for OneRunMatching concept
 * 
 * NOTE: This store requires the following backend capabilities:
 * 1. Users must exist in OneRunMatching.users collection with a region
 * 2. Backend queries needed: _getInvitesForUser, _getInvite (or similar)
 * 3. Users should be auto-created when creating first invite, or registration method needed
 */

export interface Invite {
  _id: string
  sent: boolean
  start: string
  inviter: string
  invitees: string[]
  location: string
  distance: number
  acceptanceStatus: 'created' | 'pending' | 'accepted' | 'declined'
  region: string
}

export interface Run {
  _id: string
  userA: string
  userB: string
  completed: boolean
}

export const useOneRunMatchingStore = defineStore('oneRunMatching', () => {
  const authStore = useAuthStore()
  const getUserId = () => authStore.user?.id

  const invites = ref<Invite[]>([])
  const runs = ref<Run[]>([])
  const loading = ref(false)
  const error = ref('')

  // Create a new invite
  async function createInvite(params: {
    region: string
    start: string
    distance: number
    location: string
  }): Promise<{ invite: string } | { error: string }> {
    loading.value = true
    error.value = ''
    try {
      const userId = getUserId()
      if (!userId) {
        return { error: 'User not authenticated' }
      }

      const result = await ApiService.callConceptAction<{ invite: string } | { error: string }>(
        'OneRunMatching',
        'createInvite',
        {
          inviter: userId,
          ...params,
        }
      )

      if ('error' in result) {
        error.value = result.error
        return result
      }

      // Refresh invites after creating
      await fetchUserInvites()
      return result
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Failed to create invite'
      error.value = errMsg
      return { error: errMsg }
    } finally {
      loading.value = false
    }
  }

  // Send an invite
  async function sendInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    error.value = ''
    try {
      const result = await ApiService.callConceptAction<{} | { error: string }>(
        'OneRunMatching',
        'sendInvite',
        { invite: inviteId }
      )

      if ('error' in result) {
        error.value = result.error
        return { success: false, error: result.error }
      }

      // Refresh invites after sending
      await fetchUserInvites()
      return { success: true }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Failed to send invite'
      error.value = errMsg
      return { success: false, error: errMsg }
    } finally {
      loading.value = false
    }
  }

  // Delete an invite
  async function deleteInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    error.value = ''
    try {
      const userId = getUserId()
      if (!userId) {
        return { success: false, error: 'User not authenticated' }
      }

      const result = await ApiService.callConceptAction<{} | { error: string }>(
        'OneRunMatching',
        'deleteInvite',
        { user: userId, invite: inviteId }
      )

      if ('error' in result) {
        error.value = result.error
        return { success: false, error: result.error }
      }

      // Remove from local state
      invites.value = invites.value.filter((inv) => inv._id !== inviteId)
      return { success: true }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Failed to delete invite'
      error.value = errMsg
      return { success: false, error: errMsg }
    } finally {
      loading.value = false
    }
  }

  // Accept an invite
  async function acceptInvite(inviteId: string): Promise<{ scheduledRun: string } | { error: string }> {
    loading.value = true
    error.value = ''
    try {
      const userId = getUserId()
      if (!userId) {
        return { error: 'User not authenticated' }
      }

      // Fetch invite first to get the inviter
      const invite = await fetchInvite(inviteId)
      if (!invite) {
        return { error: 'Invite not found' }
      }

      const result = await ApiService.callConceptAction<{ scheduledRun: string } | { error: string }>(
        'OneRunMatching',
        'acceptInvite',
        {
          inviter: invite.inviter, // Backend signature requires inviter parameter
          invite: inviteId,
          accepter: userId,
        }
      )

      if ('error' in result) {
        error.value = result.error
        return result
      }

      // Refresh invites and runs after accepting
      await Promise.all([fetchUserInvites(), fetchMatches()])
      return result
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Failed to accept invite'
      error.value = errMsg
      return { error: errMsg }
    } finally {
      loading.value = false
    }
  }

  // Decline an invite
  async function declineInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    error.value = ''
    try {
      const userId = getUserId()
      if (!userId) {
        return { success: false, error: 'User not authenticated' }
      }

      const result = await ApiService.callConceptAction<{} | { error: string }>(
        'OneRunMatching',
        'declineInvite',
        { invite: inviteId, decliner: userId }
      )

      if ('error' in result) {
        error.value = result.error
        return { success: false, error: result.error }
      }

      // Refresh invites after declining
      await fetchUserInvites()
      return { success: true }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Failed to decline invite'
      error.value = errMsg
      return { success: false, error: errMsg }
    } finally {
      loading.value = false
    }
  }

  // Complete a run
  async function completeRun(runId: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    error.value = ''
    try {
      const userId = getUserId()
      if (!userId) {
        return { success: false, error: 'User not authenticated' }
      }

      const result = await ApiService.callConceptAction<{} | { error: string }>(
        'OneRunMatching',
        'completeRun',
        { user: userId, run: runId }
      )

      if ('error' in result) {
        error.value = result.error
        return { success: false, error: result.error }
      }

      // Refresh runs after completing
      await fetchMatches()
      return { success: true }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Failed to complete run'
      error.value = errMsg
      return { success: false, error: errMsg }
    } finally {
      loading.value = false
    }
  }

  // Cancel a run
  async function cancelRun(runId: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    error.value = ''
    try {
      const userId = getUserId()
      if (!userId) {
        return { success: false, error: 'User not authenticated' }
      }

      const result = await ApiService.callConceptAction<{} | { error: string }>(
        'OneRunMatching',
        'cancelRun',
        { initiator: userId, run: runId }
      )

      if ('error' in result) {
        error.value = result.error
        return { success: false, error: result.error }
      }

      // Remove from local state
      runs.value = runs.value.filter((run) => run._id !== runId)
      return { success: true }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Failed to cancel run'
      error.value = errMsg
      return { success: false, error: errMsg }
    } finally {
      loading.value = false
    }
  }

  // Fetch user's invites
  async function fetchUserInvites(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const userId = getUserId()
      if (!userId) {
        return
      }

      // Try to fetch invites from backend
      // Note: This requires backend to implement a query like _getInvitesForUser
      // For now, we'll try to use a helper query if available
      try {
        const result = await ApiService.callConceptAction<Invite[]>(
          'OneRunMatching',
          '_getInvitesForUser',
          { user: userId }
        )
        if (Array.isArray(result)) {
          invites.value = result
        }
      } catch (e) {
        // If query doesn't exist yet, we'll need to implement it in backend
        // For now, set empty array
        console.warn('Invites query not available yet, backend needs to implement _getInvitesForUser')
        invites.value = []
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch invites'
      invites.value = []
    } finally {
      loading.value = false
    }
  }

  // Fetch user's matches/runs
  async function fetchMatches(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const userId = getUserId()
      if (!userId) {
        return
      }

      const result = await ApiService.callConceptAction<Run[]>(
        'OneRunMatching',
        '_getMatches',
        { user: userId }
      )

      if (Array.isArray(result)) {
        runs.value = result
      } else {
        runs.value = []
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch matches'
      runs.value = []
    } finally {
      loading.value = false
    }
  }

  // Fetch invite by ID
  async function fetchInvite(inviteId: string): Promise<Invite | null> {
    try {
      // Try to fetch single invite
      // Note: This requires backend to implement a query like _getInvite
      try {
        const result = await ApiService.callConceptAction<Invite>(
          'OneRunMatching',
          '_getInvite',
          { invite: inviteId }
        )
        return result || null
      } catch (e) {
        // If query doesn't exist, try to find in existing invites
        return invites.value.find((inv) => inv._id === inviteId) || null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch invite'
      return null
    }
  }

  const pendingInvites = computed(() =>
    invites.value.filter((inv) => !inv.sent || inv.acceptanceStatus === 'pending')
  )

  const activeRuns = computed(() => runs.value.filter((run) => !run.completed))

  return {
    invites,
    runs,
    loading,
    error,
    pendingInvites,
    activeRuns,
    createInvite,
    sendInvite,
    deleteInvite,
    acceptInvite,
    declineInvite,
    completeRun,
    cancelRun,
    fetchUserInvites,
    fetchMatches,
    fetchInvite,
  }
})

