<template>
  <section class="messages-page">
    <h1>Messages</h1>
    <div v-if="loading" class="loading">Loading threads...</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>
    <div v-else>
      <div class="user-select-row">
        <label for="threadSelect" class="user-select-label">Select Conversation:</label>
        <select id="threadSelect" v-model="selectedThreadId" class="user-select" @change="loadMessagesForThread">
          <option value="">-- Select a conversation --</option>
          <option v-for="thread in threads" :key="thread._id" :value="thread._id">
            {{ getOtherUserName(thread) }}
          </option>
        </select>
      </div>
      <div v-if="selectedThreadId" class="messages-container">
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
        <p>Select a conversation to view messages</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { ApiService } from '../services/api'

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

const auth = useAuthStore()
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

// User profile cache to avoid repeated API calls
const userProfiles = ref<Record<string, { displayname?: string; username?: string }>>({})

function getCurrentThread(): ThreadState | null {
  return threads.value.find(t => t._id === selectedThreadId.value) || null
}

function getOtherUserName(thread: ThreadState | null): string {
  if (!thread) return 'Unknown'
  const otherUserId = thread.userA === currentUserId.value ? thread.userB : thread.userA
  const profile = userProfiles.value[otherUserId]
  return profile?.displayname || profile?.username || `User ${otherUserId.slice(0, 8)}`
}

async function fetchUserProfile(userId: string): Promise<void> {
  if (userProfiles.value[userId]) return
  
  try {
    const result = await ApiService.callConceptAction<{ profile?: { displayname?: string; username?: string } }>(
      'UserProfile',
      '_getProfile',
      { user: userId }
    )
    if (result?.profile) {
      userProfiles.value[userId] = result.profile
    }
  } catch (e) {
    console.error(`Failed to fetch profile for user ${userId}:`, e)
    // Fallback to userId if profile fetch fails
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

    // Auto-select first thread if available
    if (threads.value.length > 0 && !selectedThreadId.value) {
      selectedThreadId.value = threads.value[0]._id
      await loadMessagesForThread()
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
      if (result.length > 0 && 'error' in result[0]) {
        messagesError.value = (result[0] as { error: string }).error
        messages.value = []
      } else {
        messages.value = result as MessageState[]
      }
    } else {
      messages.value = []
    }
  } catch (e: any) {
    console.error('Failed to load messages:', e)
    messagesError.value = e?.response?.data?.error || e?.message || 'Failed to load messages.'
    messages.value = []
  } finally {
    loadingMessages.value = false
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || !selectedThreadId.value || !currentUserId.value || sending.value) {
    return
  }

  const content = newMessage.value.trim()
  newMessage.value = ''
  sending.value = true

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
      // Restore the message text so user can try again
      newMessage.value = content
    } else {
      // Reload messages to show the new one
      await loadMessagesForThread()
    }
  } catch (e: any) {
    console.error('Failed to send message:', e)
    messagesError.value = e?.response?.data?.error || e?.message || 'Failed to send message.'
    // Restore the message text so user can try again
    newMessage.value = content
  } finally {
    sending.value = false
  }
}

function formatTime(ts: Date | string): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  loadThreads()
})
</script>

<style scoped>
.messages-page {
  min-width: 800px;
  background: #F9FAFB;
  border-radius: 24px;
  padding: 3.5rem 4.5rem 3.5rem 4.5rem;
}
.messages-container {
  display: flex;
  flex-direction: column;
  height: 800px;
  border: 1.5px solid var(--color-primary-border);
  border-radius: 12px;
  background: #f7fafd;
  padding: 1.2rem;
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
.user-select-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.user-select-label {
  font-weight: 600;
  color: var(--color-primary);
  font-size: 1rem;
}
.user-select {
  background: #f7fafd;
  color: var(--color-primary);
  border: 1.5px solid var(--color-primary-border);
  border-radius: 6px;
  padding: 0.45em 1.2em 0.45em 0.8em;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: border 0.18s;
  outline: none;
  min-width: 200px;
}
.user-select:focus {
  border-color: var(--color-primary-dark);
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
