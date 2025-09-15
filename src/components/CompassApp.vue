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
        <CompassArrow 
          :bearing="compassBearing"
          :device-heading="deviceHeading"
          :compass-accuracy="compassAccuracy"
        />
        
        <DistanceDisplay
          :distance="routeData?.distance || null"
          :duration="routeData?.duration || null"
          :error="routeError"
        />

        <div class="map-section">
          <h3 class="map-title">Маршрут</h3>
          <MapboxMap
            :current-location="currentLocation"
            :selected-point="selectedPoint"
            :route-geometry="routeGeometry"
            height="300px"
          />
        </div>
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
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { MapPinIcon } from '@heroicons/vue/24/outline';
import type { Point, Location, RouteData, CompassState } from '@/types';
import { initDatabase, getAllPoints, getPointById, saveDatabase } from '@/database/sqlite';
import { getCurrentLocation as getCurrentLocationUtil, watchLocation, clearLocationWatch } from '@/utils/geolocation';
import { calculateRoute, calculateRouteWithGeometry } from '@/utils/route';
import { getCurrentSegmentBearing } from '@/utils/mapbox';
import { createCompass, isCompassSupported, requestCompassPermission, type CompassData } from '@/utils/compass';
import { initTelegram } from '@/utils/telegram';
import PointSelector from './PointSelector.vue';
import CompassArrow from './CompassArrow.vue';
import DistanceDisplay from './DistanceDisplay.vue';
import LocationStatus from './LocationStatus.vue';
import MapboxMap from './MapboxMap.vue';

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
const routeGeometry = ref<any>(null);

// Состояние компаса
const deviceHeading = ref(0);
const compassAccuracy = ref<number | null>(null);
const compassError = ref<string | null>(null);
const compassSupported = ref(false);
const compass = ref<ReturnType<typeof createCompass> | null>(null);

// Вычисляемые свойства
const currentLocation = computed(() => state.value.currentLocation);
const selectedPoint = computed(() => state.value.selectedPoint);
const routeData = computed(() => state.value.routeData);

// Направление для компаса - навигация по сегментам маршрута
const compassBearing = computed(() => {
  if (!currentLocation.value || !selectedPoint.value) return 0;
  
  // Если есть геометрия маршрута, используем навигацию по сегментам
  if (routeGeometry.value) {
    const segmentBearing = getCurrentSegmentBearing(currentLocation.value, routeGeometry.value);
    if (segmentBearing !== null) {
      console.log('Компас: используем направление текущего сегмента маршрута:', segmentBearing);
      return segmentBearing;
    }
  }
  
  // Если есть маршрут без геометрии, используем его направление
  if (routeData.value?.bearing) {
    console.log('Компас: используем направление маршрута:', routeData.value.bearing);
    return routeData.value.bearing;
  }
  
  // Fallback: вычисляем прямое направление к точке
  const [lng, lat] = selectedPoint.value.coordinates.split(',').map(Number);
  const targetLocation = { latitude: lat, longitude: lng };
  
  const φ1 = currentLocation.value.latitude * Math.PI / 180;
  const φ2 = targetLocation.latitude * Math.PI / 180;
  const Δλ = (targetLocation.longitude - currentLocation.value.longitude) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const directBearing = (θ * 180 / Math.PI + 360) % 360;
  
  console.log('Компас: используем прямое направление:', directBearing);
  return directBearing;
});

// Watchers

// Обновляем маршрут при изменении местоположения
watch(currentLocation, async (newLocation, oldLocation) => {
  if (newLocation && selectedPoint.value && oldLocation) {
    // Вычисляем расстояние в метрах
    const R = 6371000; // радиус Земли в метрах
    const φ1 = oldLocation.latitude * Math.PI / 180;
    const φ2 = newLocation.latitude * Math.PI / 180;
    const Δφ = (newLocation.latitude - oldLocation.latitude) * Math.PI / 180;
    const Δλ = (newLocation.longitude - oldLocation.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // расстояние в метрах
    
    // Обновляем маршрут чаще для навигации
    if (distance > 5) { // каждые 5 метров
      console.log(`Обновление маршрута: перемещение на ${Math.round(distance)}м`);
      await updateRoute();
    }
  }
}, { deep: true });

// Обновляем направление компаса при каждом изменении местоположения
// (без пересчета маршрута, только направление)
watch(currentLocation, (newLocation, oldLocation) => {
  if (newLocation && selectedPoint.value && oldLocation) {
    // Вычисляем расстояние в метрах
    const R = 6371000;
    const φ1 = oldLocation.latitude * Math.PI / 180;
    const φ2 = newLocation.latitude * Math.PI / 180;
    const Δφ = (newLocation.latitude - oldLocation.latitude) * Math.PI / 180;
    const Δλ = (newLocation.longitude - oldLocation.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Обновляем направление компаса каждые 2 метра для плавности
    if (distance > 2) {
      console.log(`Обновление направления компаса: перемещение на ${Math.round(distance)}м`);
      // Направление обновится автоматически через computed compassBearing
    }
  }
}, { deep: true });

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
    
    // Инициализируем компас
    await initCompass();
    
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

// Инициализация компаса
async function initCompass(): Promise<void> {
  try {
    compassSupported.value = isCompassSupported();
    
    if (!compassSupported.value) {
      console.warn('Компас не поддерживается в этом браузере');
      return;
    }

    // Запрашиваем разрешение на доступ к датчикам
    const hasPermission = await requestCompassPermission();
    if (!hasPermission) {
      compassError.value = 'Нет разрешения на доступ к датчикам компаса';
      return;
    }

    // Создаем экземпляр компаса
    compass.value = createCompass({
      frequency: 100,
      enableHighAccuracy: true
    });

    // Начинаем отслеживание
    const success = compass.value.start(
      (data: CompassData) => {
        deviceHeading.value = data.heading;
        compassAccuracy.value = data.accuracy;
        compassError.value = null;
      },
      (error: Error) => {
        compassError.value = error.message;
        console.error('Ошибка компаса:', error);
      }
    );

    if (!success) {
      compassError.value = 'Не удалось запустить компас';
    }
  } catch (error) {
    compassError.value = 'Ошибка инициализации компаса';
    console.error('Ошибка инициализации компаса:', error);
  }
}

// Обновление маршрута
async function updateRoute(): Promise<void> {
  if (!state.value.currentLocation || !state.value.selectedPoint) {
    return;
  }
  
  try {
    routeError.value = null;
    
    // Получаем маршрут с геометрией для карты
    const routeWithGeometry = await calculateRouteWithGeometry(
      state.value.currentLocation, 
      state.value.selectedPoint,
      {
        useMapbox: true,
        fallbackToDirect: true
      }
    );
    
    if (routeWithGeometry) {
      state.value.routeData = routeWithGeometry.routeData;
      routeGeometry.value = routeWithGeometry.geometry;
    } else {
      // Fallback: используем простой маршрут без геометрии
      const route = await calculateRoute(
        state.value.currentLocation, 
        state.value.selectedPoint,
        {
          useMapbox: true,
          fallbackToDirect: true
        }
      );
      
      state.value.routeData = route;
      routeGeometry.value = null;
    }
  } catch (error) {
    routeError.value = 'Ошибка построения маршрута';
    console.error('Ошибка обновления маршрута:', error);
  }
}

// Очистка при размонтировании
onUnmounted(() => {
  if (watchId.value) {
    clearLocationWatch(watchId.value);
  }
  
  if (compass.value) {
    compass.value.stop();
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

.map-section {
  margin-top: 2rem;
  text-align: left;
}

.map-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
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
