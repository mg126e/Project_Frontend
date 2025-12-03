<template>
  <div v-if="profileStore.loading || !displayName" class="dashboard-spinner">
    <span class="spinner"></span>
  </div>
  <div v-else class="dashboard-home">
    <h1>Welcome{{ displayName ? `, ${displayName}` : '' }}!</h1>
    <p class="dashboard-welcome-msg">Check out your important stats!</p>
    <div class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-label">Total Goals</div>
        <div class="stat-value">{{ stats.goals }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Milestones</div>
        <div class="stat-value">{{ stats.milestones }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Matches</div>
        <div class="stat-value">{{ stats.matches }}</div>
      </div>
    </div>

    <div v-if="pendingInvites.length" class="pending-invites-section">
      <h2 class="pending-invites-title">Pending Invites</h2>
      <div class="pending-invites-list">
        <div v-for="invite in pendingInvites" :key="invite.id" class="invite-card">
          <div class="invite-info">
            <span class="invite-from">
            From: <b class="profile-link" @click="openProfileModal(invite.profile)">{{ invite.from }}</b>
            </span>
            <span class="invite-message">{{ invite.message }}</span>
          </div>
          <div class="invite-actions">
            <button class="btn-accept" @click="acceptInvite(invite.id)">Accept</button>
            <button class="btn-decline" @click="declineInvite(invite.id)">Decline</button>
          </div>
        </div>
      </div>
      <ProfileSnapshotModal
  v-if="showProfileModal && modalProfile"
  :profile="modalProfile"
  :show="showProfileModal"
  @close="closeProfileModal"
/>
    </div>
  </div>
</template>

<script setup lang="ts">


import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useProfileStore } from '../stores/profile';
import { useSharedGoalsStore } from '../stores/sharedGoals';
import { getFromStorage, setToStorage } from '../utils';
import { ApiService } from '../services/api';
import ProfileSnapshotModal from '../components/ProfileSnapshotModal.vue';

const auth = useAuthStore();
const profileStore = useProfileStore();
const sharedGoalsStore = useSharedGoalsStore();
const router = useRouter();

const displayName = computed(() => {
  const profile = profileStore.profile;
  return profile?.displayname?.trim() || auth.user?.username || '';
});


const stats = ref({
  goals: 0,
  milestones: 0,
  matches: 0,
  messages: 0,
});

// Get list of handled invite IDs from localStorage
function getHandledInviteIds(): string[] {
  return getFromStorage<string[]>('handledInviteIds', []);
}

// Save an invite ID as handled
function markInviteAsHandled(id: string) {
  const handled = getHandledInviteIds();
  if (!handled.includes(id)) {
    handled.push(id);
    setToStorage('handledInviteIds', handled);
  }
}

// All available invites (TODO: Replace with real API call)
const allInvites = [
  // Invites will be populated from API
];

// Filter out handled invites
const handledIds = getHandledInviteIds();
const pendingInvites = ref(
  allInvites.filter(invite => !handledIds.includes(invite.id))
);

const showProfileModal = ref(false);
const modalProfile = ref(null);

function openProfileModal(profile) {
  modalProfile.value = profile;
  showProfileModal.value = true;
}
function closeProfileModal() {
  showProfileModal.value = false;
  modalProfile.value = null;
}

async function acceptInvite(id) {
  // TODO: Replace with real API call
  markInviteAsHandled(id);
  pendingInvites.value = pendingInvites.value.filter(invite => invite.id !== id);
  // Wait for Vue to update the DOM before navigating
  await nextTick();
  // Optionally show a toast/notification
  router.push('/messages');
}

function declineInvite(id) {
  // TODO: Replace with real API call
  markInviteAsHandled(id);
  pendingInvites.value = pendingInvites.value.filter(invite => invite.id !== id);
  // Optionally show a toast/notification
}

async function fetchMatches() {
  if (!auth.user?.id) {
    stats.value.matches = 0;
    return;
  }

  try {
    // Use the correct endpoint: _getMatches from OneRunMatching concept
    const result = await ApiService.callConceptAction<Array<{ _id: string; userA: string; userB: string; completed: boolean }>>(
      'OneRunMatching',
      '_getMatches',
      { user: auth.user.id }
    );
    
    // Handle different response formats
    let matches: Array<{ _id: string; userA: string; userB: string; completed: boolean }> = [];
    if (Array.isArray(result)) {
      matches = result;
    } else if (result && typeof result === 'object' && 'matches' in result && Array.isArray(result.matches)) {
      matches = result.matches;
    }
    
    // Filter to only active (non-completed) runs
    const activeMatches = matches.filter((run) => run && !run.completed);
    stats.value.matches = activeMatches.length;
  } catch (e: any) {
    console.warn('Failed to fetch matches from API:', e?.message || e);
    // Fallback to profile matches if API call fails
    const profile = profileStore.profile;
    stats.value.matches = profile?.matches?.length || 0;
    // Don't show error to user, just use fallback
  }
}

onMounted(async () => {
  await profileStore.fetchProfile();
  await sharedGoalsStore.fetchAllSharedGoalsForUser(auth.user.id);
  await fetchMatches();
  
  const profile = profileStore.profile;
  stats.value.goals = sharedGoalsStore.sharedGoals.length;
  stats.value.milestones = profile?.milestones?.length || 0;
  stats.value.messages = profile?.messages?.length || 0;
});
</script>

<style scoped>
.dashboard-home {
  max-width: 700px;
  margin: 2.5rem auto;
  background: #F9FAFB;
  border-radius: 16px;
  padding: 2.5rem 3.5rem 2.2rem 3.5rem;
  text-align: center;
}

.pending-invites-section {
  margin-top: 2.5rem;
  background: #f7fafd;
  border-radius: 12px;
  padding: 1.5rem 2rem 2rem 2rem;
  text-align: left;
}
.pending-invites-title {
  color: var(--color-primary);
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1.2rem;
}
.pending-invites-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
.invite-card {
  background: #F9FAFB;
  border-radius: 8px;
  padding: 1.1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.invite-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.invite-from {
  color: var(--color-primary);
  font-weight: 600;
}
.invite-message {
  color: #444;
  font-size: 1.01rem;
}
.invite-actions {
  display: flex;
  gap: 0.7rem;
}
.btn-accept {
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5em 1.2em;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-accept:hover {
  background: var(--color-primary-dark);
}
.btn-decline {
  background: #F9FAFB;
  color: var(--color-error);
  border: 1.5px solid var(--color-error);
  border-radius: 6px;
  padding: 0.5em 1.2em;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-decline:hover {
  background: var(--color-error);
  color: #fff;
}
.dashboard-home {
  max-width: 700px;
  margin: 2.5rem auto;
  background: #F9FAFB;
  border-radius: 16px;
  padding: 2.5rem 3.5rem 2.2rem 3.5rem;
  text-align: center;
}
.dashboard-home h1 {
  color: var(--color-primary);
  font-size: 2.2rem;
  margin-bottom: 1.2rem;
}
.dashboard-welcome-msg {
  color: #555;
  font-size: 1.15rem;
  margin-bottom: 2.2rem;
}
.dashboard-stats {
  display: flex;
  justify-content: center;
  gap: 2.2rem;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
}
.stat-card {
  background: #f7fafd;
  border-radius: 10px;
  padding: 1.2rem 2.2rem;
  min-width: 120px;
}
.stat-label {
  color: var(--color-primary);
  font-weight: 600;
  margin-bottom: 0.5em;
}
.stat-value {
  font-size: 1.7rem;
  font-weight: 700;
  color: #222;
}

.dashboard-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
}
.spinner {
  width: 48px;
  height: 48px;
  border: 6px solid var(--color-primary-border);
  border-top: 6px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.profile-link {
  color: var(--color-accent);
  cursor: pointer;
  border-radius: 6px;
  padding: 0.1em 0.4em;
  transition: color 0.2s, background 0.2s;
}
.profile-link:hover {
  background: #fdf4e8;
  text-decoration: none;
}
</style>
