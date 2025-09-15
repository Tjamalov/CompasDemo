<template>
  <div class="mapbox-container">
    <div ref="mapContainer" class="mapbox-map"></div>
    <div v-if="isLoading" class="map-loading">
      <div class="loading-spinner"></div>
      <p>Загрузка карты...</p>
    </div>
    <div v-if="error" class="map-error">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import mapboxgl from 'mapbox-gl';
import type { Location, Point } from '@/types';
import { getMapboxToken, isMapboxAvailable } from '@/utils/mapbox';

// Props
interface Props {
  currentLocation: Location | null;
  selectedPoint: Point | null;
  routeGeometry?: any; // GeoJSON LineString
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  height: '300px'
});

// Refs
const mapContainer = ref<HTMLDivElement | null>(null);
const map = ref<mapboxgl.Map | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Инициализация карты
async function initMap(): Promise<void> {
  if (!mapContainer.value || !isMapboxAvailable()) {
    error.value = 'Mapbox недоступен';
    return;
  }

  try {
    isLoading.value = true;
    error.value = null;

    // Устанавливаем токен
    mapboxgl.accessToken = getMapboxToken();

    // Создаем карту
    map.value = new mapboxgl.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [37.6173, 55.7558], // Москва по умолчанию
      zoom: 10,
      attributionControl: false
    });

    // Добавляем навигационные элементы
    map.value.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Ожидаем загрузки карты
    map.value.on('load', () => {
      isLoading.value = false;
      updateMap();
    });

    map.value.on('error', (e) => {
      console.error('Ошибка карты:', e);
      error.value = 'Ошибка загрузки карты';
      isLoading.value = false;
    });

  } catch (err) {
    console.error('Ошибка инициализации карты:', err);
    error.value = 'Ошибка инициализации карты';
    isLoading.value = false;
  }
}

// Обновление карты при изменении данных
function updateMap(): void {
  if (!map.value || !map.value.isStyleLoaded()) return;

  // Очищаем существующие источники и слои
  clearMap();

  // Добавляем маркеры и маршрут
  addMarkers();
  addRoute();
  
  // Фокусируемся на маршруте
  fitMapToRoute();
}

// Очистка карты
function clearMap(): void {
  if (!map.value) return;

  // Удаляем существующие источники
  const sources = ['route', 'start-marker', 'end-marker'];
  sources.forEach(source => {
    if (map.value!.getSource(source)) {
      map.value!.removeSource(source);
    }
  });

  // Удаляем существующие слои
  const layers = ['route-line', 'start-marker-layer', 'end-marker-layer'];
  layers.forEach(layer => {
    if (map.value!.getLayer(layer)) {
      map.value!.removeLayer(layer);
    }
  });
}

// Добавление маркеров
function addMarkers(): void {
  if (!map.value || !props.currentLocation || !props.selectedPoint) return;

  // Маркер текущего местоположения
  map.value.addSource('start-marker', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [props.currentLocation.longitude, props.currentLocation.latitude]
      },
      properties: {
        title: 'Ваше местоположение'
      }
    }
  });

  // Маркер точки назначения
  const [lng, lat] = props.selectedPoint.coordinates.split(',').map(Number);
  map.value.addSource('end-marker', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      properties: {
        title: props.selectedPoint.name
      }
    }
  });

  // Слои маркеров
  map.value.addLayer({
    id: 'start-marker-layer',
    type: 'circle',
    source: 'start-marker',
    paint: {
      'circle-radius': 8,
      'circle-color': '#3b82f6',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  });

  map.value.addLayer({
    id: 'end-marker-layer',
    type: 'circle',
    source: 'end-marker',
    paint: {
      'circle-radius': 10,
      'circle-color': '#ef4444',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  });
}

// Добавление маршрута
function addRoute(): void {
  if (!map.value || !props.routeGeometry) return;

  map.value.addSource('route', {
    type: 'geojson',
    data: props.routeGeometry
  });

  map.value.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'route',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#3b82f6',
      'line-width': 4,
      'line-opacity': 0.8
    }
  });
}

// Фокусировка на маршруте
function fitMapToRoute(): void {
  if (!map.value || !props.currentLocation || !props.selectedPoint) return;

  const [lng, lat] = props.selectedPoint.coordinates.split(',').map(Number);
  
  const bounds = new mapboxgl.LngLatBounds();
  bounds.extend([props.currentLocation.longitude, props.currentLocation.latitude]);
  bounds.extend([lng, lat]);

  map.value.fitBounds(bounds, {
    padding: 50,
    maxZoom: 16
  });
}

// Watchers
watch([() => props.currentLocation, () => props.selectedPoint, () => props.routeGeometry], () => {
  if (map.value && map.value.isStyleLoaded()) {
    updateMap();
  }
}, { deep: true });

// Lifecycle
onMounted(() => {
  nextTick(() => {
    initMap();
  });
});

onUnmounted(() => {
  if (map.value) {
    map.value.remove();
  }
});
</script>

<style scoped>
.mapbox-container {
  position: relative;
  width: 100%;
  height: v-bind(height);
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.mapbox-map {
  width: 100%;
  height: 100%;
}

.map-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 10;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.map-loading p {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

.map-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.1);
  z-index: 10;
}

.map-error p {
  color: #dc2626;
  font-size: 0.875rem;
  text-align: center;
  margin: 0;
  padding: 1rem;
}
</style>
