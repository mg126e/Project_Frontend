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
  emit('confirm');
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
  background: #fff;
  border-radius: 18px;
  max-width: 400px;
  width: 100%;
  padding: 2rem 1.5rem 1.5rem 1.5rem;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
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
  background: #e3f1fc;
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
.confirm-button {
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
.confirm-button.danger {
  background: #d32f2f;
  color: #fff;
}
.confirm-button.danger:hover {
  background: #c62424;
  color: #fff;
}
.confirm-button:not(.danger):hover {
  background: #d32f2f;
}
</style>
