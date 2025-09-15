// Типы для приложения-компаса

export interface Point {
  id: number;
  coordinates: string; // "lng,lat"
  name: string;
  description?: string;
  createdAt?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface RouteData {
  distance: number; // в метрах
  bearing: number; // направление в градусах
  duration?: number; // в секундах
}

export interface CompassState {
  currentLocation: Location | null;
  selectedPoint: Point | null;
  routeData: RouteData | null;
  isLoading: boolean;
  error: string | null;
}
