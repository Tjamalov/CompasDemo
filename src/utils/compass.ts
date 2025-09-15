// Утилиты для работы с компасом устройства и ориентацией

import { 
  createFallbackCompass, 
  getBestCompassAPI, 
  requestSensorPermissions,
  type AccelerometerCompass 
} from './compass-fallback';

export interface CompassData {
  heading: number; // направление компаса в градусах (0-360)
  accuracy: number | null; // точность в градусах
  timestamp: number; // время получения данных
}

export interface CompassOptions {
  frequency?: number; // частота обновления в мс (по умолчанию 100)
  enableHighAccuracy?: boolean; // высокая точность (по умолчанию true)
  useFallback?: boolean; // использовать fallback для старых браузеров
}

// Проверка поддержки API компаса
export function isCompassSupported(): boolean {
  return 'ondeviceorientationabsolute' in window || 
         'ondeviceorientation' in window ||
         (navigator as any).permissions?.query;
}

// Получение разрешения на доступ к датчикам
export async function requestCompassPermission(): Promise<boolean> {
  try {
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'magnetometer' as PermissionName });
      return permission.state === 'granted';
    }
    return true; // если API разрешений не поддерживается, считаем что разрешено
  } catch (error) {
    console.warn('Ошибка запроса разрешения компаса:', error);
    return true; // fallback
  }
}

// Класс для отслеживания компаса устройства
export class DeviceCompass {
  private watchId: number | null = null;
  private orientationHandler: ((data: CompassData) => void) | null = null;
  private errorHandler: ((error: Error) => void) | null = null;
  private options: CompassOptions;
  private lastHeading: number = 0;
  private isWatching: boolean = false;
  private fallbackCompass: AccelerometerCompass | null = null;
  private apiType: 'absolute' | 'relative' | 'accelerometer' | 'none' = 'none';

  constructor(options: CompassOptions = {}) {
    this.options = {
      frequency: 100,
      enableHighAccuracy: true,
      useFallback: true,
      ...options
    };
    
    this.apiType = getBestCompassAPI();
  }

  // Начать отслеживание компаса
  start(
    onHeadingChange: (data: CompassData) => void,
    onError: (error: Error) => void
  ): boolean {
    if (this.isWatching) {
      return true;
    }

    this.orientationHandler = onHeadingChange;
    this.errorHandler = onError;

    // Выбираем лучший доступный API
    switch (this.apiType) {
      case 'absolute':
        this.startAbsoluteOrientation();
        break;
      case 'relative':
        this.startRelativeOrientation();
        break;
      case 'accelerometer':
        if (this.options.useFallback) {
          this.startFallbackCompass();
        } else {
          onError(new Error('Только fallback API доступен, но отключен'));
          return false;
        }
        break;
      case 'none':
        if (this.options.useFallback) {
          this.startFallbackCompass();
        } else {
          onError(new Error('API компаса не поддерживается'));
          return false;
        }
        break;
    }

    this.isWatching = true;
    return true;
  }

  // Остановить отслеживание
  stop(): void {
    if (this.watchId !== null) {
      clearInterval(this.watchId);
      this.watchId = null;
    }

    if (this.isWatching) {
      window.removeEventListener('deviceorientationabsolute', this.handleAbsoluteOrientation);
      window.removeEventListener('deviceorientation', this.handleRelativeOrientation);
      this.isWatching = false;
    }

    if (this.fallbackCompass) {
      this.fallbackCompass.stop();
      this.fallbackCompass = null;
    }

    this.orientationHandler = null;
    this.errorHandler = null;
  }

  // Обработка абсолютной ориентации
  private startAbsoluteOrientation(): void {
    window.addEventListener('deviceorientationabsolute', this.handleAbsoluteOrientation, true);
  }

  // Обработка относительной ориентации (требует калибровки)
  private startRelativeOrientation(): void {
    window.addEventListener('deviceorientation', this.handleRelativeOrientation, true);
  }

  // Обработчик абсолютной ориентации
  private handleAbsoluteOrientation = (event: DeviceOrientationEvent): void => {
    if (event.alpha !== null) {
      const heading = this.normalizeHeading(event.alpha);
      const accuracy = event.webkitCompassAccuracy || null;
      
      this.lastHeading = heading;
      this.orientationHandler?.({
        heading,
        accuracy,
        timestamp: Date.now()
      });
    }
  };

  // Обработчик относительной ориентации
  private handleRelativeOrientation = (event: DeviceOrientationEvent): void => {
    if (event.alpha !== null) {
      // Для относительной ориентации нужна калибровка
      // Пока используем простую нормализацию
      const heading = this.normalizeHeading(event.alpha);
      
      this.lastHeading = heading;
      this.orientationHandler?.({
        heading,
        accuracy: null, // точность недоступна для относительной ориентации
        timestamp: Date.now()
      });
    }
  };

  // Нормализация угла в диапазон 0-360
  private normalizeHeading(angle: number): number {
    return ((angle % 360) + 360) % 360;
  }

  // Получить последнее известное направление
  getLastHeading(): number {
    return this.lastHeading;
  }

  // Проверить, активно ли отслеживание
  isActive(): boolean {
    return this.isWatching;
  }

  // Запуск fallback компаса
  private startFallbackCompass(): void {
    this.fallbackCompass = createFallbackCompass();
    
    if (!this.fallbackCompass) {
      this.errorHandler?.(new Error('Fallback компас недоступен'));
      return;
    }

    const success = this.fallbackCompass.start(
      (heading: number) => {
        this.lastHeading = heading;
        this.orientationHandler?.({
          heading,
          accuracy: null, // точность недоступна для fallback
          timestamp: Date.now()
        });
      },
      (error: Error) => {
        this.errorHandler?.(error);
      }
    );

    if (!success) {
      this.errorHandler?.(new Error('Не удалось запустить fallback компас'));
    }
  }

  // Начать калибровку (только для fallback)
  startCalibration(): void {
    if (this.fallbackCompass) {
      this.fallbackCompass.startCalibration();
    }
  }

  // Завершить калибровку (только для fallback)
  finishCalibration(): void {
    if (this.fallbackCompass) {
      this.fallbackCompass.finishCalibration();
    }
  }

  // Получить прогресс калибровки (только для fallback)
  getCalibrationProgress(): number {
    if (this.fallbackCompass) {
      return this.fallbackCompass.getCalibrationProgress();
    }
    return 0;
  }

  // Получить тип используемого API
  getApiType(): string {
    return this.apiType;
  }
}

// Создание экземпляра компаса с настройками по умолчанию
export function createCompass(options?: CompassOptions): DeviceCompass {
  return new DeviceCompass(options);
}

// Вычисление относительного направления с учетом ориентации устройства
export function calculateRelativeBearing(
  targetBearing: number, // направление к цели
  deviceHeading: number  // направление устройства
): number {
  let relativeBearing = targetBearing - deviceHeading;
  
  // Нормализуем в диапазон -180 до 180
  while (relativeBearing > 180) relativeBearing -= 360;
  while (relativeBearing < -180) relativeBearing += 360;
  
  return relativeBearing;
}

// Форматирование направления для отображения
export function formatHeading(heading: number): string {
  const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
  const index = Math.round(heading / 45) % 8;
  return `${Math.round(heading)}° ${directions[index]}`;
}

// Проверка качества сигнала компаса
export function getCompassQuality(accuracy: number | null): 'excellent' | 'good' | 'poor' | 'unknown' {
  if (accuracy === null) return 'unknown';
  if (accuracy <= 10) return 'excellent';
  if (accuracy <= 30) return 'good';
  return 'poor';
}
