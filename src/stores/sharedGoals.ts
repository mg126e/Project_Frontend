import { defineStore } from 'pinia';
import axios from 'axios';

interface SharedGoal {
  id: string;
  description: string;
  isActive: boolean;
}

export const useSharedGoalsStore = defineStore('sharedGoals', {
  state: () => ({
    sharedGoals: [] as SharedGoal[],
    loading: false,
    error: '',
  }),
  actions: {
    async fetchSharedGoals(users: string[]) {
      this.loading = true;
      this.error = '';
      // MOCK: Always show test goals for layout preview
      await new Promise(r => setTimeout(r, 400));
      this.sharedGoals = [
        { id: 'goal1', description: 'Run a 5K together', isActive: true },
        { id: 'goal2', description: 'Complete 10,000 steps daily', isActive: false },
        { id: 'goal3', description: 'Weekly group hike', isActive: true },
      ];
      this.loading = false;
    },
    async createSharedGoal({ users, description }: { users: string[]; description: string }) {
      this.error = '';
      try {
        const { data } = await axios.post('/api/shared-goals', { users, description });
        return data;
      } catch (e) {
        this.error = 'Failed to create shared goal.';
        return { error: this.error };
      }
    },
    async closeSharedGoal({ sharedGoal, user }: { sharedGoal: string; user: string }) {
      this.error = '';
      try {
        await axios.post(`/api/shared-goals/${sharedGoal}/close`, { user });
        // Optionally refresh list
      } catch (e) {
        this.error = 'Failed to close shared goal.';
      }
    },
  },
});
