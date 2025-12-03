<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Invite Sent!</h2>
        <button class="close-button" @click="close">&times;</button>
      </div>
      <div class="modal-body">
        <p>Your invite to <strong>{{ recipient }}</strong> has been sent.</p>
        <div class="modal-actions">
          <button class="confirm-button accent" @click="close">OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  recipient: { type: String, required: true }
})
const emit = defineEmits(['close'])
function close() {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: #F9FAFB;
  border-radius: 18px;
  max-width: 400px;
  width: 100%;
  padding: 2rem 1.5rem 1.5rem 1.5rem;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.2rem;
}
.modal-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: var(--color-primary);
  font-weight: 700;
}
.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--color-primary);
  cursor: pointer;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.close-button:hover {
  background: var(--color-primary-light);
}
.modal-body {
  color: var(--color-primary);
  font-size: 1.05rem;
  margin-bottom: 1.5rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}
.confirm-button.accent {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.3rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.confirm-button.accent:hover {
  background: var(--color-accent-dark);
}
</style>