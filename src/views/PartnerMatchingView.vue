<template>
  <section class="matches-page">
    <div class="matches-buttons">
      <div class="button-wrapper">
        <router-link to="/find-buddy" class="onetime-button">
          <h2>One Run Matching</h2>
        </router-link>
        <p class="button-description">Create and accept one time run invites from other users in your area!</p>
      </div>
      <div class="button-wrapper">
        <router-link to="/matches/partner" class="onetime-button partner-button">
          <h2>Partner Matching</h2>
        </router-link>
        <p class="button-description">Filter and find a long-term running partner in your region!</p>
      </div>
    </div>
  </section>
</template>

<script setup>
</script>

<style scoped>
.matches-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
}

.matches-buttons {
  display: flex;
  gap: 3.9rem;
  width: 100%;
  max-width: 1300px;
  justify-content: center;
}

.button-wrapper {
  flex: 1;
  min-width: 390px;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.3rem;
}

.onetime-button {
  width: 100%;
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: 20.8px;
  padding: 5.2rem 3.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.onetime-button:hover {
  background: var(--color-primary-dark);
  transform: translateY(-4px);
}

.onetime-button h2 {
  margin: 0;
  font-size: 2.6rem;
  font-weight: 700;
  color: white;
  text-align: center;
}

.button-description {
  margin: 0;
  font-size: 1.3rem;
  color: var(--color-secondary);
  text-align: center;
  line-height: 1.4;
  font-weight: 400;
  padding: 0 1.3rem;
}

.partner-button {
  background: var(--color-accent);
  color: white;
}

.partner-button:hover {
  background: var(--color-accent-dark);
  transform: translateY(-4px);
}

@media (max-width: 768px) {
  .matches-buttons {
    flex-direction: column;
    gap: 2rem;
  }
  
  .button-wrapper {
    max-width: 100%;
  }
  
  .onetime-button {
    max-width: 100%;
  }
}
</style>