<template>
  <div class="home-outer">
    <section class="home">
      <div class="logo-container">
        <img alt="RunningBuddy" class="home-logo" src="../assets/RunBuddy.png" width="240" height="240" />
      </div>
      <p class="home-subtitle">Find your perfect running partner, set goals, and celebrate milestones together.</p>
      <div class="home-actions">
        <router-link to="/register" class="btn-primary">Register</router-link>
        <router-link to="/login" class="btn-secondary">Log In</router-link>
      </div>
      <div class="home-features">
        <div class="feature-card">
          <h2>Find a Buddy</h2>
          <p>Match with runners nearby for one-time or long-term runs.</p>
        </div>
        <div class="feature-card">
          <h2>Shared Goals</h2>
          <p>Set and track running goals with your partner.</p>
        </div>
        <div class="feature-card">
          <h2>Milestone Map</h2>
          <p>Mark your achievements and favorite running spots together.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-outer {
  display: flex;
  align-items: center;
  justify-content: center;
}
.home {
  background: #fff;
  border-radius: 16px;
  text-align: center;
}
.home-subtitle {
  color: var(--color-secondary);
  font-size: 1.2rem;
  margin-bottom: 2rem;
}
.home-actions {
  margin-bottom: 2.5rem;
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}
.btn-primary, .btn-secondary {
  padding: 0.7em 2em;
  border-radius: 6px;
  font-weight: 600;
  font-size: 1.1rem;
  transition: background 0.2s, color 0.2s;
  color: #fff;
}
.btn-primary {
  background: var(--color-primary);
}

.btn-secondary {
  background: var(--color-secondary);
}

.btn-primary:hover {
  background: #106cb8;
}

.btn-secondary:hover {
  background: #092750;
}

.home-features {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
  margin-top: 2rem;
}
.feature-card {
  flex: 1 1 180px;
  min-width: 180px;
  max-width: 220px;
  background: #f7fafd;
  border: 1.5px solid var(--color-primary);
  border-radius: 10px;
  padding: 1.2rem 1rem;
}
.feature-card h2 {
  font-family: 'Noto Serif', serif;
  color: var(--color-primary);
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}
.feature-card p {
  color: var(--color-secondary);
  font-size: 1rem;
}
</style>
