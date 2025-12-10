<template>
  <div class="modal-overlay" @click.self="onClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button class="close-button" @click="onClose">&times;</button>
      </div>
      <div class="modal-body">
        <p>{{ message }}</p>
        <div class="modal-actions">
          <button class="cancel-button" @click="onClose">Cancel</button>
          <button :class="['confirm-button', confirmClass]" @click="onConfirm">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: { type: String, required: true },
  message: { type: String, required: true },
  confirmText: { type: String, default: 'Confirm' },
  confirmClass: { type: String, default: '' },
});
const emit = defineEmits(['close', 'confirm']);
function onClose() {
  emit('close');
}
function onConfirm() {
  emit('confirm'); // Only emit confirm when confirm button is clicked
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-content {
  background: #FFFFFF;
  border-radius: 24px;
  max-width: 450px;
  width: 90%;
  padding: 2.5rem 2rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05);
  animation: slideUp 0.3s ease-out;
  position: relative;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--color-primary-light);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--color-primary);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.close-button {
  background: var(--color-primary-light);
  border: none;
  font-size: 1.5rem;
  color: var(--color-primary);
  cursor: pointer;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  line-height: 1;
  padding: 0;
}

.close-button:hover {
  background: var(--color-primary);
  color: #fff;
  transform: rotate(90deg);
}

.modal-body {
  color: var(--color-secondary);
  font-size: 1.1rem;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.modal-body p {
  margin: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.confirm-button {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1.8rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.confirm-button:hover {
  background: var(--color-accent-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.confirm-button:active {
  transform: translateY(0);
}

.confirm-button.danger {
  background: var(--color-error);
  color: #fff;
}

.confirm-button.danger:hover {
  background: #c62424;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);
}

.cancel-button {
  background: #fff;
  color: var(--color-primary);
  border: 2px solid var(--color-primary-border);
  border-radius: 10px;
  padding: 0.75rem 1.8rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cancel-button:active {
  transform: translateY(0);
}
</style>
