<template>
  <div class="dashboard-layout">
    <aside class="sidebar">
      <nav>
        <ul>
          <li><router-link to="/dashboard/profile">Profile</router-link></li>
          <li><router-link to="/dashboard/goals">Shared Goals</router-link></li>
          <li><router-link to="/dashboard/milestones">Milestones</router-link></li>
          <li><router-link to="/dashboard/messages">Messages</router-link></li>
          <li><router-link to="/dashboard/matches">Matches</router-link></li>
        </ul>
        <button class="sidebar-logout" @click="onLogout">Logout</button>
      </nav>
    </aside>
    <main class="dashboard-main">
      <router-view />
    </main>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth';
export default {
  name: 'DashboardLayout',
  setup() {
    const auth = useAuthStore();
    const onLogout = async () => {
      await auth.logout();
    };
    return { onLogout };
  },
}
</script>

<style scoped>
.dashboard-layout {
  display: flex;

  background: #f7fafd;
}
.sidebar {
  width: 150px;
  background: #fff;
  border-right: 1.5px solid #e3e8f0;
  padding: 1.0rem 0.5rem 1.0rem 0.5rem;
  min-height: 100vh;
}
.sidebar nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sidebar nav ul li {
  margin-bottom: 1rem;
}
.sidebar nav ul li:last-child {
  margin-bottom: 0;
}
.sidebar a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 1.04rem;
  padding: 0.35em 0.6em;
  border-radius: 6px;
  display: block;
  transition: background 0.18s, color 0.18s;
}
.sidebar a.router-link-exact-active,
.sidebar a.router-link-active {
  background: #e3e8f0;
  color: #106cb8;
}
.dashboard-main {
  flex: 1;
  padding: 1.2rem 0.5rem 1.2rem 0.5rem;
  min-width: 0;
}

.sidebar-logout {
  width: 100%;
  margin-top: 2.5rem;
  background: #ff7043;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.7em 0;
  font-weight: 700;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.18s;
  display: block;
}
.sidebar-logout:hover {
  background: #d84315;
}
</style>

