
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth' // TODO: include here

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'home',
			component: () => import('../views/HomeView.vue'),
		},
		{
			path: '/login',
			name: 'login',
			component: () => import('../views/LoginView.vue'),
			meta: { requiresGuest: true },
		},
		{
			path: '/register',
			name: 'register',
			component: () => import('../views/RegisterView.vue'),
			meta: { requiresGuest: true },
		},
		{
			path: '/verify-email',
			name: 'email-verification',
			component: () => import('../views/EmailVerificationView.vue'),
			meta: { requiresGuest: true },
		},
		{
			path: '/dashboard',
			component: () => import('../views/DashboardLayout.vue'),
			meta: { requiresAuth: false }, // TODO: set to true
			children: [
				{
					path: 'profile',
					name: 'profile',
					component: () => import('../views/UserProfileView.vue'),
				},
				{
					path: 'find-buddy',
					name: 'run-buddy-finder',
					component: () => import('../views/RunBuddyFinderView.vue'),
				},
				{
					path: 'invite/:id',
					name: 'run-invite',
					component: () => import('../views/RunInviteView.vue'),
				},
				{
					path: 'run/:id',
					name: 'scheduled-run',
					component: () => import('../views/ScheduledRunView.vue'),
				},
				{
					path: 'matches',
					name: 'partner-matching',
					component: () => import('../views/PartnerMatchingView.vue'),
				},
				{
					path: 'match/:id',
					name: 'match-detail',
					component: () => import('../views/MatchDetailView.vue'),
				},
				{
					path: 'goals',
					name: 'shared-goals',
					component: () => import('../views/SharedGoalsView.vue'),
				},
				{
					path: 'goal/:id',
					name: 'goal-detail',
					component: () => import('../views/GoalDetailView.vue'),
				},
				{
					path: 'milestones',
					name: 'milestone-map',
					component: () => import('../views/MilestoneMapView.vue'),
				},
				{
					path: 'messages',
					name: 'messages',
					component: () => import('../views/MessagesView.vue'),
				},
				{
					path: 'chat/:id',
					name: 'chat',
					component: () => import('../views/ChatView.vue'),
				},
			],
		},
		{
			path: '/:pathMatch(.*)*',
			name: 'not-found',
			component: () => import('../views/NotFoundView.vue'),
		},
	],
});

export default router;
