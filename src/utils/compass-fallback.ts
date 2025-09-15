// Fallback утилиты для работы с компасом в старых браузеров

export interface CompassFallbackOptions {
  enableCalibration?: boolean; // включить калибровку
  calibrationSteps?: number; // количество шагов калибровки
  autoCalibrate?: boolean; // автоматическая калибровка
}

// Простая калибровка компаса для относительной ориентации
export class CompassCalibrator {
  private samples: number[] = [];
  private isCalibrating = false;
  private calibrationOffset = 0;
  private readonly maxSamples = 50;

  // Начать калибровку
  startCalibration(): void {
    this.samples = [];
    this.isCalibrating = true;
    this.calibrationOffset = 0;
  }

  // Добавить образец для калибровки
  addSample(heading: number): void {
    if (!this.isCalibrating) return;
    
    this.samples.push(heading);
    
    if (this.samples.length >= this.maxSamples) {
      this.finishCalibration();
    }
  }

  // Завершить калибровку
  finishCalibration(): number {
    if (this.samples.length === 0) return 0;
    
    // Вычисляем среднее значение
    const sum = this.samples.reduce((a, b) => a + b, 0);
    this.calibrationOffset = sum / this.samples.length;
    
    this.isCalibrating = false;
    return this.calibrationOffset;
  }

  // Применить калибровку к направлению
  calibrateHeading(heading: number): number {
    return (heading - this.calibrationOffset + 360) % 360;
  }

  // Проверить, активна ли калибровка
  isActive(): boolean {
    return this.isCalibrating;
  }

  // Получить прогресс калибровки
  getProgress(): number {
    return Math.min(this.samples.length / this.maxSamples, 1);
  }
}

// Простой компас на основе акселерометра (fallback)
export class AccelerometerCompass {
  private watchId: number | null = null;
  private orientationHandler: ((heading: number) => void) | null = null;
  private errorHandler: ((error: Error) => void) | null = null;
  private calibrator = new CompassCalibrator();

  // Начать отслеживание через акселерометр
  start(
    onHeadingChange: (heading: number) => void,
    onError: (error: Error) => void
  ): boolean {
    if (!('DeviceOrientationEvent' in window)) {
      onError(new Error('DeviceOrientationEvent не поддерживается'));
      return false;
    }

    this.orientationHandler = onHeadingChange;
    this.errorHandler = onError;

    // Используем относительную ориентацию
    window.addEventListener('deviceorientation', this.handleOrientation, true);
    
    return true;
  }

  // Остановить отслеживание
  stop(): void {
    if (this.watchId !== null) {
      clearInterval(this.watchId);
      this.watchId = null;
    }

    window.removeEventListener('deviceorientation', this.handleOrientation);
    this.orientationHandler = null;
    this.errorHandler = null;
  }

  // Обработчик ориентации
  private handleOrientation = (event: DeviceOrientationEvent): void => {
    if (event.alpha !== null) {
      let heading = event.alpha;
      
      // Применяем калибровку если она завершена
      if (!this.calibrator.isActive()) {
        heading = this.calibrator.calibrateHeading(heading);
      } else {
        // Добавляем образец для калибровки
        this.calibrator.addSample(heading);
      }
      
      this.orientationHandler?.(heading);
    }
  };

  // Начать калибровку
  startCalibration(): void {
    this.calibrator.startCalibration();
  }

  // Завершить калибровку
  finishCalibration(): void {
    this.calibrator.finishCalibration();
  }

  // Получить прогресс калибровки
  getCalibrationProgress(): number {
    return this.calibrator.getProgress();
  }
}

// Проверка поддержки различных API компаса
export function getCompassCapabilities(): {
  deviceOrientation: boolean;
  deviceOrientationAbsolute: boolean;
  magnetometer: boolean;
  permissions: boolean;
} {
  return {
    deviceOrientation: 'DeviceOrientationEvent' in window,
    deviceOrientationAbsolute: 'ondeviceorientationabsolute' in window,
    magnetometer: 'Magnetometer' in window,
    permissions: 'permissions' in navigator
  };
}

// Получение лучшего доступного API компаса
export function getBestCompassAPI(): 'absolute' | 'relative' | 'accelerometer' | 'none' {
  const capabilities = getCompassCapabilities();
  
  if (capabilities.deviceOrientationAbsolute) {
    return 'absolute';
  }
  
  if (capabilities.deviceOrientation) {
    return 'relative';
  }
  
  if (capabilities.magnetometer) {
    return 'accelerometer';
  }
  
  return 'none';
}

// Создание fallback компаса
export function createFallbackCompass(): AccelerometerCompass | null {
  const api = getBestCompassAPI();
  
  if (api === 'none') {
    return null;
  }
  
  return new AccelerometerCompass();
}

// Утилиты для работы с разрешениями
export async function requestSensorPermissions(): Promise<{
  magnetometer: boolean;
  accelerometer: boolean;
  gyroscope: boolean;
}> {
  const result = {
    magnetometer: false,
    accelerometer: false,
    gyroscope: false
  };

  if (!('permissions' in navigator)) {
    // Если API разрешений не поддерживается, считаем что все разрешено
    return {
      magnetometer: true,
      accelerometer: true,
      gyroscope: true
    };
  }

  try {
    // Запрашиваем разрешения для различных датчиков
    const permissions = await Promise.allSettled([
      navigator.permissions.query({ name: 'magnetometer' as PermissionName }),
      navigator.permissions.query({ name: 'accelerometer' as PermissionName }),
      navigator.permissions.query({ name: 'gyroscope' as PermissionName })
    ]);

    result.magnetometer = permissions[0].status === 'fulfilled' && 
                         permissions[0].value.state === 'granted';
    result.accelerometer = permissions[1].status === 'fulfilled' && 
                          permissions[1].value.state === 'granted';
    result.gyroscope = permissions[2].status === 'fulfilled' && 
                      permissions[2].value.state === 'granted';

  } catch (error) {
    console.warn('Ошибка запроса разрешений датчиков:', error);
  }

  return result;
}
