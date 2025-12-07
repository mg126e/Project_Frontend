<template>
  <div class="profile-card">
    <img
      class="profile-avatar"
      :src="profileImageUrl"
      alt="User avatar"
    />
    <div class="profile-info">
      <div class="profile-header-row">
        <h2 class="profile-name">{{ profile.displayname }}</h2>
      </div>
      <p class="profile-bio">{{ profile.bio }}</p>
      <div class="profile-meta">
        <span class="meta-label">Location:</span> <span>{{ profile.location }}</span>
      </div>
      <div class="profile-tags">
        <span class="tag">{{ profile.tags.gender }}</span>
        <span class="tag">{{ profile.tags.age }}</span>
        <span class="tag">{{ profile.tags.runningLevel }}</span>
        <span class="tag">{{ profile.tags.runningPace }} min/mi</span>
        <span class="tag">{{ profile.tags.personality }}</span>
      </div>
      <button class="btn-primary" @click="$emit('send-invite', profile)">Send Request</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  profile: { type: Object, required: true },
})

const profileImageUrl = computed(() => {
  return props.profile.profileImage || 
         props.profile.profileImageUrl || 
         'https://media.istockphoto.com/id/628317758/vector/fit-couple-running-a-marathon-together.jpg?s=612x612&w=0&k=20&c=q9adFDtuz7CkLSb-u9U_ykVQdD0aBuWEHbtoCvJ94rQ='
})
</script>

<style scoped>
.profile-card {
  display: flex;
  align-items: flex-start;
  background: #f7fafd;
  border-radius: 20px;
  padding: 2.5rem 2.7rem;
  width: 100%;
  max-width: 100%;
  gap: 2.2rem;
  border: 1.5px solid var(--color-primary-border);
  box-sizing: border-box;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
.profile-card:hover {
  border: 1.5px solid var(--color-primary);
}
.profile-avatar {
  width: 100px;
  height: 100px;
  min-width: 100px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--color-primary);
  background: #F9FAFB;
}
.profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  min-width: 0;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}
.profile-header-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  overflow: hidden;
}
.profile-name {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-primary);
  word-wrap: break-word;
  overflow-wrap: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.3;
  max-width: 100%;
}
.profile-bio {
  margin: 0 0 1.1rem 0;
  color: #555;
  font-size: 1.05rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  line-height: 1.4;
  max-width: 100%;
}
.profile-meta {
  color: #888;
  font-size: 1rem;
  margin-bottom: 0.2rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}
.meta-label {
  font-weight: 600;
  color: var(--color-primary);
}
.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
  max-width: 100%;
}
.tag {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 6px;
  padding: 0.22em 0.9em;
  font-size: 0.98rem;
  font-weight: 600;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.profile-emergency {
  color: #b23b3b;
  font-size: 0.97rem;
  margin-bottom: 1.1rem;
  margin-top: 0.2rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.emergency-label {
  font-weight: 600;
  color: #b23b3b;
}
.btn-primary {
  background: var(--color-accent);
  color: var(--color-primary);
  border: none;
  border-radius: 6px;
  padding: 0.7em 1.5em;
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.2s;
  color: white;
}

.btn-primary:hover {
  background: var(--color-accent-dark);
}
</style>
