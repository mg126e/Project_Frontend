import './assets/main.css'


import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

import { useAuthStore } from './stores/auth'

async function bootstrap() {
	const app = createApp(App)
	app.use(createPinia())
	app.use(router)

	// Wait for auth store to initialize before mounting
	const auth = useAuthStore()
	await auth.init()

	app.mount('#app')
}

// Optionally show a loading spinner until bootstrap completes
const loading = document.createElement('div')
loading.id = 'app-loading-spinner'
loading.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100vh;font-size:1.5rem;color:#106cb8;'
loading.innerText = 'Loading...'
document.body.appendChild(loading)

bootstrap().finally(() => {
	const el = document.getElementById('app-loading-spinner')
	if (el) el.remove()
})
