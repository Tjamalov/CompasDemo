<template>
  <div class="location-status">
    <div class="status-indicator" :class="statusClass">
      <div class="status-dot"></div>
      <span class="status-text">{{ statusText }}</span>
    </div>
    
    <button 
      v-if="showRetryButton" 
      @click="$emit('retry-location')"
      class="retry-button"
    >
      <ArrowPathIcon class="retry-icon" />
      Попробовать снова
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ArrowPathIcon } from '@heroicons/vue/24/outline';

interface Props {
  isLoading: boolean;
  hasLocation: boolean;
  error: string | null;
}

interface Emits {
  (e: 'retry-location'): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

const statusText = computed(() => {
  if (props.isLoading) return 'Получение местоположения...';
  if (props.error) return props.error;
  if (props.hasLocation) return 'Местоположение определено';
  return 'Местоположение не определено';
});

const statusClass = computed(() => {
  if (props.isLoading) return 'status-loading';
  if (props.error) return 'status-error';
  if (props.hasLocation) return 'status-success';
  return 'status-idle';
});

const showRetryButton = computed(() => {
  return props.error || (!props.hasLocation && !props.isLoading);
});
</script>

<style scoped>
.location-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-loading {
  background-color: #fef3c7; /* yellow-100 */
  color: #d97706; /* amber-600 */
}

.status-loading .status-dot {
  background-color: #f59e0b; /* amber-500 */
}

.status-success {
  background-color: #d1fae5; /* emerald-100 */
  color: #059669; /* emerald-600 */
}

.status-success .status-dot {
  background-color: #10b981; /* emerald-500 */
  animation: none;
}

.status-error {
  background-color: #fee2e2; /* red-100 */
  color: #dc2626; /* red-600 */
}

.status-error .status-dot {
  background-color: #ef4444; /* red-500 */
  animation: none;
}

.status-idle {
  background-color: #f3f4f6; /* gray-100 */
  color: #6b7280; /* gray-500 */
}

.status-idle .status-dot {
  background-color: #9ca3af; /* gray-400 */
  animation: none;
}

.retry-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #3b82f6; /* blue-500 */
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}

.retry-button:hover {
  background-color: #2563eb; /* blue-600 */
}

.retry-button:active {
  background-color: #1d4ed8; /* blue-700 */
}

.retry-icon {
  width: 1rem;
  height: 1rem;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Адаптивность */
@media (max-width: 640px) {
  .status-indicator {
    font-size: 0.8rem;
    padding: 0.375rem 0.75rem;
  }
  
  .retry-button {
    font-size: 0.8rem;
    padding: 0.375rem 0.75rem;
  }
  
  .retry-icon {
    width: 0.875rem;
    height: 0.875rem;
  }
}
</style>
