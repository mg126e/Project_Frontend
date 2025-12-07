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

      const result = await ApiService.callConceptAction<{ request?: string; runDoc?: { _id: string; userA: string; userB: string; completed: boolean }; scheduledRun?: string; error?: string }>(
        'OneRunMatching',
        'acceptInvite',
        {
          inviter: invite.inviter, // Backend signature requires inviter parameter
          invite: inviteId,
          accepter: userId,
        }
      )

      console.log('[OneRunMatching] acceptInvite response:', result)

      if (result?.error) {
        error.value = result.error
        return { error: result.error }
      }

      // Backend returns { request: '...', runDoc: { _id: '...', ... } }
      // Extract run ID from runDoc._id or use scheduledRun if present
      const runId = result?.runDoc?._id || result?.scheduledRun
      if (!runId) {
        error.value = 'Failed to get run ID from response'
        return { error: 'Failed to get run ID from response' }
      }

      // Automatically create a chat between the inviter and accepter
      try {
        await ApiService.callConceptAction<{ thread: string } | { error: string }>(
          'Messaging',
          'startChat',
          {
            userA: invite.inviter,
            userB: userId,
          }
        )
        // Chat creation is best-effort; we don't fail if it doesn't work
      } catch (e) {
        console.warn('Failed to create chat after accepting invite:', e)
        // Continue even if chat creation fails
      }

      // Refresh invites and runs after accepting
      // This ensures the accepted invite is removed from all users' received invites lists
      await Promise.all([fetchUserInvites(), fetchMatches()])
      
      // Also immediately remove the accepted invite from local state as a safeguard
      invites.value = invites.value.filter((inv) => {
        // Remove if it's the accepted invite, OR if it's a received invite that's now accepted
        if (inv._id === inviteId) {
          return false // Remove the invite that was just accepted
        }
        // Keep pending received invites, remove accepted/declined received invites
        if (inv.inviter !== userId && inv.invitees.includes(userId)) {
          return inv.acceptanceStatus === 'pending'
        }
        return true
      })
      
      // Return the run ID for navigation
      return { scheduledRun: runId }
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

  // Fetch user's invites (both created and received)
  // The backend _getInvitesForUser query now handles both:
  // - Created invites (where user is inviter)
  // - Received invites (where user is in invitees array and status is 'pending')
  async function fetchUserInvites(region?: string): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const userId = getUserId()
      if (!userId) {
        return
      }

      try {
        const result = await ApiService.callConceptAction<Invite[]>(
          'OneRunMatching',
          '_getInvitesForUser',
          { user: userId }
        )
        if (Array.isArray(result)) {
          invites.value = result
        } else {
          invites.value = []
        }
      } catch (e) {
        console.error('Failed to fetch invites:', e)
        error.value = e instanceof Error ? e.message : 'Failed to fetch invites'
        invites.value = []
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch invites'
      invites.value = []
    } finally {
      loading.value = false
    }
  }

  // Fetch active invites for the user's region
  // This should be called when navigating to one run matches view, especially after setting region
  // Uses getActiveInvitesForUser which filters by the user's region (users are auto-registered when they set location)
  async function fetchActiveInvites(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const userId = getUserId()
      if (!userId) {
        return
      }

      const result = await ApiService.callConceptAction<{ request?: string; invites?: Invite[] }>(
        'OneRunMatching',
        'getActiveInvitesForUser',
        { user: userId }
      )

      console.log('[OneRunMatching] fetchActiveInvites raw response:', result)
      console.log('[OneRunMatching] Current user ID:', userId)

      // Backend returns { request: "...", invites: [...] }
      // Extract invites array from response
      const invitesArray = result?.invites || (Array.isArray(result) ? result : [])
      
      console.log('[OneRunMatching] Extracted invites array:', invitesArray)
      console.log('[OneRunMatching] Invites array length:', invitesArray?.length)
      
      if (Array.isArray(invitesArray) && invitesArray.length > 0) {
        // Log each invite to see its structure
        invitesArray.forEach((inv, index) => {
          console.log(`[OneRunMatching] Invite ${index}:`, {
            _id: inv._id,
            inviter: inv.inviter,
            invitees: inv.invitees,
            sent: inv.sent,
            acceptanceStatus: inv.acceptanceStatus,
            userInInvitees: inv.invitees?.includes(userId)
          })
        })
        
        // Merge with existing invites, avoiding duplicates
        const existingIds = new Set(invites.value.map(inv => inv._id))
        const newInvites = invitesArray.filter(inv => !existingIds.has(inv._id))
        invites.value = [...invites.value, ...newInvites]
        console.log('[OneRunMatching] Total invites in store:', invites.value.length)
        console.log('[OneRunMatching] Added', newInvites.length, 'new active invites')
      } else {
        console.log('[OneRunMatching] No active invites found or invalid response structure')
      }
    } catch (e) {
      console.error('Failed to fetch active invites:', e)
      // Don't set error here as this is supplementary data
      // The main fetchUserInvites will handle errors
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

  // Fetch a single run by ID
  // Backend returns { invite: {...}, ... } with the invite included
  async function fetchRun(runId: string): Promise<Run | null> {
    try {
      // Try to fetch from backend if a query exists
      try {
        const result = await ApiService.callConceptAction<Run & { invite?: Invite }>(
          'OneRunMatching',
          '_getRun',
          { run: runId }
        )
        
        // If result includes invite, store it separately for easy access
        if (result && 'invite' in result && result.invite) {
          // Add invite to invites array if not already there
          const existingInvite = invites.value.find(inv => inv._id === result.invite!._id)
          if (!existingInvite) {
            invites.value.push(result.invite)
          }
        }
        
        // Return just the run part (without invite property)
        const { invite, ...run } = result || {}
        return run as Run || null
      } catch (e) {
        // If query doesn't exist, try to find in existing runs
        return runs.value.find((run) => run._id === runId) || null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch run'
      return null
    }
  }
  
  // Fetch run with invite - returns both run and invite
  // Backend returns { invite: {...} | null, ... } or { error: string }
  // invite will be null if user is not a participant in the run
  // start is ISO 8601 string - parse with new Date(start)
  async function fetchRunWithInvite(runId: string): Promise<{ run: Run; invite: Invite | null; error?: string } | null> {
    try {
      const result = await ApiService.callConceptAction<{ invite?: Invite | null; runDoc?: Run; request?: string; error?: string } & Run>(
        'OneRunMatching',
        '_getRun',
        { run: runId }
      )
      
      // Check for error in response
      if (result && 'error' in result && result.error) {
        console.error('[OneRunMatching] Error fetching run:', result.error)
        // If there's an error, we might still have a run object
        const { error, invite, runDoc, request, ...rest } = result
        const run = (runDoc || rest) as Run
        return { run, invite: invite || null, error: result.error }
      }
      
      if (!result) {
        console.error('[OneRunMatching] No result returned from _getRun')
        return null
      }
      
      // Backend may return:
      // - {runDoc: {...}, invite: {...}} 
      // - {request: '...', invite: {...}}
      // - {invite: {...}, ...} (where other fields are the run)
      // Extract runDoc if present, otherwise use result directly (excluding invite, request, error)
      const { invite, error, runDoc, request, ...rest } = result
      const runData = (runDoc || rest) as Run
      
      // Log the full response structure to debug
      console.log('[OneRunMatching] Response structure:', {
        hasInvite: 'invite' in result,
        inviteValue: invite,
        hasRunDoc: 'runDoc' in result,
        runDocValue: runDoc,
        allKeys: Object.keys(result)
      })
      
      // Ensure invite.start is parsed correctly if invite exists
      let processedInvite: Invite | null = null
      if (invite) {
        // Parse ISO 8601 date string if needed (it should already be a string)
        processedInvite = {
          ...invite,
          start: typeof invite.start === 'string' ? invite.start : new Date(invite.start).toISOString()
        }
        
        // Store invite in invites array if present and not null
        const existingInvite = invites.value.find(inv => inv._id === processedInvite!._id)
        if (!existingInvite) {
          invites.value.push(processedInvite)
        }
      }
      
      return {
        run: runData,
        invite: processedInvite,
        error: error
      }
    } catch (e) {
      console.error('Failed to fetch run with invite:', e)
      return null
    }
  }

  // Find the invite associated with a run
  // The invite should have status "accepted" and match the run's users
  async function findInviteForRun(run: Run): Promise<Invite | null> {
    try {
      const userId = getUserId()
      if (!userId) return null

      // First, try to get invite from backend using run ID
      try {
        const result = await ApiService.callConceptAction<Invite | { invite?: Invite; error?: string }>(
          'OneRunMatching',
          '_getInviteForRun',
          { run: run._id }
        )
        if (result && !('error' in result)) {
          console.log('[OneRunMatching] Found invite from backend for run:', run._id)
          console.log('[OneRunMatching] Raw result from _getInviteForRun:', result)
          console.log('[OneRunMatching] Result has invite key?', 'invite' in result)
          // Backend may return {invite: {...}} or just the invite directly
          const invite = ('invite' in result && result.invite) ? result.invite : (result as Invite)
          console.log('[OneRunMatching] Extracted invite:', invite)
          return invite
        }
      } catch (e) {
        console.log('[OneRunMatching] _getInviteForRun not available, trying local search')
      }

      // Fallback: Fetch all invites and search locally
      await fetchUserInvites()

      // Look for an accepted invite where:
      // - The inviter is userA and userB is in invitees, OR
      // - The inviter is userB and userA is in invitees
      // - Status is "accepted" (or any status if we can't find accepted)
      let matchingInvite = invites.value.find((inv) => {
        if (inv.acceptanceStatus !== 'accepted') return false
        // Check if invite matches the run's users
        return (
          (inv.inviter === run.userA && inv.invitees.includes(run.userB)) ||
          (inv.inviter === run.userB && inv.invitees.includes(run.userA))
        )
      })

      // If not found with accepted status, try any status
      if (!matchingInvite) {
        matchingInvite = invites.value.find((inv) => {
          // Check if invite matches the run's users (any status)
          return (
            (inv.inviter === run.userA && inv.invitees.includes(run.userB)) ||
            (inv.inviter === run.userB && inv.invitees.includes(run.userA))
          )
        })
      }

      return matchingInvite || null
    } catch (e) {
      console.error('Error finding invite for run:', e)
      return null
    }
  }

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
    fetchActiveInvites,
    fetchMatches,
    fetchInvite,
    fetchRun,
    fetchRunWithInvite,
    findInviteForRun,
  }
})

