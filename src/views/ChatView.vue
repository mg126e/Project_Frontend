<template>
  <section class="chat-page">
    <div v-if="loading" class="loading">Loading conversation...</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>
    <div v-else-if="threadId" class="chat-container">
      <div class="chat-header">
        <h2>{{ otherUserName || 'Chat' }}</h2>
      </div>
      <div class="messages-container">
        <div v-if="loadingMessages" class="loading">Loading messages...</div>
        <div v-else-if="messagesError" class="error-msg">{{ messagesError }}</div>
        <div v-else>
          <div class="messages-list">
            <div v-for="msg in messages" :key="msg._id" :class="['message', msg.sender === currentUserId ? 'sent' : 'received']">
              <div class="message-sender">{{ msg.sender === currentUserId ? 'You' : otherUserName }}</div>
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
    </div>
    <div v-else class="error-msg">No thread ID provided</div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
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

const route = useRoute()
const auth = useAuthStore()
const currentUserId = computed(() => auth.user?.id || '')
const threadId = computed(() => route.params.threadId as string)
const otherUserId = ref<string>('')

const loading = ref(false)
const error = ref('')
const thread = ref<ThreadState | null>(null)
const otherUserName = ref('')
const messages = ref<MessageState[]>([])
const loadingMessages = ref(false)
const messagesError = ref('')
const newMessage = ref('')
const sending = ref(false)

async function fetchThreadInfo() {
  if (!threadId.value || !currentUserId.value) {
    error.value = 'Thread ID or user ID not found'
    return
  }

  loading.value = true
  error.value = ''
  try {
    // Try to get thread info from _getThreadsForUser and find the matching thread
    const threadsResult = await ApiService.callConceptAction<{ threads?: ThreadState[] } | ThreadState[]>(
      'Messaging',
      '_getThreadsForUser',
      { user: currentUserId.value }
    )
    
    let threadsList: ThreadState[] = []
    if (Array.isArray(threadsResult)) {
      threadsList = threadsResult
    } else if (threadsResult?.threads && Array.isArray(threadsResult.threads)) {
      threadsList = threadsResult.threads
    }
    
    // Find the thread with matching ID
    const foundThread = threadsList.find(t => t._id === threadId.value)
    
    if (foundThread) {
      thread.value = foundThread
      // Determine the other user ID
      otherUserId.value = thread.value.userA === currentUserId.value ? thread.value.userB : thread.value.userA
      console.log('[ChatView] Found thread, otherUserId:', otherUserId.value)
      
      // Fetch the other user's profile
      await fetchUserProfile(otherUserId.value)
    } else {
      // Thread not found in list, try to infer from messages
      console.warn('[ChatView] Thread not found in threads list, will try to infer from messages')
    }
    
    // Load messages (this will also help us infer the other user if thread wasn't found)
    await loadMessages()
    
    // If we still don't have the other user's name, try to infer from messages
    if (!otherUserName.value && messages.value.length > 0) {
      const inferredOtherUserId = messages.value.find(m => m.sender !== currentUserId.value)?.sender
      if (inferredOtherUserId) {
        console.log('[ChatView] Inferred otherUserId from messages:', inferredOtherUserId)
        otherUserId.value = inferredOtherUserId
        await fetchUserProfile(inferredOtherUserId)
      }
    }
  } catch (e: any) {
    console.error('Failed to load thread:', e)
    error.value = e?.response?.data?.error || e?.message || 'Failed to load conversation.'
    // Still try to load messages even if thread info fails
    await loadMessages()
  } finally {
    loading.value = false
  }
}

async function fetchUserProfile(userId: string): Promise<void> {
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

    // Set other user name
    if (profile.displayname && profile.username) {
      otherUserName.value = `${profile.displayname} (${profile.username})`
    } else {
      otherUserName.value = profile.displayname || profile.username || `User ${userId.slice(0, 8)}`
    }
  } catch (e) {
    console.error(`Failed to fetch profile for user ${userId}:`, e)
    const otherUserId = thread.value?.userA === currentUserId.value ? thread.value?.userB : thread.value?.userA
    otherUserName.value = `User ${otherUserId?.slice(0, 8) || 'Unknown'}`
  }
}

async function loadMessages() {
  if (!threadId.value || !currentUserId.value) {
    messages.value = []
    return
  }

  loadingMessages.value = true
  messagesError.value = ''
  try {
    const result = await ApiService.callConceptAction<MessageState[] | { error: string }[]>(
      'Messaging',
      '_getMessagesInThread',
      { thread: threadId.value, user: currentUserId.value }
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
  } catch (e: any) {
    console.error('Failed to load messages:', e)
    messagesError.value = e?.response?.data?.error || e?.message || 'Failed to load messages.'
    messages.value = []
  } finally {
    loadingMessages.value = false
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || !threadId.value || !currentUserId.value || sending.value) {
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
        thread: threadId.value,
        sender: currentUserId.value,
      }
    )

    if ('error' in result) {
      messagesError.value = result.error
      // Restore the message text so user can try again
      newMessage.value = content
    } else {
      // Reload messages to show the new one
      await loadMessages()
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

// Watch for route changes to reload when threadId changes
watch(threadId, () => {
  if (threadId.value) {
    otherUserId.value = ''
    fetchThreadInfo()
  }
})

onMounted(() => {
  if (threadId.value) {
    fetchThreadInfo()
  } else {
    error.value = 'No thread ID provided'
  }
})
</script>

<style scoped>
.chat-page {
  min-width: 800px;
  background: #F9FAFB;
  border-radius: 24px;
  padding: 3.5rem 4.5rem 3.5rem 4.5rem;
}

.chat-header {
  margin-bottom: 1.5rem;
}

.chat-header h2 {
  color: var(--color-primary);
  font-size: 1.5rem;
  margin: 0;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
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
</style>
