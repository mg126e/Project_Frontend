<template>
  <div class="dashboard-layout">
    <nav class="topbar">
      <h1>RunBuddy</h1>
      <ul>
        <li><router-link to="dashboard">Dashboard</router-link></li>
        <li><router-link to="profile">Profile</router-link></li>
        <li><router-link to="goals">Shared Goals</router-link></li>
        <li><router-link to="milestones">Milestones</router-link></li>
        <li><router-link to="messages">Messages</router-link></li>
        <li><router-link to="matches">Matches</router-link></li>
      </ul>
      <button class="topbar-logout" @click="onLogout">Logout</button>
    </nav>
    <main class="dashboard-main">
      <router-view />
    </main>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
export default {
  name: 'DashboardLayout',
  setup() {
    const auth = useAuthStore();
    const router = useRouter();
    const onLogout = async () => {
      await auth.logout();
      router.push({ name: 'login' });
    };
    return { onLogout };
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
  border-bottom: 1.5px solid #e3e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.5rem;
  min-height: 56px;
  box-sizing: border-box;
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
.topbar a.router-link-exact-active,
.topbar a.router-link-active {
  background: #e3e8f0;
  color: #106cb8;
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
  background: #ff7043;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.6em 1.2em;
  font-weight: 700;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.18s;
  margin-left: 1.5rem;
}
.topbar-logout:hover {
  background: #d84315;
}
</style>

