import { createRouter, createWebHistory } from 'vue-router'
import CompassApp from '@/components/CompassApp.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: CompassApp
    }
  ],
})

export default router
