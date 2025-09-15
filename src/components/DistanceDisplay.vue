<template>
  <div class="distance-display">
    <div class="distance-main">
      <span class="distance-value">{{ formattedDistance }}</span>
    </div>
    <div v-if="duration" class="duration-info">
      <ClockIcon class="clock-icon" />
      <span class="duration-text">~{{ formattedDuration }}</span>
    </div>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ClockIcon } from '@heroicons/vue/24/outline';
import { formatDistance, formatDuration } from '@/utils/mapbox';

interface Props {
  distance: number | null; // в метрах
  duration?: number | null; // в секундах
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  duration: null,
  error: null
});

const formattedDistance = computed(() => {
  if (props.distance === null) return '—';
  return formatDistance(props.distance);
});

const formattedDuration = computed(() => {
  if (props.duration === null) return '';
  return formatDuration(props.duration);
});
</script>

<style scoped>
.distance-display {
  text-align: center;
  margin-top: 1.5rem;
}

.distance-main {
  margin-bottom: 0.5rem;
}

.distance-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937; /* gray-800 */
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.duration-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  color: #6b7280; /* gray-500 */
  font-size: 0.875rem;
}

.clock-icon {
  width: 1rem;
  height: 1rem;
}

.duration-text {
  font-weight: 500;
}

.error-message {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background-color: #fef2f2; /* red-50 */
  border: 1px solid #fecaca; /* red-200 */
  border-radius: 0.375rem;
  color: #dc2626; /* red-600 */
  font-size: 0.875rem;
  font-weight: 500;
}

/* Адаптивность */
@media (max-width: 640px) {
  .distance-value {
    font-size: 1.75rem;
  }
  
  .duration-info {
    font-size: 0.8rem;
  }
  
  .clock-icon {
    width: 0.875rem;
    height: 0.875rem;
  }
}
</style>
