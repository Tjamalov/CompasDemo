// Утилиты для управления состоянием приложения

import type { CompassState, Location, Point, RouteData } from '@/types';
import { ref, computed, watch } from 'vue';

// Создание реактивного состояния приложения
export function createAppState() {
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

  // Вычисляемые свойства
  const currentLocation = computed(() => state.value.currentLocation);
  const selectedPoint = computed(() => state.value.selectedPoint);
  const routeData = computed(() => state.value.routeData);
  const hasLocation = computed(() => !!state.value.currentLocation);
  const hasSelectedPoint = computed(() => !!state.value.selectedPoint);
  const canShowCompass = computed(() => hasLocation.value && hasSelectedPoint.value);

  return {
    // Состояние
    state,
    isLoadingLocation,
    isLoadingPoints,
    locationError,
    routeError,
    points,
    
    // Вычисляемые свойства
    currentLocation,
    selectedPoint,
    routeData,
    hasLocation,
    hasSelectedPoint,
    canShowCompass
  };
}

// Управление состоянием геолокации
export function useLocationState() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const location = ref<Location | null>(null);

  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage;
  };

  const setLocation = (newLocation: Location | null) => {
    location.value = newLocation;
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    isLoading,
    error,
    location,
    setLoading,
    setError,
    setLocation,
    clearError
  };
}

// Управление состоянием маршрута
export function useRouteState() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const routeData = ref<RouteData | null>(null);

  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage;
  };

  const setRouteData = (data: RouteData | null) => {
    routeData.value = data;
  };

  const clearError = () => {
    error.value = null;
  };

  const clearRoute = () => {
    routeData.value = null;
    error.value = null;
  };

  return {
    isLoading,
    error,
    routeData,
    setLoading,
    setError,
    setRouteData,
    clearError,
    clearRoute
  };
}

// Управление состоянием точек
export function usePointsState() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const points = ref<Point[]>([]);
  const selectedPointId = ref<number | null>(null);

  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage;
  };

  const setPoints = (newPoints: Point[]) => {
    points.value = newPoints;
  };

  const addPoint = (point: Point) => {
    points.value.push(point);
  };

  const updatePoint = (pointId: number, updates: Partial<Point>) => {
    const index = points.value.findIndex(p => p.id === pointId);
    if (index !== -1) {
      points.value[index] = { ...points.value[index], ...updates };
    }
  };

  const removePoint = (pointId: number) => {
    const index = points.value.findIndex(p => p.id === pointId);
    if (index !== -1) {
      points.value.splice(index, 1);
    }
  };

  const setSelectedPointId = (id: number | null) => {
    selectedPointId.value = id;
  };

  const getSelectedPoint = () => {
    if (!selectedPointId.value) return null;
    return points.value.find(p => p.id === selectedPointId.value) || null;
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    isLoading,
    error,
    points,
    selectedPointId,
    setLoading,
    setError,
    setPoints,
    addPoint,
    updatePoint,
    removePoint,
    setSelectedPointId,
    getSelectedPoint,
    clearError
  };
}

// Утилиты для работы с ошибками
export function createErrorHandler() {
  const errors = ref<Map<string, string>>(new Map());

  const setError = (key: string, message: string) => {
    errors.value.set(key, message);
  };

  const clearError = (key: string) => {
    errors.value.delete(key);
  };

  const getError = (key: string) => {
    return errors.value.get(key) || null;
  };

  const hasError = (key: string) => {
    return errors.value.has(key);
  };

  const clearAllErrors = () => {
    errors.value.clear();
  };

  const getAllErrors = () => {
    return Array.from(errors.value.entries()).map(([key, message]) => ({ key, message }));
  };

  return {
    errors: computed(() => errors.value),
    setError,
    clearError,
    getError,
    hasError,
    clearAllErrors,
    getAllErrors
  };
}
