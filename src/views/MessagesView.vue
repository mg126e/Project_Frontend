<template>
  <section class="messages-page">
    <h1>Messages</h1>
    <div v-if="loading" class="loading">Loading threads...</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>
    <div v-else class="messages-layout">
      <div class="threads-sidebar">
        <h2 class="sidebar-title">Conversations</h2>
        <div v-if="threads.length === 0" class="no-threads">
          <p>No conversations yet</p>
        </div>
        <div v-else class="threads-list">
          <button
            v-for="thread in threads"
            :key="thread._id"
            @click="selectThread(thread._id)"
            :class="['thread-item', { active: selectedThreadId === thread._id }]"
          >
            <div class="thread-name">{{ getOtherUserName(thread) }}</div>
          </button>
        </div>
      </div>
      <div v-if="selectedThreadId" class="messages-container">
        <div class="messages-header">
          <h2>{{ getOtherUserName(getCurrentThread()) }}</h2>
          <div class="header-actions">
            <button
              v-if="hasActiveMatch"
              class="btn-unmatch"
              @click="handleUnmatchClick"
              title="Unmatch with this user"
            >
              Unmatch
            </button>
            <router-link 
              v-if="runId" 
              :to="`/run/${runId}`" 
              class="btn-view-run"
              title="View Run Details"
            >
              View Run Details
            </router-link>
          </div>
        </div>
        <div v-if="loadingMessages" class="loading">Loading messages...</div>
        <div v-else-if="messagesError" class="error-msg">{{ messagesError }}</div>
        <div v-else>
          <div class="messages-list">
            <div v-for="msg in messages" :key="msg._id" :class="['message', msg.sender === currentUserId ? 'sent' : 'received']">
              <div class="message-sender">{{ msg.sender === currentUserId ? 'You' : getOtherUserName(getCurrentThread()) }}</div>
              <div class="message-text">{{ msg.content }}</div>
              <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
            </div>
            <div v-if="messages.length === 0" class="no-messages">No messages yet. Start the conversation!</div>
          </div>
          <form class="message-input-form" @submit.prevent="sendMessage">
            <input v-model="newMessage" type="text" placeholder="Type a message..." class="message-input" :disabled="sending" />
            <button class="btn-primary" type="submit" :disabled="!newMessage.trim() || sending">
              {{ sending ? 'Sending...' : 'Send' }}
            </button>
          </form>
        </div>
      </div>
      <div v-else class="no-thread-selected">
        <p>Select a conversation from the sidebar to view messages</p>
      </div>
    </div>

    <ConfirmActionModal
      v-if="showUnmatchModal"
      :title="'Unmatch'"
      :message="unmatchModalMessage"
      confirmText="Unmatch"
      confirmClass="danger"
      @close="showUnmatchModal = false"
      @confirm="confirmUnmatch"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useOneRunMatchingStore } from '../stores/oneRunMatching'
import { ApiService } from '../services/api'
import ConfirmActionModal from '../components/ConfirmActionModal.vue'

interface ThreadState {
  _id: string
  userA: string
  userB: string
  messages: string[]
  deletedBy: string[]
}

interface MessageState {
  _id: string
  threadId: string
  sender: string
  timestamp: Date | string
  content: string
  status: 'delivered' | 'read'
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const oneRunStore = useOneRunMatchingStore()
const currentUserId = computed(() => auth.user?.id || '')

const loading = ref(false)
const error = ref('')
const threads = ref<ThreadState[]>([])
const selectedThreadId = ref('')
const messages = ref<MessageState[]>([])
const loadingMessages = ref(false)
const messagesError = ref('')
const newMessage = ref('')
const sending = ref(false)
const runId = ref<string | null>(null)

// Unmatch functionality
const activeMatchIds = ref(new Map<string, string>())
const showUnmatchModal = ref(false)
const unmatchModalMessage = computed(() => {
  const currentThread = getCurrentThread()
  if (!currentThread) return ''
  const otherUserName = getOtherUserName(currentThread)
  return `Are you sure you want to unmatch with ${otherUserName}? This will delete your conversation and you won't be able to message each other.`
})

// Check if current thread has an active partner match (NOT a one-time run match)
const hasActiveMatch = computed(() => {
  const currentThread = getCurrentThread()
  if (!currentThread || !currentUserId.value) {
    return false
  }
  
  const otherUserId = currentThread.userA === currentUserId.value ? currentThread.userB : currentThread.userA
  if (!otherUserId) {
    return false
  }
  
  // Check if the other user has an active PARTNER match ID stored
  // activeMatchIds only contains partner matches from _getActiveMatches (PartnerMatching concept)
  // This excludes one-time run matches
  const idVariants = [
    otherUserId,
    currentThread.userA,
    currentThread.userB
  ].filter(Boolean)
  
  // Only return true if we have a match ID in activeMatchIds
  // activeMatchIds is ONLY populated from PartnerMatching._getActiveMatches
  // which should NOT include one-time run matches
  const hasPartnerMatch = idVariants.some(id => {
    const matchId = activeMatchIds.value.get(id)
    return !!matchId
  })
  
  // Also check: if there's a runId, this might be a one-time run match
  // In that case, we should NOT show the unmatch button
  // (Partner matches don't have runId, one-time run matches do)
  if (runId.value && hasPartnerMatch) {
    console.warn('[MessagesView] Thread has both runId and partner match - this should not happen')
  }
  
  // Only show unmatch if there's a partner match AND no runId
  // (runId indicates it's a one-time run match, not a partner match)
  return hasPartnerMatch && !runId.value
})

// User profile cache to avoid repeated API calls
const userProfiles = ref<Record<string, { displayname?: string; username?: string }>>({})

function getCurrentThread(): ThreadState | null {
  return threads.value.find(t => t._id === selectedThreadId.value) || null
}

function getOtherUserName(thread: ThreadState | null): string {
  if (!thread) return 'Unknown'
  const otherUserId = thread.userA === currentUserId.value ? thread.userB : thread.userA
  const profile = userProfiles.value[otherUserId]
  if (profile?.displayname && profile?.username) {
    return `${profile.displayname} (${profile.username})`
  }
  return profile?.displayname || profile?.username || `User ${otherUserId.slice(0, 8)}`
}

async function fetchUserProfile(userId: string): Promise<void> {
  if (userProfiles.value[userId]) return
  
  try {
    // Fetch both displayname and username
    const results = await Promise.allSettled([
      ApiService.callConceptAction<{ displayname: string } | { error: string }>('UserProfile', '_getDisplayName', { user: userId }),
      ApiService.callConceptAction<{ username: string } | { error: string }>('PasswordAuthentication', '_getUsername', { user: userId })
    ])

    const profile: { displayname?: string; username?: string } = {}

    // Handle displayname result
    if (results[0].status === 'fulfilled') {
      const result = results[0].value
      if (!('error' in result)) {
        profile.displayname = result.displayname
      }
    }

    // Handle username result
    if (results[1].status === 'fulfilled') {
      const result = results[1].value
      if (!('error' in result)) {
        profile.username = result.username
      }
    }

    userProfiles.value[userId] = profile
  } catch (e) {
    console.error(`Failed to fetch profile for user ${userId}:`, e)
    userProfiles.value[userId] = { username: userId }
  }
}

async function loadThreads() {
  if (!currentUserId.value) {
    error.value = 'Please log in to view messages.'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const result = await ApiService.callConceptAction<{ threads?: ThreadState[] }>(
      'Messaging',
      '_getThreadsForUser',
      { user: currentUserId.value }
    )
    
    if (Array.isArray(result)) {
      threads.value = result
    } else if (result?.threads && Array.isArray(result.threads)) {
      threads.value = result.threads
    } else {
      threads.value = []
    }

    // Fetch profiles for all other users in threads
    for (const thread of threads.value) {
      const otherUserId = thread.userA === currentUserId.value ? thread.userB : thread.userA
      await fetchUserProfile(otherUserId)
    }

    // Check if a thread ID was passed in query params (e.g., from scheduled run page)
    const threadParam = route.query.thread as string | undefined
    if (threadParam && threads.value.find(t => t._id === threadParam)) {
      // Select the thread from query params
      selectedThreadId.value = threadParam
      await loadMessagesForThread()
    } else if (threads.value.length > 0 && !selectedThreadId.value) {
      // Auto-select first thread if available and no query param
      const firstThread = threads.value[0]
      if (firstThread) {
        selectedThreadId.value = firstThread._id
        await loadMessagesForThread()
      }
    }
  } catch (e: any) {
    console.error('Failed to load threads:', e)
    error.value = e?.response?.data?.error || e?.message || 'Failed to load conversations.'
  } finally {
    loading.value = false
  }
}

async function loadMessagesForThread() {
  if (!selectedThreadId.value || !currentUserId.value) {
    messages.value = []
    runId.value = null
    return
  }

  loadingMessages.value = true
  messagesError.value = ''
  try {
    const result = await ApiService.callConceptAction<MessageState[] | { error: string }[]>(
      'Messaging',
      '_getMessagesInThread',
      { thread: selectedThreadId.value, user: currentUserId.value }
    )
    
    if (Array.isArray(result)) {
      // Check if it's an error array
      const firstItem = result[0]
      if (result.length > 0 && firstItem && 'error' in firstItem) {
        messagesError.value = (firstItem as { error: string }).error
        messages.value = []
      } else {
        messages.value = result as MessageState[]
      }
    } else {
      messages.value = []
    }
    
    // Check for run match after loading messages
    await findRunMatch()
  } catch (e: any) {
    console.error('Failed to load messages:', e)
    messagesError.value = e?.response?.data?.error || e?.message || 'Failed to load messages.'
    messages.value = []
  } finally {
    loadingMessages.value = false
  }
}

async function findRunMatch() {
  const currentThread = getCurrentThread()
  if (!currentThread || !currentUserId.value) {
    runId.value = null
    return
  }
  
  const otherUserId = currentThread.userA === currentUserId.value ? currentThread.userB : currentThread.userA
  const otherUserProfile = userProfiles.value[otherUserId]
  const otherUserUsername = otherUserProfile?.username || ''
  
  try {
    // Fetch runs to check for matches
    await oneRunStore.fetchMatches()
    
    // Find a run where both users are participants
    // Handle both username and UUID formats
    const matchingRun = oneRunStore.runs.find(run => {
      const currentUserIdMatches = currentUserId.value
      const currentUsernameMatches = auth.user?.username || ''
      const otherUserIdMatches = otherUserId
      const otherUsernameMatches = otherUserUsername
      
      const currentMatchesA = run.userA === currentUserIdMatches || run.userA === currentUsernameMatches
      const currentMatchesB = run.userB === currentUserIdMatches || run.userB === currentUsernameMatches
      const otherMatchesA = run.userA === otherUserIdMatches || run.userA === otherUsernameMatches
      const otherMatchesB = run.userB === otherUserIdMatches || run.userB === otherUsernameMatches
      
      const matches = (currentMatchesA && otherMatchesB) || (currentMatchesB && otherMatchesA)
      
      return matches
    })
    
    if (matchingRun) {
      runId.value = matchingRun._id
    } else {
      runId.value = null
    }
  } catch (e) {
    console.error('[MessagesView] Failed to find run match:', e)
    runId.value = null
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || !selectedThreadId.value || !currentUserId.value || sending.value) {
    return
  }

  const content = newMessage.value.trim()
  newMessage.value = ''
  sending.value = true

  // Optimistically add the message to the UI
  const tempMessage: MessageState = {
    _id: `temp-${Date.now()}`,
    threadId: selectedThreadId.value,
    sender: currentUserId.value,
    timestamp: new Date(),
    content: content,
    status: 'delivered'
  }
  messages.value.push(tempMessage)

  try {
    const result = await ApiService.callConceptAction<{ message?: string } | { error: string }>(
      'Messaging',
      'sendMessage',
      {
        content,
        thread: selectedThreadId.value,
        sender: currentUserId.value,
      }
    )

    if ('error' in result) {
      messagesError.value = result.error
      // Remove the optimistic message and restore the text
      messages.value = messages.value.filter(m => m._id !== tempMessage._id)
      newMessage.value = content
    } else {
      // Replace the temp message with the real one if we got a message ID
      if (result.message) {
        const messageIndex = messages.value.findIndex(m => m._id === tempMessage._id)
        if (messageIndex !== -1) {
          messages.value[messageIndex] = {
            ...tempMessage,
            _id: result.message
          }
        }
      }
    }
  } catch (e: any) {
    console.error('Failed to send message:', e)
    messagesError.value = e?.response?.data?.error || e?.message || 'Failed to send message.'
    // Remove the optimistic message and restore the text
    messages.value = messages.value.filter(m => m._id !== tempMessage._id)
    newMessage.value = content
  } finally {
    sending.value = false
  }
}

function selectThread(threadId: string) {
  selectedThreadId.value = threadId
  loadMessagesForThread()
}

function formatTime(ts: Date | string): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Watch for thread selection changes
watch(selectedThreadId, async () => {
  if (selectedThreadId.value) {
    // Reload active matches to ensure we have the latest data
    await loadActiveMatches()
    loadMessagesForThread()
  } else {
    runId.value = null
  }
})

// Watch for changes in active runs
watch(() => oneRunStore.runs, () => {
  if (selectedThreadId.value) {
    findRunMatch()
  }
}, { deep: true })

// Load active matches to determine which conversations have unmatch option
async function loadActiveMatches() {
  if (!currentUserId.value) return
  
  try {
    const matchesResult = await ApiService.callConceptAction<any>(
      'PartnerMatching',
      '_getActiveMatches',
      { user: currentUserId.value }
    )
    
    const matches = Array.isArray(matchesResult)
      ? matchesResult
      : matchesResult?.matches || []
    
    const newMatchIds = new Map<string, string>()
    
    matches.forEach((match: any) => {
      const matchId = match._id || match.id
      if (!matchId) return
      
      let userA: string | undefined
      let userB: string | undefined
      
      if (match.userA && match.userB) {
        userA = match.userA
        userB = match.userB
      } else if (Array.isArray(match.users) && match.users.length >= 2) {
        userA = match.users[0]
        userB = match.users[1]
      }
      
      if (!userA || !userB) return
      
      const currentUserIdVariants = [
        currentUserId.value,
        auth.user?.id,
        auth.user?.username
      ].filter(Boolean)
      
      const otherUser = currentUserIdVariants.includes(userA) ? userB : userA
      
      if (otherUser) {
        newMatchIds.set(otherUser, matchId)
        // Also store with all possible ID variants
        newMatchIds.set(userA, matchId)
        newMatchIds.set(userB, matchId)
      }
    })
    
    activeMatchIds.value = newMatchIds
  } catch (e) {
    console.warn('[MessagesView] Failed to load active matches:', e)
  }
}

function handleUnmatchClick() {
  showUnmatchModal.value = true
}

async function confirmUnmatch() {
  const currentThread = getCurrentThread()
  if (!currentThread || !currentUserId.value) {
    showUnmatchModal.value = false
    return
  }

  const otherUserId = currentThread.userA === currentUserId.value ? currentThread.userB : currentThread.userA
  if (!otherUserId) {
    error.value = 'Missing user information'
    showUnmatchModal.value = false
    return
  }

  try {
    const session = auth.session
    if (!session) {
      error.value = 'Session not found'
      showUnmatchModal.value = false
      return
    }

    // Get match ID from stored active matches
    const idVariants = [
      otherUserId,
      currentThread.userA,
      currentThread.userB
    ].filter(Boolean)
    
    let matchId: string | undefined
    for (const id of idVariants) {
      const storedMatchId = activeMatchIds.value.get(id)
      if (storedMatchId) {
        matchId = storedMatchId
        break
      }
    }

    if (!matchId) {
      error.value = 'No active match found'
      showUnmatchModal.value = false
      return
    }

    // Step 1: Unmatch the users
    await ApiService.callConceptAction('PartnerMatching', 'unmatch', {
      activeMatch: matchId,
      userA: currentUserId.value,
      userB: otherUserId
    })

    // Step 2: Delete chat for both users
    const threadId = selectedThreadId.value
    if (threadId) {
      // Delete chat for current user
      await ApiService.callConceptAction('Messaging', 'deleteChat', {
        initiator: currentUserId.value,
        thread: threadId
      })

      // Delete chat for other user
      await ApiService.callConceptAction('Messaging', 'deleteChat', {
        initiator: otherUserId,
        thread: threadId
      })
    }

    showUnmatchModal.value = false
    
    // Remove from active matches
    const newMatchIds = new Map(activeMatchIds.value)
    idVariants.forEach(id => newMatchIds.delete(id))
    activeMatchIds.value = newMatchIds
    
    // Clear selected thread and reload threads
    selectedThreadId.value = ''
    await loadThreads()
    
    // Navigate away or show message
    error.value = ''
  } catch (e) {
    console.error('[MessagesView] Error unmatching:', e)
    error.value = e instanceof Error ? e.message : 'Failed to unmatch'
    showUnmatchModal.value = false
  }
}

onMounted(async () => {
  // Pre-fetch runs
  try {
    await oneRunStore.fetchMatches()
  } catch (e) {
    console.warn('[MessagesView] Failed to pre-fetch runs:', e)
  }
  // Load active matches
  await loadActiveMatches()
  loadThreads()
})
</script>

<style scoped>
.messages-page {
  min-width: 1000px;
  background: #F9FAFB;
  border-radius: 24px;
  padding: 3.5rem 4.5rem 3.5rem 4.5rem;
}

.messages-layout {
  display: flex;
  gap: 1.5rem;
  height: 800px;
}

.threads-sidebar {
  width: 280px;
  background: #fff;
  border: 1.5px solid var(--color-primary-border);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-title {
  color: var(--color-primary);
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-primary-border);
}

.threads-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.thread-item {
  background: transparent;
  border: 1.5px solid var(--color-primary-border);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.thread-item:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.thread-item.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.thread-item.active .thread-name {
  color: white;
  font-weight: 600;
}

.thread-name {
  color: var(--color-primary);
  font-size: 1rem;
  font-weight: 500;
}

.no-threads {
  text-align: center;
  padding: 2rem;
  color: #888;
  font-style: italic;
}
.messages-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1.5px solid var(--color-primary-border);
  border-radius: 12px;
  background: #f7fafd;
  padding: 1.2rem;
  min-width: 0;
}
.messages-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1rem;
}
.message {
  margin-bottom: 1.1rem;
  padding: 0.7rem 1.1rem;
  border-radius: 10px;
  max-width: 70%;
  word-break: break-word;
  background: #e6f2ff;
  align-self: flex-start;
  position: relative;
}
.message.sent {
  background: #d1f7c4;
  align-self: flex-end;
  margin-left: auto;
}
.message-sender {
  font-size: 0.9rem;
  font-weight: 600;
  color: #106cb8;
  margin-bottom: 0.2rem;
}
.message-text {
  margin-bottom: 0.3rem;
}
.message-time {
  font-size: 0.8rem;
  color: #888;
  text-align: right;
}
.messages-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-primary-border);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.messages-header h2 {
  color: var(--color-primary);
  font-size: 1.5rem;
  margin: 0;
}

.btn-view-run {
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.6em 1.2em;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
  text-decoration: none;
  white-space: nowrap;
}

.btn-view-run:hover {
  background: var(--color-accent-dark);
}

.btn-unmatch {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.6em 1.2em;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-unmatch:hover {
  background: #c82333;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.message-input-form {
  display: flex;
  gap: 0.7rem;
}
.message-input {
  flex: 1;
  padding: 0.6em;
  border: 1.5px solid var(--color-primary);
  border-radius: 6px;
  font-size: 1rem;
}
.message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.7em 1.5em;
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}
.loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-primary);
}
.error-msg {
  color: #d32f2f;
  padding: 1rem;
  background: #ffebee;
  border-radius: 6px;
  margin-bottom: 1rem;
}
.no-messages {
  text-align: center;
  padding: 2rem;
  color: #888;
  font-style: italic;
}
.no-thread-selected {
  text-align: center;
  padding: 3rem;
  color: #888;
}
</style>
