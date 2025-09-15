import type { Location, RouteData } from '@/types';

// Конфигурация Mapbox
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;



// Проверяем, является ли токен валидным (не примером)
const isMapboxTokenValid = MAPBOX_ACCESS_TOKEN && 
  MAPBOX_ACCESS_TOKEN.startsWith('pk.') &&
  MAPBOX_ACCESS_TOKEN.length > 50; // Реальные токены обычно длиннее

// Интерфейс для полного ответа Mapbox Directions API
interface MapboxRouteResponse {
  routes: Array<{
    distance: number;
    duration: number;
    geometry: {
      type: 'LineString';
      coordinates: number[][];
    };
  }>;
  waypoints: Array<{
    location: number[];
    name: string;
  }>;
}

// Получение пешеходного маршрута между двумя точками
export async function getWalkingRoute(
  start: Location,
  end: Location
): Promise<RouteData | null> {
  if (!isMapboxTokenValid) {
    console.warn('Mapbox access token не настроен или невалиден. Токен:', MAPBOX_ACCESS_TOKEN ? 'установлен' : 'не установлен');
    return null;
  }

  try {
    const startCoords = `${start.longitude},${start.latitude}`;
    const endCoords = `${end.longitude},${end.latitude}`;
    
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${startCoords};${endCoords}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson&overview=simplified`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: MapboxRouteResponse = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      
      // Получаем направление первого сегмента маршрута для навигации
      const coordinates = route.geometry.coordinates;
      let bearing = 0;
      
      if (coordinates.length >= 2) {
        const startPoint = { longitude: coordinates[0][0], latitude: coordinates[0][1] };
        const endPoint = { longitude: coordinates[1][0], latitude: coordinates[1][1] };
        
        // Вычисляем bearing первого сегмента маршрута
        const φ1 = startPoint.latitude * Math.PI / 180;
        const φ2 = endPoint.latitude * Math.PI / 180;
        const Δλ = (endPoint.longitude - startPoint.longitude) * Math.PI / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

        const θ = Math.atan2(y, x);
        bearing = (θ * 180 / Math.PI + 360) % 360;
      }
      
      return {
        distance: Math.round(route.distance), // в метрах
        bearing: Math.round(bearing), // в градусах
        duration: Math.round(route.duration) // в секундах
      };
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка получения маршрута:', error);
    return null;
  }
}

// Получение полного маршрута с геометрией для карты
export async function getWalkingRouteWithGeometry(
  start: Location,
  end: Location
): Promise<{ routeData: RouteData; geometry: any } | null> {
  if (!isMapboxTokenValid) {
    console.warn('Mapbox access token не настроен или невалиден');
    return null;
  }

  try {
    const startCoords = `${start.longitude},${start.latitude}`;
    const endCoords = `${end.longitude},${end.latitude}`;
    
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${startCoords};${endCoords}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson&overview=full`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: MapboxRouteResponse = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      
      // Получаем направление первого сегмента маршрута для навигации
      const coordinates = route.geometry.coordinates;
      let bearing = 0;
      
      if (coordinates.length >= 2) {
        const startPoint = { longitude: coordinates[0][0], latitude: coordinates[0][1] };
        const endPoint = { longitude: coordinates[1][0], latitude: coordinates[1][1] };
        
        // Вычисляем bearing первого сегмента маршрута
        const φ1 = startPoint.latitude * Math.PI / 180;
        const φ2 = endPoint.latitude * Math.PI / 180;
        const Δλ = (endPoint.longitude - startPoint.longitude) * Math.PI / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

        const θ = Math.atan2(y, x);
        bearing = (θ * 180 / Math.PI + 360) % 360;
      }
      
      const routeData: RouteData = {
        distance: Math.round(route.distance),
        bearing: Math.round(bearing),
        duration: Math.round(route.duration)
      };

      // Создаем GeoJSON для маршрута
      const geometry = {
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      };
      
      return { routeData, geometry };
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка получения маршрута с геометрией:', error);
    return null;
  }
}

// Получение прямого направления (без маршрута)
export function getDirectBearing(start: Location, end: Location): number {
  const φ1 = start.latitude * Math.PI / 180;
  const φ2 = end.latitude * Math.PI / 180;
  const Δλ = (end.longitude - start.longitude) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  return (θ * 180 / Math.PI + 360) % 360;
}

// Навигация по сегментам маршрута
export function getCurrentSegmentBearing(
  currentLocation: Location,
  routeGeometry: any
): number | null {
  if (!routeGeometry?.geometry?.coordinates) return null;
  
  const coordinates = routeGeometry.geometry.coordinates;
  if (coordinates.length < 2) return null;
  
  // Находим ближайший сегмент маршрута
  let closestSegmentIndex = 0;
  let minDistance = Infinity;
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const segmentStart = {
      latitude: coordinates[i][1],
      longitude: coordinates[i][0]
    };
    const segmentEnd = {
      latitude: coordinates[i + 1][1],
      longitude: coordinates[i + 1][0]
    };
    
    // Вычисляем расстояние до сегмента
    const distanceToStart = calculateDistance(currentLocation, segmentStart);
    const distanceToEnd = calculateDistance(currentLocation, segmentEnd);
    const segmentDistance = calculateDistance(segmentStart, segmentEnd);
    
    // Используем расстояние до ближайшей точки сегмента
    const distanceToSegment = Math.min(distanceToStart, distanceToEnd);
    
    if (distanceToSegment < minDistance) {
      minDistance = distanceToSegment;
      closestSegmentIndex = i;
    }
  }
  
  // Вычисляем направление текущего сегмента
  const segmentStart = {
    latitude: coordinates[closestSegmentIndex][1],
    longitude: coordinates[closestSegmentIndex][0]
  };
  const segmentEnd = {
    latitude: coordinates[closestSegmentIndex + 1][1],
    longitude: coordinates[closestSegmentIndex + 1][0]
  };
  
  return getDirectBearing(segmentStart, segmentEnd);
}

// Вспомогательная функция для вычисления расстояния
function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371000; // радиус Земли в метрах
  const φ1 = point1.latitude * Math.PI / 180;
  const φ2 = point2.latitude * Math.PI / 180;
  const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
  const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // расстояние в метрах
}

// Форматирование расстояния для отображения
export function formatDistance(distanceInMeters: number): string {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} м`;
  } else {
    const km = distanceInMeters / 1000;
    return `${km.toFixed(1)} км`;
  }
}

// Форматирование времени для отображения
export function formatDuration(durationInSeconds: number): string {
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  } else {
    return `${minutes}м`;
  }
}

// Проверка доступности Mapbox API
export function isMapboxAvailable(): boolean {
  return Boolean(isMapboxTokenValid);
}

// Получение токена Mapbox
export function getMapboxToken(): string {
  return MAPBOX_ACCESS_TOKEN;
}
