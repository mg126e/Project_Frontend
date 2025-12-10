<template>
  <section class="run-buddy-finder">
    <h1>Find a Running Buddy</h1>
    <p class="page-description">Create and manage one-time run invites to find a running partner!</p>

    <div v-if="loading && !invitesCreated.length && !availableInvites.length && !activeRuns.length" class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <!-- Debug Info (remove in production) -->
    <div v-if="false" class="debug-info" style="background: #f0f0f0; padding: 1rem; margin: 1rem 0; border-radius: 8px; font-size: 0.9rem;">
      <h3>Debug Info</h3>
      <p><strong>Total invites in store:</strong> {{ oneRunStore.invites.length }}</p>
      <p><strong>Invites created:</strong> {{ invitesCreated.length }}</p>
      <p><strong>Invites received:</strong> {{ availableInvites.length }}</p>
      <p><strong>Current user ID:</strong> {{ authStore.user?.id }}</p>
      <p><strong>Loading:</strong> {{ loading }}</p>
      <details>
        <summary>All Invites ({{ oneRunStore.invites.length }})</summary>
        <pre style="max-height: 200px; overflow: auto;">{{ JSON.stringify(oneRunStore.invites, null, 2) }}</pre>
      </details>
      <details>
        <summary>Invites Received Filtered ({{ availableInvites.length }})</summary>
        <pre style="max-height: 200px; overflow: auto;">{{ JSON.stringify(availableInvites, null, 2) }}</pre>
      </details>
    </div>

    <!-- Create Invite Section -->
    <div class="create-invite-section">
      <h2>Create & Send Run Invite</h2>
      <form @submit.prevent="handleCreateInvite" class="invite-form">
        <div class="form-row">
          <div class="form-group">
            <label for="distance">Distance (miles) <span class="required">*</span></label>
            <input
              id="distance"
              v-model.number="newInvite.distance"
              type="number"
              step="0.1"
              min="0.1"
              required
              placeholder="e.g., 3.0"
            />
          </div>
          <div class="form-group">
            <label for="start-time">Start Time <span class="required">*</span></label>
            <input
              id="start-time"
              v-model="newInvite.start"
              type="datetime-local"
              required
              :min="minDateTime"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="location">Meeting Location <span class="required">*</span></label>
          <input
            id="location"
            v-model="newInvite.location"
            type="text"
            required
            placeholder="e.g., Central Park, New York"
          />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary" :disabled="creatingInvite || !canCreateInvite">
            <span v-if="creatingInvite">Creating & Sending...</span>
            <span v-else>Create & Send Request</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Created Invites -->
    <div v-if="invitesCreated.length > 0" class="invites-section">
      <h2>My Created Invites</h2>
      <div class="invites-list">
        <div v-for="invite in invitesCreated" :key="invite._id" class="invite-card" :class="{ sent: invite.sent }">
          <div class="invite-info">
            <div class="invite-header">
              <h3>{{ formatDate(invite.start) }}</h3>
              <span v-if="!invite.sent" class="invite-status created">Created</span>
              <span v-else-if="invite.acceptanceStatus === 'pending'" class="invite-status pending">Sent - Pending</span>
              <span v-else-if="invite.acceptanceStatus === 'accepted'" class="invite-status accepted">Accepted</span>
              <span v-else class="invite-status declined">Declined</span>
            </div>
            <div class="invite-details">
              <p><strong>Distance:</strong> {{ invite.distance }} miles</p>
              <p><strong>Location:</strong> {{ invite.location }}</p>
              <p><strong>Region:</strong> {{ invite.region }}</p>
            </div>
          </div>
          <div class="invite-actions">
            <button v-if="!invite.sent" @click="handleSendInvite(invite._id)" class="btn-send" :disabled="sendingInvite === invite._id">
              {{ sendingInvite === invite._id ? 'Sending...' : 'Send Request' }}
            </button>
            <button v-if="!invite.sent" @click="handleDeleteInvite(invite._id)" class="btn-delete">Delete</button>
            <button v-if="invite.sent && invite.acceptanceStatus === 'pending'" @click="handleDeleteInvite(invite._id)" class="btn-cancel">
              Cancel Invite
            </button>
            <button v-if="invite.sent && (invite.acceptanceStatus === 'accepted' || invite.acceptanceStatus === 'declined')" @click="handleDeleteInvite(invite._id)" class="btn-delete">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Available Invites (all invites in user's region - open for anyone to accept) -->
    <div v-if="availableInvites.length > 0" class="invites-section">
      <h2>Available Invites in Your Region</h2>
      <p class="page-description" style="margin-bottom: 1rem;">These are run invites in your region that you can join!</p>
      <div class="invites-list">
        <div v-for="invite in availableInvites" :key="invite._id" class="invite-card received">
          <div class="invite-info">
            <div class="invite-header">
              <h3>{{ formatDate(invite.start) }}</h3>
              <span class="invite-status pending">Available</span>
            </div>
            <div class="invite-details">
              <p><strong>Distance:</strong> {{ invite.distance }} miles</p>
              <p><strong>Location:</strong> {{ invite.location }}</p>
              <p><strong>Region:</strong> {{ invite.region }}</p>
            </div>
          </div>
          <div class="invite-actions">
            <button @click="handleAcceptInvite(invite._id)" class="btn-accept" :disabled="processingInvite === invite._id">
              {{ processingInvite === invite._id ? 'Processing...' : 'Accept' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Runs -->
    <div v-if="activeRuns.length > 0" class="runs-section">
      <h2>Active Runs</h2>
      <div class="runs-list">
        <div v-for="run in activeRuns" :key="run._id" class="run-card">
          <div class="run-info">
            <h3>Run with Partner</h3>
          </div>
          <div class="run-actions">
            <router-link :to="`/run/${run._id}`" class="btn-view">View Details</router-link>
            <button 
              v-if="canCompleteRun(run._id)"
              @click="handleCompleteRun(run._id)" 
              class="btn-complete"
            >
              Complete Run
            </button>
            <button @click="handleCancelRun(run._id)" class="btn-cancel">Cancel Run</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !invitesCreated.length && !availableInvites.length && !activeRuns.length" class="empty-state">
      <p>No invites or runs yet. Create your first invite to find a running buddy!</p>
    </div>

    <!-- Cancel Run Confirmation Modal -->
    <ConfirmActionModal
      v-if="showCancelRunModal"
      title="Cancel Run"
      message="Are you sure you want to cancel this run?"
      confirm-text="Cancel Run"
      confirm-class="danger"
      @close="closeCancelRunModal"
      @confirm="confirmCancelRun"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onActivated } from 'vue'
import { useOneRunMatchingStore, type Invite } from '../stores/oneRunMatching'
import { useProfileStore } from '../stores/profile'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import ConfirmActionModal from '../components/ConfirmActionModal.vue'

const router = useRouter()
const oneRunStore = useOneRunMatchingStore()
const profileStore = useProfileStore()
const authStore = useAuthStore()

const loading = ref(false)
const creatingInvite = ref(false)
const sendingInvite = ref<string | null>(null)
const processingInvite = ref<string | null>(null)
const showCancelRunModal = ref(false)
const runToCancel = ref<string | null>(null)

const newInvite = ref({
  distance: 3.0,
  start: '',
  location: '',
  region: '',
})

// Computed
const error = computed(() => oneRunStore.error)
const invitesCreated = computed(() => oneRunStore.invites.filter(inv => inv.inviter === authStore.user?.id))
// Available invites: all invites in user's region that are open for anyone to accept
// These come from getActiveInvitesForUser - invites are open for anyone in the region
// The backend should automatically add users in the region to the invitees array
const availableInvites = computed(() => {
  const userId = authStore.user?.id
  if (!userId) return []
  
  // Show all pending invites in the user's region (from getActiveInvitesForUser)
  // Invites are open for anyone in the region to accept
  return oneRunStore.invites.filter(inv => 
    inv.sent && 
    inv.acceptanceStatus === 'pending' && 
    inv.inviter !== userId
  )
})

const minDateTime = computed(() => {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 1)
  return now.toISOString().slice(0, 16)
})

const canCreateInvite = computed(() => {
  return (
    newInvite.value.distance > 0 &&
    newInvite.value.start &&
    newInvite.value.location &&
    newInvite.value.region
  )
})
const activeRuns = computed(() => oneRunStore.activeRuns)
const invites = computed(() => oneRunStore.invites)

// Helper function to extract state from location (e.g., "Boston, MA" -> "MA")
// This ensures we match by state, not exact city and state
function extractStateFromLocation(location: string): string {
  if (!location) return ''
  // Split by comma and take the last part (should be the state)
  const parts = location.split(',')
  if (parts.length > 1) {
    // Get the last part and trim whitespace
    const state = parts[parts.length - 1]?.trim()
    return state || location.trim()
  }
  // If no comma, return the whole location (might just be a state)
  return location.trim()
}

// Methods
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

async function handleCreateInvite() {
  if (!canCreateInvite.value || creatingInvite.value) return

  creatingInvite.value = true
  try {
    // First create the invite
    const result = await oneRunStore.createInvite({
      region: newInvite.value.region,
      start: new Date(newInvite.value.start).toISOString(),
      distance: newInvite.value.distance,
      location: newInvite.value.location,
    })

    if ('error' in result) {
      alert(result.error)
    } else {
      // Automatically send the invite after creating
      const sendResult = await oneRunStore.sendInvite(result.invite)
      if (!sendResult.success && sendResult.error) {
        alert(`Invite created but failed to send: ${sendResult.error}`)
      }
      
      // Reset form
      newInvite.value.distance = 3.0
      newInvite.value.start = ''
      newInvite.value.location = ''
      // Keep region
    }
  } finally {
    creatingInvite.value = false
  }
}

async function handleSendInvite(inviteId: string) {
  if (sendingInvite.value) return
  sendingInvite.value = inviteId
  try {
    const result = await oneRunStore.sendInvite(inviteId)
    if (!result.success && result.error) {
      alert(result.error)
    }
  } finally {
    sendingInvite.value = null
  }
}

async function handleDeleteInvite(inviteId: string) {
  if (!confirm('Are you sure you want to delete this invite?')) return
  const result = await oneRunStore.deleteInvite(inviteId)
  if (!result.success && result.error) {
    alert(result.error)
  }
}

async function handleAcceptInvite(inviteId: string) {
  if (processingInvite.value) return
  processingInvite.value = inviteId
  try {
    const result = await oneRunStore.acceptInvite(inviteId)
    if ('error' in result) {
      alert(result.error)
    } else {
      router.push(`/run/${result.scheduledRun}`)
    }
  } finally {
    processingInvite.value = null
  }
}

async function handleDeclineInvite(inviteId: string) {
  if (processingInvite.value) return
  processingInvite.value = inviteId
  try {
    const result = await oneRunStore.declineInvite(inviteId)
    if (!result.success && result.error) {
      alert(result.error)
    }
  } finally {
    processingInvite.value = null
  }
}

// Check if a run can be completed (date has passed)
function canCompleteRun(runId: string): boolean {
  // Find the invite associated with this run
  const run = activeRuns.value.find(r => r._id === runId)
  if (!run) return false
  
  // Try to find invite in the invites array
  // Check for accepted invites that match the run's users
  const associatedInvite = invites.value.find(inv => {
    if (inv.acceptanceStatus !== 'accepted') return false
    // Check if invite matches the run's users
    return (inv.inviter === run.userA && inv.invitees.includes(run.userB)) ||
           (inv.inviter === run.userB && inv.invitees.includes(run.userA)) ||
           (inv.inviter === run.userA && inv.inviter === run.userB) // Same user (shouldn't happen but handle it)
  })
  
  if (!associatedInvite || !associatedInvite.start) {
    // If invite not found locally, be conservative and allow completion
    // (The invite might not be loaded yet, but we don't want to block users unnecessarily)
    return true
  }
  
  try {
    const runDate = new Date(associatedInvite.start)
    const now = new Date()
    // Set both to start of day for comparison
    const runDateOnly = new Date(runDate.getFullYear(), runDate.getMonth(), runDate.getDate())
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    // Allow completion if it's the same day or later
    return todayOnly >= runDateOnly
  } catch {
    // If date parsing fails, don't show button to be safe
    return false
  }
}

async function handleCompleteRun(runId: string) {
  // Check if run date has passed
  if (!canCompleteRun(runId)) {
    alert('Cannot complete run until after the scheduled date and time.')
    return
  }
  
  if (!confirm('Mark this run as completed?')) return
  const result = await oneRunStore.completeRun(runId)
  if (!result.success && result.error) {
    alert(result.error)
  }
}

function handleCancelRun(runId: string) {
  runToCancel.value = runId
  showCancelRunModal.value = true
}

async function confirmCancelRun() {
  if (!runToCancel.value) return
  
  const result = await oneRunStore.cancelRun(runToCancel.value)
  if (!result.success && result.error) {
    alert(result.error)
  } else {
    // Refresh data to update the UI after cancellation
    await loadData()
  }
  
  showCancelRunModal.value = false
  runToCancel.value = null
}

function closeCancelRunModal() {
  showCancelRunModal.value = false
  runToCancel.value = null
}

async function loadData() {
  loading.value = true
  try {
    // Ensure profile is loaded to get location
    if (!profileStore.profile.location) {
      await profileStore.fetchProfile()
    }

    // Set region from profile location - extract just the state for matching
    if (profileStore.profile.location) {
      // Extract state from location (e.g., "San Francisco, CA" -> "MA")
      // This ensures users see invites from all cities in their state
      newInvite.value.region = extractStateFromLocation(profileStore.profile.location)
    }

    // Load invites and runs - use state as region for filtering
    const region = newInvite.value.region || (profileStore.profile.location ? 
      extractStateFromLocation(profileStore.profile.location) : undefined)
    
    // Fetch all data in parallel
    // fetchActiveInvites() should run when user has set their region to see all matches
    // Uses getActiveInvitesForUser which filters by the user's region (users are auto-registered when they set location)
    await Promise.all([
      oneRunStore.fetchMatches(),
      oneRunStore.fetchUserInvites(region),
      // Call getActiveInvitesForUser to get all active invites filtered by the user's region
      oneRunStore.fetchActiveInvites(),
    ])
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

// Also call when route is activated (for keep-alive routes or when navigating back)
onActivated(() => {
  // If profile has location, ensure active invites are fetched
  if (profileStore.profile.location) {
    oneRunStore.fetchActiveInvites()
  }
})

// Watch for profile location changes - when user sets their region, fetch active invites
watch(
  () => profileStore.profile.location,
  async (newLocation) => {
    if (newLocation) {
      // Extract state from new location (e.g., "Boston, MA" -> "MA")
      // This ensures users see invites from all cities in their state
      newInvite.value.region = extractStateFromLocation(newLocation)
      
      // Fetch active invites when region is set/updated
      await oneRunStore.fetchActiveInvites()
    }
  },
  { immediate: false }
)
</script>

<style scoped>
.run-buddy-finder {
  width: 900px;
  margin: 2rem auto;
  background: #F9FAFB;
  border-radius: 24px;
  padding: 3rem 4rem;
}

.page-description {
  color: var(--color-secondary);
  margin-bottom: 2rem;
  font-size: 1.1rem;
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

.create-invite-section,
.invites-section,
.runs-section {
  background: #fff;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.create-invite-section h2,
.invites-section h2,
.runs-section h2 {
  color: var(--color-primary);
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.invite-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: var(--color-primary);
  font-size: 0.95rem;
}

.required {
  color: var(--color-error);
}

.form-group input {
  padding: 0.6em 1em;
  border: 1.5px solid var(--color-primary-border);
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-actions {
  margin-top: 0.5rem;
}

.invites-list,
.runs-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.invite-card,
.run-card {
  background: var(--color-primary-light);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.invite-card.received {
  border-left: 4px solid var(--color-accent);
}

.invite-info {
  flex: 1;
}

.invite-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.invite-header h3 {
  margin: 0;
  color: var(--color-primary);
  font-size: 1.2rem;
}

.invite-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.invite-status.created {
  background: #e3f1fc;
  color: var(--color-primary);
}

.invite-status.pending {
  background: rgba(241, 162, 56, 0.2);
  color: var(--color-accent);
}

.invite-status.accepted {
  background: rgba(56, 142, 60, 0.2);
  color: var(--color-success);
}

.invite-status.declined {
  background: rgba(211, 47, 47, 0.2);
  color: var(--color-error);
}

.invite-card.sent {
  border-left: 4px solid var(--color-accent);
}

.invite-details {
  color: var(--color-secondary);
  font-size: 0.95rem;
}

.invite-details p {
  margin: 0.3rem 0;
}

.invite-actions,
.run-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-primary,
.btn-send,
.btn-accept,
.btn-decline,
.btn-delete,
.btn-complete,
.btn-cancel,
.btn-view {
  padding: 0.6em 1.2em;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: var(--color-accent);
  backdrop-filter: blur(10px);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-dark);
  outline-offset: 2px;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-send,
.btn-accept {
  background: var(--color-primary);
  color: #fff;
}

.btn-send:hover:not(:disabled),
.btn-accept:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-decline,
.btn-delete,
.btn-cancel {
  background: transparent;
  color: var(--color-error);
  border: 1.5px solid var(--color-error);
}

.btn-decline:hover:not(:disabled),
.btn-delete:hover:not(:disabled),
.btn-cancel:hover:not(:disabled) {
  background: var(--color-error);
  color: #fff;
}

.btn-complete {
  background: #95d95d;
  color: #fff;
}

.btn-complete:hover:not(:disabled) {
  background: #7bc047;
}

.btn-view {
  background: transparent;
  color: var(--color-primary);
  border: 1.5px solid var(--color-primary);
  text-decoration: none;
}

.btn-view:hover {
  background: var(--color-primary);
  color: #fff;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-secondary);
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .run-buddy-finder {
    padding: 2rem 1.5rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .invite-card,
  .run-card {
    flex-direction: column;
    align-items: stretch;
  }

  .invite-actions,
  .run-actions {
    justify-content: stretch;
  }

  .invite-actions button,
  .run-actions button,
  .run-actions a {
    flex: 1;
  }
}
</style>
