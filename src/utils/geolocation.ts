import type { Location } from '@/types';

// Получение текущей геолокации пользователя
export async function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Геолокация не поддерживается браузером'));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 минут
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        let errorMessage = 'Ошибка получения геолокации';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Доступ к геолокации запрещен';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Информация о местоположении недоступна';
            break;
          case error.TIMEOUT:
            errorMessage = 'Время ожидания истекло';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      options
    );
  });
}

// Подписка на изменения геолокации
export function watchLocation(
  onSuccess: (location: Location) => void,
  onError: (error: Error) => void
): number | null {
  if (!navigator.geolocation) {
    onError(new Error('Геолокация не поддерживается браузером'));
    return null;
  }

  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000 // 5 секунд для навигации
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    },
    (error) => {
      let errorMessage = 'Ошибка получения геолокации';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Доступ к геолокации запрещен';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Информация о местоположении недоступна';
          break;
        case error.TIMEOUT:
          errorMessage = 'Время ожидания истекло';
          break;
      }
      
      onError(new Error(errorMessage));
    },
    options
  );
}

// Остановка отслеживания геолокации
export function clearLocationWatch(watchId: number): void {
  navigator.geolocation.clearWatch(watchId);
}

// Вычисление расстояния между двумя точками (формула гаверсинуса)
export function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371e3; // Радиус Земли в метрах
  const φ1 = point1.latitude * Math.PI / 180;
  const φ2 = point2.latitude * Math.PI / 180;
  const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
  const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // расстояние в метрах
}

// Вычисление направления (bearing) между двумя точками
export function calculateBearing(point1: Location, point2: Location): number {
  const φ1 = point1.latitude * Math.PI / 180;
  const φ2 = point2.latitude * Math.PI / 180;
  const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = (θ * 180 / Math.PI + 360) % 360; // конвертируем в градусы и нормализуем

  return bearing;
}
