<template>
  <div class="point-selector">
    <label class="selector-label">
      Выберите точку назначения:
    </label>
    <select 
      v-model="selectedPointId" 
      @change="handlePointChange"
      class="selector-dropdown"
      :disabled="isLoading"
    >
      <option value="" disabled>
        {{ isLoading ? 'Загрузка...' : 'Выберите точку' }}
      </option>
      <option 
        v-for="point in points" 
        :key="point.id" 
        :value="point.id"
      >
        {{ point.name }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Point } from '@/types';

interface Props {
  points: Point[];
  isLoading: boolean;
  selectedPointId?: number | null;
}

interface Emits {
  (e: 'point-changed', pointId: number | null): void;
}

const props = withDefaults(defineProps<Props>(), {
  selectedPointId: null
});

const emit = defineEmits<Emits>();

const selectedPointId = ref<number | string>('');

// Синхронизация с внешним значением
onMounted(() => {
  if (props.selectedPointId) {
    selectedPointId.value = props.selectedPointId;
  }
});

const handlePointChange = () => {
  const pointId = selectedPointId.value === '' ? null : Number(selectedPointId.value);
  emit('point-changed', pointId);
};
</script>

<style scoped>
.point-selector {
  margin-bottom: 2rem;
}

.selector-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151; /* gray-700 */
  font-size: 1rem;
}

.selector-dropdown {
  width: 100%;
  max-width: 400px;
  padding: 0.75rem 1rem;
  border: 2px solid #d1d5db; /* gray-300 */
  border-radius: 0.5rem;
  background-color: white;
  font-size: 1rem;
  color: #374151; /* gray-700 */
  cursor: pointer;
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.selector-dropdown:focus {
  outline: none;
  border-color: #3b82f6; /* blue-500 */
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.selector-dropdown:disabled {
  background-color: #f9fafb; /* gray-50 */
  color: #9ca3af; /* gray-400 */
  cursor: not-allowed;
}

.selector-dropdown:hover:not(:disabled) {
  border-color: #9ca3af; /* gray-400 */
}

/* Адаптивность */
@media (max-width: 640px) {
  .selector-label {
    font-size: 0.9rem;
  }
  
  .selector-dropdown {
    padding: 0.625rem 0.875rem;
    font-size: 0.9rem;
  }
}
</style>
