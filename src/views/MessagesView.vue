<template>
  <section class="messages-page">
    <h1>Messages</h1>
    <div class="user-select-row">
      <label for="userSelect" class="user-select-label">Select User:</label>
      <select id="userSelect" v-model="selectedUserId" class="user-select">
        <option v-for="user in userList" :key="user.id" :value="user.id">{{ user.name }}</option>
      </select>
    </div>
    <div class="messages-container">
      <div class="messages-list">
        <div v-for="msg in filteredMessages" :key="msg.id" :class="['message', msg.sender === currentUser ? 'sent' : 'received']">
          <div class="message-sender">{{ msg.sender === currentUser ? 'You' : userList.find(u => u.id === selectedUserId)?.name || 'Partner' }}</div>
          <div class="message-text">{{ msg.text }}</div>
          <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
        </div>
      </div>
      <form class="message-input-form" @submit.prevent="sendMessage">
        <input v-model="newMessage" type="text" placeholder="Type a message..." class="message-input" />
        <button class="btn-primary" type="submit" :disabled="!newMessage.trim()">Send</button>
      </form>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Dummy user list for demo (simulate GoalCreationModal logic)
const currentUser = 'runner1'
const userList = ref([
  { id: 'runner2', name: 'Alice Runner' },
  { id: 'runner3', name: 'Bob Sprinter' },
  { id: 'runner4', name: 'Charlie Jogger' },
])
const selectedUserId = ref(userList.value[0]?.id || '')

// Demo messages for each user
const messages = ref([
  { id: 1, sender: currentUser, recipient: 'runner2', text: 'Hey, ready for our run?', timestamp: Date.now() - 60000 },
  { id: 2, sender: 'runner2', recipient: currentUser, text: 'Yes! What time?', timestamp: Date.now() - 30000 },
  { id: 3, sender: currentUser, recipient: 'runner3', text: 'Hi Bob, want to join a run?', timestamp: Date.now() - 120000 },
  { id: 4, sender: 'runner3', recipient: currentUser, text: 'Sure, when?', timestamp: Date.now() - 90000 },
])

const newMessage = ref('')

const filteredMessages = computed(() => {
  return messages.value.filter(
    m =>
      (m.sender === currentUser && m.recipient === selectedUserId.value) ||
      (m.sender === selectedUserId.value && m.recipient === currentUser)
  )
})

function sendMessage() {
  if (!newMessage.value.trim() || !selectedUserId.value) return
  messages.value.push({
    id: Date.now(),
    sender: currentUser,
    recipient: selectedUserId.value,
    text: newMessage.value,
    timestamp: Date.now(),
  })
  newMessage.value = ''
}

function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.messages-page {
  min-width: 800px;
  background: #fff;
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
}
.message-sender {
  font-size: 0.9rem;
  font-weight: 600;
  color: #106cb8;
  margin-bottom: 0.2rem;
}
.messages-page {
  min-width: 800px;
  background: #fff;
  border-radius: 24px;
  padding: 3.5rem 4.5rem 3.5rem 4.5rem;
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
  min-width: 140px;
}
.user-select:focus {
  border-color: var(--color-primary-dark);
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
</style>