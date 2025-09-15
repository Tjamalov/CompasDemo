<template>
  <div class="compass-app">
    <header class="app-header">
      <h1 class="app-title">Компас</h1>
      <PointSelector
        :points="points"
        :is-loading="isLoadingPoints"
        :selected-point-id="selectedPoint?.id"
        @point-changed="handlePointChange"
      />
    </header>

    <main class="app-main">
      <LocationStatus
        :is-loading="isLoadingLocation"
        :has-location="!!currentLocation"
        :error="locationError"
        @retry-location="getCurrentLocation"
      />

      <div v-if="currentLocation && selectedPoint" class="compass-section">
        <CompassArrow :bearing="routeData?.bearing || 0" />
        
        <DistanceDisplay
          :distance="routeData?.distance || null"
          :duration="routeData?.duration || null"
          :error="routeError"
        />
      </div>

      <div v-else-if="!isLoadingLocation && !locationError" class="empty-state">
        <MapPinIcon class="empty-icon" />
        <p class="empty-text">
          {{ !currentLocation ? 'Определите местоположение' : 'Выберите точку назначения' }}
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { MapPinIcon } from '@heroicons/vue/24/outline';
import type { Point, Location, RouteData, CompassState } from '@/types';
import { initDatabase, getAllPoints, getPointById, saveDatabase } from '@/database/sqlite';
import { getCurrentLocation as getCurrentLocationUtil, watchLocation, clearLocationWatch } from '@/utils/geolocation';
import { getWalkingRoute, getDirectBearing } from '@/utils/mapbox';
import { initTelegram } from '@/utils/telegram';
import PointSelector from './PointSelector.vue';
import CompassArrow from './CompassArrow.vue';
import DistanceDisplay from './DistanceDisplay.vue';
import LocationStatus from './LocationStatus.vue';

// Состояние приложения
const state = ref<CompassState>({
  currentLocation: null,
  selectedPoint: null,
  routeData: null,
  isLoading: false,
  error: null
});

// Дополнительные состояния
const isLoadingLocation = ref(false);
const isLoadingPoints = ref(false);
const locationError = ref<string | null>(null);
const routeError = ref<string | null>(null);
const points = ref<Point[]>([]);
const watchId = ref<number | null>(null);

// Вычисляемые свойства
const currentLocation = computed(() => state.value.currentLocation);
const selectedPoint = computed(() => state.value.selectedPoint);
const routeData = computed(() => state.value.routeData);

// Инициализация приложения
onMounted(async () => {
  try {
    // Инициализируем Telegram SDK
    initTelegram();
    
    // Инициализируем базу данных
    await initDatabase();
    
    // Загружаем точки
    await loadPoints();
    
    // Получаем текущее местоположение
    await getCurrentLocation();
    
    // Начинаем отслеживание геолокации
    startLocationWatching();
    
    // Сохраняем базу данных периодически
    setInterval(saveDatabase, 30000); // каждые 30 секунд
  } catch (error) {
    console.error('Ошибка инициализации приложения:', error);
    state.value.error = 'Ошибка инициализации приложения';
  }
});

// Загрузка точек из базы данных
async function loadPoints(): Promise<void> {
  try {
    isLoadingPoints.value = true;
    points.value = getAllPoints();
  } catch (error) {
    console.error('Ошибка загрузки точек:', error);
  } finally {
    isLoadingPoints.value = false;
  }
}

// Получение текущего местоположения
async function getCurrentLocation(): Promise<void> {
  try {
    isLoadingLocation.value = true;
    locationError.value = null;
    
    const location = await getCurrentLocationUtil();
    state.value.currentLocation = location;
    
    // Если есть выбранная точка, обновляем маршрут
    if (state.value.selectedPoint) {
      await updateRoute();
    }
  } catch (error) {
    locationError.value = error instanceof Error ? error.message : 'Ошибка получения геолокации';
    console.error('Ошибка получения геолокации:', error);
  } finally {
    isLoadingLocation.value = false;
  }
}

// Начало отслеживания геолокации
function startLocationWatching(): void {
  if (watchId.value) {
    clearLocationWatch(watchId.value);
  }
  
  watchId.value = watchLocation(
    (location: Location) => {
      state.value.currentLocation = location;
      if (state.value.selectedPoint) {
        updateRoute();
      }
    },
    (error: Error) => {
      locationError.value = error.message;
      console.error('Ошибка отслеживания геолокации:', error);
    }
  );
}

// Обработка изменения выбранной точки
async function handlePointChange(pointId: number | null): Promise<void> {
  if (!pointId) {
    state.value.selectedPoint = null;
    state.value.routeData = null;
    routeError.value = null;
    return;
  }
  
  const point = getPointById(pointId);
  if (!point) {
    routeError.value = 'Точка не найдена';
    return;
  }
  
  state.value.selectedPoint = point;
  
  if (state.value.currentLocation) {
    await updateRoute();
  }
}

// Обновление маршрута
async function updateRoute(): Promise<void> {
  if (!state.value.currentLocation || !state.value.selectedPoint) {
    return;
  }
  
  try {
    routeError.value = null;
    
    // Парсим координаты точки
    const [lng, lat] = state.value.selectedPoint.coordinates.split(',').map(Number);
    const targetLocation: Location = { latitude: lat, longitude: lng };
    
    // Пытаемся получить пешеходный маршрут
    let route = await getWalkingRoute(state.value.currentLocation, targetLocation);
    
    // Если маршрут не получен, используем прямое направление
    if (!route) {
      const bearing = getDirectBearing(state.value.currentLocation, targetLocation);
      route = {
        distance: 0, // расстояние будем вычислять отдельно
        bearing: bearing
      };
    }
    
    state.value.routeData = route;
  } catch (error) {
    routeError.value = 'Ошибка построения маршрута';
    console.error('Ошибка обновления маршрута:', error);
  }
}

// Очистка при размонтировании
import { onUnmounted } from 'vue';
onUnmounted(() => {
  if (watchId.value) {
    clearLocationWatch(watchId.value);
  }
  saveDatabase();
});
</script>

<style scoped>
.compass-app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.app-header {
  text-align: center;
  margin-bottom: 2rem;
}

.app-title {
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.app-main {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.compass-section {
  text-align: center;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280; /* gray-500 */
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1rem;
  color: #d1d5db; /* gray-300 */
}

.empty-text {
  font-size: 1.125rem;
  font-weight: 500;
}

/* Адаптивность */
@media (max-width: 640px) {
  .compass-app {
    padding: 0.5rem;
  }
  
  .app-title {
    font-size: 1.75rem;
    margin-bottom: 1rem;
  }
  
  .app-main {
    padding: 1.5rem;
    border-radius: 0.75rem;
  }
  
  .empty-state {
    padding: 2rem 1rem;
  }
  
  .empty-icon {
    width: 3rem;
    height: 3rem;
  }
  
  .empty-text {
    font-size: 1rem;
  }
}
</style>
