// Утилиты для работы с маршрутами и навигацией

import type { Location, RouteData, Point } from '@/types';
import { getWalkingRoute, getWalkingRouteWithGeometry, getDirectBearing, formatDistance, formatDuration } from './mapbox';
import { calculateDistance, calculateBearing } from './geolocation';

export interface RouteCalculationOptions {
  useMapbox?: boolean; // использовать Mapbox API для маршрутов
  fallbackToDirect?: boolean; // использовать прямое направление если API недоступен
}

// Вычисление маршрута между текущим местоположением и точкой назначения
export async function calculateRoute(
  currentLocation: Location,
  targetPoint: Point,
  options: RouteCalculationOptions = {}
): Promise<RouteData | null> {
  const {
    useMapbox = true,
    fallbackToDirect = true
  } = options;

  try {
    // Парсим координаты точки назначения
    const [lng, lat] = targetPoint.coordinates.split(',').map(Number);
    const targetLocation: Location = { latitude: lat, longitude: lng };

    let route: RouteData | null = null;

    // Пытаемся получить пешеходный маршрут через Mapbox
    if (useMapbox) {
      route = await getWalkingRoute(currentLocation, targetLocation);
    }

    // Если маршрут не получен, используем прямое направление
    if (!route && fallbackToDirect) {
      const bearing = getDirectBearing(currentLocation, targetLocation);
      const distance = calculateDistance(currentLocation, targetLocation);
      
      route = {
        distance: Math.round(distance),
        bearing: Math.round(bearing),
        duration: Math.round(distance / 1.4) // предполагаемая скорость пешехода 1.4 м/с
      };
    }

    return route;
  } catch (error) {
    console.error('Ошибка вычисления маршрута:', error);
    return null;
  }
}

// Вычисление маршрута с геометрией для карты
export async function calculateRouteWithGeometry(
  currentLocation: Location,
  targetPoint: Point,
  options: RouteCalculationOptions = {}
): Promise<{ routeData: RouteData; geometry: any } | null> {
  const {
    useMapbox = true,
    fallbackToDirect = true
  } = options;

  try {
    // Парсим координаты точки назначения
    const [lng, lat] = targetPoint.coordinates.split(',').map(Number);
    const targetLocation: Location = { latitude: lat, longitude: lng };

    let result: { routeData: RouteData; geometry: any } | null = null;

    // Пытаемся получить пешеходный маршрут с геометрией через Mapbox
    if (useMapbox) {
      result = await getWalkingRouteWithGeometry(currentLocation, targetLocation);
    }

    // Если маршрут не получен, используем прямое направление
    if (!result && fallbackToDirect) {
      const bearing = getDirectBearing(currentLocation, targetLocation);
      const distance = calculateDistance(currentLocation, targetLocation);
      
      const routeData: RouteData = {
        distance: Math.round(distance),
        bearing: Math.round(bearing),
        duration: Math.round(distance / 1.4) // предполагаемая скорость пешехода 1.4 м/с
      };

      // Создаем простую геометрию для прямой линии
      const geometry = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [currentLocation.longitude, currentLocation.latitude],
            [targetLocation.longitude, targetLocation.latitude]
          ]
        }
      };

      result = { routeData, geometry };
    }

    return result;
  } catch (error) {
    console.error('Ошибка вычисления маршрута с геометрией:', error);
    return null;
  }
}

// Обновление маршрута при изменении местоположения
export async function updateRoute(
  currentLocation: Location,
  targetPoint: Point,
  options?: RouteCalculationOptions
): Promise<RouteData | null> {
  return calculateRoute(currentLocation, targetPoint, options);
}

// Проверка необходимости обновления маршрута
export function shouldUpdateRoute(
  currentLocation: Location,
  lastLocation: Location | null,
  threshold: number = 10 // метров
): boolean {
  if (!lastLocation) return true;
  
  const distance = calculateDistance(currentLocation, lastLocation);
  return distance > threshold;
}

// Получение направления к точке
export function getDirectionToPoint(
  currentLocation: Location,
  targetPoint: Point
): number {
  const [lng, lat] = targetPoint.coordinates.split(',').map(Number);
  const targetLocation: Location = { latitude: lat, longitude: lng };
  
  return calculateBearing(currentLocation, targetLocation);
}

// Получение расстояния до точки
export function getDistanceToPoint(
  currentLocation: Location,
  targetPoint: Point
): number {
  const [lng, lat] = targetPoint.coordinates.split(',').map(Number);
  const targetLocation: Location = { latitude: lat, longitude: lng };
  
  return calculateDistance(currentLocation, targetLocation);
}

// Форматирование данных маршрута для отображения
export function formatRouteData(route: RouteData | null): {
  distance: string;
  duration: string;
  bearing: number;
} {
  if (!route) {
    return {
      distance: '—',
      duration: '—',
      bearing: 0
    };
  }

  return {
    distance: formatDistance(route.distance),
    duration: route.duration ? formatDuration(route.duration) : '—',
    bearing: route.bearing
  };
}

// Проверка валидности координат точки
export function isValidPointCoordinates(coordinates: string): boolean {
  try {
    const [lng, lat] = coordinates.split(',').map(Number);
    return !isNaN(lng) && !isNaN(lat) && 
           lng >= -180 && lng <= 180 && 
           lat >= -90 && lat <= 90;
  } catch {
    return false;
  }
}

// Создание точки из координат
export function createPointFromCoordinates(
  coordinates: string,
  name: string = 'Новая точка'
): Point | null {
  if (!isValidPointCoordinates(coordinates)) {
    return null;
  }

  return {
    id: Date.now(), // временный ID
    name,
    coordinates,
    description: '',
    createdAt: new Date().toISOString()
  };
}
