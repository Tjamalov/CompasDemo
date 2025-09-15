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
      
      // Получаем направление первого сегмента маршрута
      const coordinates = route.geometry.coordinates;
      let bearing = 0;
      
      if (coordinates.length >= 2) {
        const startPoint = { longitude: coordinates[0][0], latitude: coordinates[0][1] };
        const endPoint = { longitude: coordinates[1][0], latitude: coordinates[1][1] };
        
        // Вычисляем bearing между первыми двумя точками
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
      
      // Получаем направление первого сегмента маршрута
      const coordinates = route.geometry.coordinates;
      let bearing = 0;
      
      if (coordinates.length >= 2) {
        const startPoint = { longitude: coordinates[0][0], latitude: coordinates[0][1] };
        const endPoint = { longitude: coordinates[1][0], latitude: coordinates[1][1] };
        
        // Вычисляем bearing между первыми двумя точками
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
