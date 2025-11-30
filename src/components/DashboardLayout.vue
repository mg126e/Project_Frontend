<template>
  <div class="dashboard-layout">
    <nav class="topbar">
      <h1>RunBuddy</h1>
      <ul>
        <li><router-link to="/dashboard">Dashboard</router-link></li>
        <li><router-link to="/matches">Matches</router-link></li>
        <li><router-link to="/messages">Messages</router-link></li>
        <li><router-link to="/goals">Shared Goals</router-link></li>
        <li><router-link to="/milestones">Milestones</router-link></li>
      </ul>
      <div class="topbar-right">
        <router-link to="/profile" class="profile-avatar-link">
          <div v-if="profile.profileImage" class="topbar-profile-preview">
            <img :src="profile.profileImage" alt="Profile" class="topbar-profile-img" />
          </div>
          <div v-else class="topbar-profile-fallback">
            <span>{{ (auth.user?.username?.charAt(0) || '?').toUpperCase() }}</span>
          </div>
        </router-link>
        <button class="topbar-logout" @click="onLogout">Logout</button>
      </div>
    </nav>
    <main class="dashboard-main">
      <router-view />
    </main>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth';
import { useProfileStore } from '../stores/profile';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
export default {
  name: 'DashboardLayout',
  setup() {
    const auth = useAuthStore();
    const router = useRouter();
    const profileStore = useProfileStore();
    const { profile } = storeToRefs(profileStore);
    
    const onLogout = async () => {
      await auth.logout();
      router.push({ name: 'login' });
    };
    return { auth, profile, onLogout };
  },
}
</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  background: #f7fafd;
  display: flex;
  flex-direction: column;
}
.topbar {
  width: 100%;
  background: #fff;
  border-bottom: 1.5px solid var(--color-primary-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.5rem;
  min-height: 56px;
  box-sizing: border-box;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.profile-avatar-link {
  text-decoration: none;
  display: flex;
  align-items: center;
}
.topbar-profile-preview {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--color-primary);
  transition: border-color 0.18s;
}

.topbar-profile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.topbar-profile-fallback {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-accent, orange);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
  color: #fff;
  border: 2px solid var(--color-primary);
  transition: border-color 0.18s;
}

.topbar ul {
  display: flex;
  gap: 1.2rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.topbar ul li {
  margin: 0;
}
.topbar a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 1.04rem;
  padding: 0.35em 0.8em;
  border-radius: 6px;
  transition: background 0.18s, color 0.18s;
  display: block;
}
.topbar a:hover {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}
.dashboard-main {
  flex: 1;
  min-height: 0;
  min-width: 0;
  padding: 1.2rem 1.2rem 1.2rem 1.2rem;
  display: flex;
  flex-direction: column;
  max-width: 100%;
}
.topbar-logout {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.6em 1.2em;
  font-weight: 700;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.18s;
}
.topbar-logout:hover {
  background: var(--color-accent-dark);
}
</style>

