<template>
  <div class="compass-container">
    <div 
      class="compass-arrow" 
      :style="{ transform: `rotate(${relativeBearing}deg)` }"
    >
      <ChevronUpIcon class="arrow-icon" />
    </div>
    
    <!-- Индикатор качества компаса -->
    <div v-if="compassQuality !== 'unknown'" class="compass-quality" :class="`quality-${compassQuality}`">
      <div class="quality-indicator"></div>
      <span class="quality-text">{{ qualityText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronUpIcon } from '@heroicons/vue/24/solid';
import { calculateRelativeBearing, getCompassQuality, formatHeading } from '@/utils/compass';

interface Props {
  bearing: number; // направление к цели в градусах
  deviceHeading?: number; // направление устройства в градусах
  compassAccuracy?: number | null; // точность компаса
}

const props = withDefaults(defineProps<Props>(), {
  deviceHeading: 0,
  compassAccuracy: null
});

// Вычисляем относительное направление с учетом ориентации устройства
const relativeBearing = computed(() => {
  return calculateRelativeBearing(props.bearing, props.deviceHeading);
});

// Качество сигнала компаса
const compassQuality = computed(() => {
  return getCompassQuality(props.compassAccuracy);
});

// Текст качества компаса
const qualityText = computed(() => {
  switch (compassQuality.value) {
    case 'excellent': return 'Отлично';
    case 'good': return 'Хорошо';
    case 'poor': return 'Плохо';
    default: return 'Неизвестно';
  }
});
</script>

<style scoped>
.compass-container {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 2rem auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compass-arrow {
  position: absolute;
  z-index: 3;
  transition: transform 0.3s ease-in-out;
  transform-origin: center bottom;
}

.arrow-icon {
  width: 80px;
  height: 80px;
  color: #ef4444; /* red-500 */
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

/* Индикатор качества компаса */
.compass-quality {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.quality-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.quality-excellent .quality-indicator {
  background: #10b981; /* emerald-500 */
}

.quality-good .quality-indicator {
  background: #f59e0b; /* amber-500 */
}

.quality-poor .quality-indicator {
  background: #ef4444; /* red-500 */
}

.quality-text {
  color: #374151; /* gray-700 */
}

/* Адаптивность */
@media (max-width: 640px) {
  .compass-container {
    width: 100px;
    height: 100px;
  }
  
  .arrow-icon {
    width: 60px;
    height: 60px;
  }
  
  .compass-quality {
    bottom: -25px;
    font-size: 0.625rem;
  }
}
</style>
