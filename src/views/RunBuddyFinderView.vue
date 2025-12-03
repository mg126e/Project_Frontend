<template>
  <section class="run-buddy-finder">
    <h1>Find a Running Buddy</h1>
    <p class="page-description">Create and manage one-time run invites to find a running partner!</p>

    <div v-if="loading && !invitesCreated.length && !invitesReceived.length && !activeRuns.length" class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <div v-if="error" class="error-banner">
      {{ error }}
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
            <span v-else>Create & Send Invite</span>
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
              {{ sendingInvite === invite._id ? 'Sending...' : 'Send Invite' }}
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

    <!-- Received Invites -->
    <div v-if="invitesReceived.length > 0" class="invites-section">
      <h2>Received Invites</h2>
      <div class="invites-list">
        <div v-for="invite in invitesReceived" :key="invite._id" class="invite-card received">
          <div class="invite-info">
            <div class="invite-header">
              <h3>{{ formatDate(invite.start) }}</h3>
              <span class="invite-status pending">Pending</span>
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
            <button @click="handleDeclineInvite(invite._id)" class="btn-decline" :disabled="processingInvite === invite._id">
              Decline
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
            <button @click="handleCompleteRun(run._id)" class="btn-complete">Complete Run</button>
            <button @click="handleCancelRun(run._id)" class="btn-cancel">Cancel Run</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !invitesCreated.length && !invitesReceived.length && !activeRuns.length" class="empty-state">
      <p>No invites or runs yet. Create your first invite to find a running buddy!</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

const newInvite = ref({
  distance: 3.0,
  start: '',
  location: '',
  region: '',
})

// Computed
const error = computed(() => oneRunStore.error)
const invitesCreated = computed(() => oneRunStore.invites.filter(inv => inv.inviter === authStore.user?.id))
const invitesReceived = computed(() => {
  const userId = authStore.user?.id
  if (!userId) return []
  // Only show pending invites - accepted invites should never appear here
  // Once an invite is accepted, it's removed so no other users can accept it
  return oneRunStore.invites.filter(inv => 
    inv.sent && 
    inv.acceptanceStatus === 'pending' && 
    inv.inviter !== userId &&
    inv.invitees.includes(userId)
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

async function handleCompleteRun(runId: string) {
  if (!confirm('Mark this run as completed?')) return
  const result = await oneRunStore.completeRun(runId)
  if (!result.success && result.error) {
    alert(result.error)
  }
}

async function handleCancelRun(runId: string) {
  if (!confirm('Are you sure you want to cancel this run?')) return
  const result = await oneRunStore.cancelRun(runId)
  if (!result.success && result.error) {
    alert(result.error)
  }
}

async function loadData() {
  loading.value = true
  try {
    // Ensure profile is loaded to get location
    if (!profileStore.profile.location) {
      await profileStore.fetchProfile()
    }

    // Set region from profile location
    if (profileStore.profile.location) {
      // Extract region from location (e.g., "San Francisco, CA" -> "CA" or use full location)
      const location = profileStore.profile.location
      // For now, use the full location as region, or extract state
      const parts = location.split(',')
      newInvite.value.region = parts.length > 1 ? parts[parts.length - 1].trim() : location.trim()
    }

    // Load invites and runs
    const region = newInvite.value.region || (profileStore.profile.location ? 
      (() => {
        const location = profileStore.profile.location
        const parts = location.split(',')
        return parts.length > 1 ? parts[parts.length - 1].trim() : location.trim()
      })() : undefined)
    
    await Promise.all([
      oneRunStore.fetchMatches(),
      oneRunStore.fetchUserInvites(region),
    ])
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.run-buddy-finder {
  max-width: 900px;
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
  font-family: 'Open Sans', Arial, sans-serif;
}

.btn-primary {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--color-primary);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.4);
  outline: 2px solid var(--color-accent);
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
