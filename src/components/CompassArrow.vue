<template>
  <div class="compass-container">
    <div 
      class="compass-arrow" 
      :style="{ transform: `rotate(${bearing}deg)` }"
    >
      <ChevronUpIcon class="arrow-icon" />
    </div>
    <div class="compass-circle"></div>
  </div>
</template>

<script setup lang="ts">
import { ChevronUpIcon } from '@heroicons/vue/24/solid';

interface Props {
  bearing: number; // направление в градусах
}

defineProps<Props>();
</script>

<style scoped>
.compass-container {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 2rem auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compass-arrow {
  position: absolute;
  z-index: 2;
  transition: transform 0.3s ease-in-out;
  transform-origin: center bottom;
}

.arrow-icon {
  width: 60px;
  height: 60px;
  color: #ef4444; /* red-500 */
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.compass-circle {
  width: 180px;
  height: 180px;
  border: 3px solid #e5e7eb; /* gray-200 */
  border-radius: 50%;
  background: linear-gradient(45deg, #f3f4f6 0%, #e5e7eb 100%);
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.1),
    0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
}

.compass-circle::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  background: #374151; /* gray-700 */
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.8);
}

/* Маркировки направлений */
.compass-circle::after {
  content: '';
  position: absolute;
  top: 10px;
  left: 50%;
  width: 2px;
  height: 20px;
  background: #374151; /* gray-700 */
  transform: translateX(-50%);
  border-radius: 1px;
}

/* Адаптивность */
@media (max-width: 640px) {
  .compass-container {
    width: 160px;
    height: 160px;
  }
  
  .arrow-icon {
    width: 50px;
    height: 50px;
  }
  
  .compass-circle {
    width: 140px;
    height: 140px;
  }
}
</style>
