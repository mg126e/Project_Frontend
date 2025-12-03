<template>
  <section class="matches-page">
    <div class="matches-buttons">
      <router-link to="/find-buddy" class="match-button">
        <h2>One Run Matching</h2>
      </router-link>
      <router-link to="/matches/partner" class="match-button">
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

.match-button {
  flex: 1;
  min-width: 300px;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--color-primary);
  text-decoration: none;
  border-radius: 24px;
  padding: 4rem 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.3);
  border: none;
}

.match-button:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.25);
  outline: 3px solid var(--color-accent);
}

.match-button h2 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary);
  text-align: center;
  font-family: 'Open Sans', Arial, sans-serif;
}

@media (max-width: 768px) {
  .matches-buttons {
    flex-direction: column;
    gap: 2rem;
  }
  
  .match-button {
    max-width: 100%;
  }
}
</style>