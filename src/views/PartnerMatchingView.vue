<template>
  <section class="matches-page">
    <div class="matches-buttons">
      <router-link to="/find-buddy" class="onetime-button">
        <h2>One Run Matching</h2>
      </router-link>
      <router-link to="/matches/partner" class="onetime-button partner-button">
        <h2>Partner Matching</h2>
      </router-link>
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
  gap: 3rem;
  width: 100%;
  max-width: 1000px;
  justify-content: center;
}

.onetime-button {
  flex: 1;
  min-width: 300px;
  max-width: 400px;
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: 16px;
  padding: 4rem 3rem;
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
  font-size: 2rem;
  font-weight: 700;
  color: white;
  text-align: center;
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
  
  .onetime-button {
    max-width: 100%;
  }
}
</style>