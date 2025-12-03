<template>
  <div class="run-invite-view">
    <h1>Run Invite</h1>
    <p>Run invite view for ID: {{ $route.params.id }}</p>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<style scoped>
.run-invite-view {
  padding: 2rem;
}
</style>

