<template>
  <section class="scheduled-run-page">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading run details...</p>
    </div>

    <div v-else-if="error" class="error-banner">
      {{ error }}
    </div>

    <div v-else-if="!run" class="empty-state">
      <p>Run not found.</p>
    </div>

    <div v-else class="run-details">
      <h1>Scheduled Run</h1>

      <div v-if="invite" class="invite-info-card">
        <h2>Run Details</h2>
        <div class="run-info-grid">
          <div class="info-item">
            <strong>Date & Time:</strong>
            <p>{{ formatDate(invite.start) }}</p>
          </div>
          <div class="info-item">
            <strong>Distance:</strong>
            <p>{{ invite.distance }} miles</p>
          </div>
          <div class="info-item">
            <strong>Location:</strong>
            <p>{{ invite.location }}</p>
          </div>
          <div class="info-item">
            <strong>Region:</strong>
            <p>{{ invite.region }}</p>
          </div>
        </div>
      </div>

      <div v-else class="invite-info-card">
        <h2>Run Details</h2>
        <p style="color: var(--color-secondary);">Run information is being loaded. You can still view and manage the run below.</p>
      </div>

      <div class="run-partners">
        <h2>Running Partners</h2>
        <div class="partners-list">
          <div class="partner-item">
            <span class="partner-label">Partner 1:</span>
            <span class="partner-name">{{ userAName }}<span v-if="userAUsername" class="partner-username"> ({{ userAUsername }})</span></span>
            <span v-if="run.userA === currentUserId" class="partner-badge">(You)</span>
          </div>
          <div class="partner-item">
            <span class="partner-label">Partner 2:</span>
            <span class="partner-name">{{ userBName }}<span v-if="userBUsername" class="partner-username"> ({{ userBUsername }})</span></span>
            <span v-if="run.userB === currentUserId" class="partner-badge">(You)</span>
          </div>
        </div>
      </div>

      <div class="run-actions">
        <button 
          @click="handleGoToMessages" 
          class="btn-messages"
          :disabled="loadingThread"
        >
          {{ loadingThread ? 'Loading...' : 'Message Partner' }}
        </button>
        <button 
          v-if="!run.completed && canCompleteRun" 
          @click="handleCompleteRun" 
          class="btn-complete"
          :disabled="completingRun"
        >
          {{ completingRun ? 'Completing...' : 'Complete Run' }}
        </button>
        <button 
          v-if="!run.completed" 
          @click="handleCancelRun" 
          class="btn-cancel"
          :disabled="cancellingRun"
        >
          {{ cancellingRun ? 'Cancelling...' : 'Cancel Run' }}
        </button>
        <div v-if="run.completed" class="completed-badge">
          ✓ Run Completed
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOneRunMatchingStore, type Run, type Invite } from '../stores/oneRunMatching'
import { useAuthStore } from '../stores/auth'
import { ApiService } from '../services/api'

const route = useRoute()
const router = useRouter()
const oneRunStore = useOneRunMatchingStore()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref('')
const run = ref<Run | null>(null)
const invite = ref<Invite | null>(null)
const completingRun = ref(false)
const cancellingRun = ref(false)
const loadingThread = ref(false)
const userAName = ref('Loading...')
const userBName = ref('Loading...')
const userAUsername = ref('')
const userBUsername = ref('')

const currentUserId = computed(() => authStore.user?.id || '')

const otherUserId = computed(() => {
  if (!run.value || !currentUserId.value) return null
  return run.value.userA === currentUserId.value ? run.value.userB : run.value.userA
})

// Check if the run date is today or has passed (can complete run)
const canCompleteRun = computed(() => {
  if (!invite.value || !invite.value.start) return false
  try {
    const runDate = new Date(invite.value.start)
    const now = new Date()
    // Set both to start of day for comparison
    const runDateOnly = new Date(runDate.getFullYear(), runDate.getMonth(), runDate.getDate())
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    // Allow completion if it's the same day or later
    return todayOnly >= runDateOnly
  } catch {
    return false
  }
})

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

async function loadRunData() {
  loading.value = true
  error.value = ''
  try {
    const runId = route.params.id as string
    if (!runId) {
      error.value = 'Run ID not provided'
      loading.value = false
      return
    }

    // Fetch the run with invite - backend returns both in the response
    // invite will be null if user is not a participant in the run
    const result = await oneRunStore.fetchRunWithInvite(runId)
    if (!result || !result.run) {
      error.value = result?.error || 'Run not found'
      console.error('[ScheduledRunView] Run not found:', runId, result?.error)
      loading.value = false
      return
    }
    
    // Check for error in response
    if (result.error) {
      error.value = result.error
      console.warn('[ScheduledRunView] Error in response:', result.error)
    }
    
    run.value = result.run
    
    console.log('[ScheduledRunView] Result invite:', result.invite)
    console.log('[ScheduledRunView] Result invite type:', typeof result.invite)
    console.log('[ScheduledRunView] Result invite is null?', result.invite === null)
    console.log('[ScheduledRunView] Result invite is undefined?', result.invite === undefined)
    
    // Set loading to false immediately so buttons work
    loading.value = false
    
    // If invite is null, try to find it separately
    if (result.invite) {
      console.log('[ScheduledRunView] Setting invite from response:', result.invite)
      invite.value = result.invite
    } else {
      // Try to find the invite associated with this run
      console.log('[ScheduledRunView] Invite not in response, searching for invite...')
      oneRunStore.findInviteForRun(result.run).then(foundInvite => {
        if (foundInvite) {
          console.log('[ScheduledRunView] Found invite:', foundInvite)
          // Backend may return {invite: {...}} or just the invite directly
          const inviteData = ('invite' in foundInvite && foundInvite.invite) ? foundInvite.invite : foundInvite
          // Ensure invite.start is a string (ISO 8601 format)
          const processedInvite = {
            ...inviteData,
            start: typeof inviteData.start === 'string' ? inviteData.start : new Date(inviteData.start).toISOString()
          }
          console.log('[ScheduledRunView] Setting processed invite:', processedInvite)
          invite.value = processedInvite as Invite
        } else {
          console.log('[ScheduledRunView] No invite found for this run')
        }
      }).catch(e => {
        console.warn('[ScheduledRunView] Error finding invite:', e)
      })
    }

    // Fetch display names for both users (don't block on this)
    // Only fetch if userA and userB are defined
    if (result.run?.userA && result.run?.userB) {
      fetchUserNames(result.run.userA, result.run.userB).catch(e => {
        console.warn('[ScheduledRunView] Failed to fetch user names:', e)
      })
    } else {
      console.warn('[ScheduledRunView] Cannot fetch user names - userA or userB is missing', {
        userA: result.run?.userA,
        userB: result.run?.userB
      })
    }
  } catch (e) {
    console.error('[ScheduledRunView] Error loading run data:', e)
    error.value = e instanceof Error ? e.message : 'Failed to load run details'
    loading.value = false
  }
}

async function fetchUserNames(userAId: string, userBId: string) {
  try {
    // Fetch both displayname and username for each user
    const results = await Promise.allSettled([
      ApiService.callConceptAction<{ displayname: string } | { error: string }>('UserProfile', '_getDisplayName', { user: userAId }),
      ApiService.callConceptAction<{ displayname: string } | { error: string }>('UserProfile', '_getDisplayName', { user: userBId }),
      ApiService.callConceptAction<{ username: string } | { error: string }>('PasswordAuthentication', '_getUsername', { user: userAId }),
      ApiService.callConceptAction<{ username: string } | { error: string }>('PasswordAuthentication', '_getUsername', { user: userBId })
    ])

    // Handle userA displayname
    if (results[0].status === 'fulfilled') {
      const result = results[0].value
      if ('error' in result) {
        console.warn('Failed to get display name for user A:', result.error)
        userAName.value = userAId
      } else {
        userAName.value = result.displayname
      }
    } else {
      console.error('Failed to fetch display name for user A:', results[0].reason)
      userAName.value = userAId
    }

    // Handle userB displayname
    if (results[1].status === 'fulfilled') {
      const result = results[1].value
      if ('error' in result) {
        console.warn('Failed to get display name for user B:', result.error)
        userBName.value = userBId
      } else {
        userBName.value = result.displayname
      }
    } else {
      console.error('Failed to fetch display name for user B:', results[1].reason)
      userBName.value = userBId
    }

    // Handle userA username
    if (results[2].status === 'fulfilled') {
      const result = results[2].value
      if (!('error' in result)) {
        userAUsername.value = result.username
      }
    }

    // Handle userB username
    if (results[3].status === 'fulfilled') {
      const result = results[3].value
      if (!('error' in result)) {
        userBUsername.value = result.username
      }
    }
  } catch (e) {
    console.error('Failed to fetch user names:', e)
    userAName.value = userAId
    userBName.value = userBId
  }
}

async function handleCompleteRun() {
  if (!run.value || completingRun.value) return
  
  // Check if run date has passed
  if (!canCompleteRun.value) {
    alert('Cannot complete run until after the scheduled date and time.')
    return
  }
  
  if (!confirm('Mark this run as completed?')) return
  
  completingRun.value = true
  try {
    const result = await oneRunStore.completeRun(run.value._id)
    if (!result.success && result.error) {
      alert(result.error)
    } else {
      // Refresh run data
      await loadRunData()
    }
  } finally {
    completingRun.value = false
  }
}

async function handleCancelRun() {
  if (!run.value || cancellingRun.value) return
  
  if (!confirm('Are you sure you want to cancel this run?')) return
  
  cancellingRun.value = true
  try {
    const result = await oneRunStore.cancelRun(run.value._id)
    if (!result.success && result.error) {
      alert(result.error)
    } else {
      // Navigate back to one-time run matching page
      router.push({ name: 'run-buddy-finder' })
    }
  } finally {
    cancellingRun.value = false
  }
}

async function handleGoToMessages() {
  if (!run.value || !currentUserId.value || !otherUserId.value || loadingThread.value) return

  loadingThread.value = true
  try {
    // Get or create the thread between the two users
    // startChat returns existing thread if it exists, or creates a new one
    const result = await ApiService.callConceptAction<{ thread: string } | { error: string }>(
      'Messaging',
      'startChat',
      {
        userA: currentUserId.value,
        userB: otherUserId.value,
      }
    )

    if ('error' in result) {
      alert(`Failed to open chat: ${result.error}`)
      return
    }

    // Navigate to messages page with the thread ID in query params
    router.push(`/messages?thread=${result.thread}`)
  } catch (e) {
    console.error('Failed to get thread:', e)
    alert('Failed to open chat. Please try again.')
  } finally {
    loadingThread.value = false
  }
}

onMounted(() => {
  loadRunData()
})
</script>

<style scoped>
.scheduled-run-page {
  max-width: 900px;
  margin: 2rem auto;
  background: #F9FAFB;
  border-radius: 24px;
  padding: 3rem 4rem;
}

.loading-state {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-primary-border);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-banner {
  background: var(--color-error-bg);
  color: var(--color-error);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-secondary);
  font-size: 1.1rem;
}

.run-details h1 {
  color: var(--color-primary);
  font-size: 2rem;
  margin-bottom: 2rem;
}

.invite-info-card {
  background: #fff;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.invite-info-card h2 {
  color: var(--color-primary);
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.run-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item strong {
  color: var(--color-primary);
  font-weight: 600;
  font-size: 0.95rem;
}

.info-item p {
  color: var(--color-secondary);
  font-size: 1.1rem;
  margin: 0;
}

.run-partners {
  background: #fff;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.run-partners h2 {
  color: var(--color-primary);
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.partners-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.partner-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-primary-light);
  border-radius: 8px;
}

.partner-label {
  font-weight: 600;
  color: var(--color-primary);
}

.partner-name {
  color: var(--color-secondary);
  font-size: 1.1rem;
}

.partner-username {
  color: var(--color-text-muted);
  font-size: 0.95rem;
  font-weight: 400;
}

.partner-badge {
  background: var(--color-accent);
  color: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.run-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.btn-messages,
.btn-complete,
.btn-cancel {
  padding: 0.6em 1.2em;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-family: 'Open Sans', Arial, sans-serif;
}

.btn-messages {
  background: var(--color-primary);
  color: #fff;
}

.btn-messages:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-complete {
  background: var(--color-success);
  color: #fff;
}

.btn-complete:hover:not(:disabled) {
  background: #2e7d32;
}

.btn-cancel {
  background: transparent;
  color: var(--color-error);
  border: 1.5px solid var(--color-error);
}

.btn-cancel:hover:not(:disabled) {
  background: var(--color-error);
  color: #fff;
}

.btn-messages:disabled,
.btn-complete:disabled,
.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.completed-badge {
  background: var(--color-success);
  color: #fff;
  padding: 0.6em 1.2em;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
}

@media (max-width: 768px) {
  .scheduled-run-page {
    padding: 2rem 1.5rem;
  }

  .run-info-grid {
    grid-template-columns: 1fr;
  }

  .run-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .run-actions button {
    width: 100%;
  }
}
</style>