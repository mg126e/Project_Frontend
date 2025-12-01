<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <button class="close-btn" @click="close">&times;</button>
      <div class="profile-header">
        <img :src="profileImageUrl" class="profile-avatar" alt="Profile avatar" />
        <div>
          <h2 class="profile-name">{{ profile.displayname }}</h2>
          <p class="profile-bio">{{ profile.bio }}</p>
        </div>
      </div>
      <div class="profile-meta">
        <span><b>Location:</b> {{ profile.location }}</span>
      </div>
      <div class="profile-tags">
        <span class="tag">{{ profile.tags.gender }}</span>
        <span class="tag">{{ profile.tags.age }}</span>
        <span class="tag">{{ profile.tags.runningLevel }}</span>
        <span class="tag">{{ profile.tags.runningPace }} min/mi</span>
        <span class="tag">{{ profile.tags.personality }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  profile: { type: Object, required: true },
  show: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const profileImageUrl =
  props.profile.profileImageUrl ||
  'https://media.istockphoto.com/id/628317758/vector/fit-couple-running-a-marathon-together.jpg?s=612x612&w=0&k=20&c=q9adFDtuz7CkLSb-u9U_ykVQdD0aBuWEHbtoCvJ94rQ=';

function close() {
  emit('close');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: #fff;
  border-radius: 18px;
  min-width: 340px;
  max-width: 420px;
  padding: 2.2rem 2.5rem 1.5rem 2.5rem;
  position: relative;
}
.close-btn {
  position: absolute;
  top: 1.1rem;
  right: 1.1rem;
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--color-primary);
  cursor: pointer;
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.2rem;
}
.profile-avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--color-primary);
  background: #fff;
}
.profile-name {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-primary);
}
.profile-bio {
  margin: 0.3rem 0 0 0;
  color: #555;
  font-size: 1.05rem;
}
.profile-meta {
  color: #888;
  font-size: 1rem;
  margin-bottom: 0.7rem;
}
.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
}
.tag {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 6px;
  padding: 0.22em 0.9em;
  font-size: 0.98rem;
  font-weight: 600;
}
</style>
