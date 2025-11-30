<template>
  <div class="modal-overlay">
    <div class="modal-content email-modal">
      <h2>Email Verification Required</h2>
      <p class="desc">Please verify your email address to complete registration.</p>
      <button class="btn-primary" @click="sendVerification" :disabled="sending">
        {{ sent ? 'Resend Verification Email' : sending ? 'Sending...' : 'Send Verification Email' }}
      </button>

      <div v-if="sent" class="code-entry">
        <label for="verification-code">Enter verification code</label>
        <input
          id="verification-code"
          v-model="code"
          type="text"
          placeholder="6-digit code"
          maxlength="12"
        />
        <button class="btn-primary" @click="verifyCode" :disabled="verifying || !code">
          {{ verifying ? 'Verifying...' : 'Verify Code' }}
        </button>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
      <p v-if="successMessage" class="success-msg">{{ successMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ApiService } from '@/services/api'

const emit = defineEmits(['close', 'verified'])
const sending = ref(false)
const sent = ref(false)
const verifying = ref(false)
const error = ref('')
const successMessage = ref('')
const code = ref('')
const verificationRecordId = ref<string | null>(null)
const verificationCodeEcho = ref<string | null>(null)
const auth = useAuthStore()

// Debug: Watch for changes to verificationRecordId
watch(verificationRecordId, (newVal, oldVal) => {
  console.debug('[EmailVerification] verificationRecordId changed:', { oldVal, newVal })
})

function ensureUserContext() {
  if (!auth.user?.id) {
    throw new Error('Missing user information. Please log in again.')
  }

  if (!auth.user?.email) {
    throw new Error('We need an email address to verify your account.')
  }

  return {
    userId: auth.user.id,
    email: auth.user.email,
  }
}

async function sendVerification() {
  error.value = ''
  successMessage.value = ''
  try {
    const { userId, email } = ensureUserContext()
    sending.value = true
    const response = await ApiService.callConceptAction<{
      verificationRecordId?: string
      verificationCode?: string
      error?: string
    }>('EmailVerification', 'requestVerification', {
      userId,
      email,
    })

    console.debug('[EmailVerification] Response:', response)
    
    // Check for error in response
    if (response.error) {
      error.value = response.error
      return
    }
    
    // Check for verificationRecordId
    if (!response.verificationRecordId) {
      console.error('[EmailVerification] Missing verificationRecordId. Response:', response)
      error.value = 'Server error: Missing verification record ID. Please try again or contact support.'
      return
    }
    
    verificationRecordId.value = response.verificationRecordId
    verificationCodeEcho.value = response.verificationCode || null
    
    if (verificationCodeEcho.value) {
      console.debug('[EmailVerification] Verification code echo:', verificationCodeEcho.value)
    }
    
    sent.value = true
    successMessage.value = 'Verification email sent. Enter the code below.'
  } catch (err: any) {
    console.error('[EmailVerification] Send error:', err)
    error.value = err?.response?.data?.error || err?.message || 'Failed to send verification email.'
  } finally {
    sending.value = false
  }
}

async function verifyCode() {
  error.value = ''
  successMessage.value = ''

  if (!verificationRecordId.value) {
    error.value = 'Please send a verification email first.'
    return
  }

  const trimmedCode = code.value.trim()
  if (!trimmedCode) {
    error.value = 'Enter the verification code.'
    return
  }

  try {
    verifying.value = true
    const response = await ApiService.callConceptAction<{
      session?: string
      user?: string
      email?: string
      error?: string
    }>('EmailVerification', 'verifyEmail', {
      verificationRecordId: verificationRecordId.value,
      verificationCode: trimmedCode,
    })
    if (response.error) {
      error.value = response.error
      return
    }
    
    successMessage.value = 'Email verified!'
    // Emit the session data so RegisterView can store it
    emit('verified', response)
  } catch (err: any) {
    console.error('[EmailVerification] Verify error:', err)
    error.value = err?.response?.data?.error || err?.message || 'Invalid verification code.'
  } finally {
    verifying.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content.email-modal {
  min-width: 320px;
  max-width: 95vw;
  padding: 2.2rem 2.2rem 1.5rem 2.2rem;
  border-radius: 16px;
  background: #fff;
  position: relative;
  border: 1.5px solid var(--color-primary-border);
  text-align: center;
}
.email-modal h2 {
  font-size: 1.18rem;
  color: var(--color-primary);
  margin-bottom: 1.1rem;
  letter-spacing: 0.1px;
}
.email-modal .desc {
  margin-bottom: 1.2rem;
  color: #444;
}
.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 0.6em 1.7em;
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 1rem;
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}
.code-entry {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.code-entry input {
  padding: 0.6em;
  border: 1.5px solid var(--color-primary);
  border-radius: 6px;
  font-size: 1rem;
  letter-spacing: 2px;
  text-align: center;
}
.btn-link {
  background: none;
  color: var(--color-primary);
  border: none;
  padding: 0.5em 1em;
  font-size: 1rem;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s;
}
.btn-link:hover {
  color: var(--color-primary-dark);
}
.error-msg {
  color: var(--color-error);
  margin-top: 0.7rem;
  text-align: center;
}
.success-msg {
  color: var(--color-success);
  margin-top: 0.7rem;
  text-align: center;
}
</style>
