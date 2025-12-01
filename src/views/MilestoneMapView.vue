<template>
  <section class="milestone-map-page">
    <h1>Milestone Map</h1>
    <div class="milestone-map-placeholder">
      <p>This is where your milestone map will appear.</p>
    </div>
  </section>
</template>

<script setup>

</script>

<style scoped>
.milestone-map-page {
  min-width: 800px;
  background: #fff;
  border-radius: 24px;
  padding: 3.5rem 4.5rem 3.5rem 4.5rem;
}
.milestone-map-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: #f7fafd;
  border-radius: 16px;
  color: #888;
  font-size: 1.25rem;
  border: 1.5px dashed var(--color-primary-border);
}
</style>