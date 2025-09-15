import initSqlJs from 'sql.js';
import type { Point } from '@/types';

let SQL: any = null;
let db: any = null;
let fallbackMode = false;
let fallbackData: Point[] = [];

// Инициализация SQLite
export async function initDatabase(): Promise<void> {
  try {
    // Загружаем SQL.js
    SQL = await initSqlJs({
      // Используем CDN для загрузки wasm файла
      locateFile: (file: string) => {
        // В production используем CDN, в dev - локальные файлы
        if (import.meta.env.PROD) {
          return `https://sql.js.org/dist/${file}`;
        }
        return `/node_modules/sql.js/dist/${file}`;
      }
    });
    
    // Создаем новую базу данных
    db = new SQL.Database();
    
    // Создаем таблицу точек
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coordinates TEXT NOT NULL,
        name TEXT NOT NULL
      );
    `;
    
    db.run(createTableQuery);
    
    // Добавляем тестовые данные если таблица пустая
    const countResult = db.exec('SELECT COUNT(*) as count FROM points');
    const count = countResult[0]?.values[0]?.[0] || 0;
    
    if (count === 0) {
      insertSampleData();
    }
    
    console.log('База данных SQLite инициализирована');
  } catch (error) {
    console.error('Ошибка инициализации базы данных:', error);
    
    // Если не удалось загрузить sql.js, создаем заглушку
    if (error instanceof Error && error.message.includes('sql.js')) {
      console.warn('SQL.js не загружен, используем заглушку');
      initFallbackDatabase();
    } else {
      throw error;
    }
  }
}

// Добавление тестовых данных
function insertSampleData(): void {
  const samplePoints: Omit<Point, 'id'>[] = [
    { coordinates: '37.6173,55.7558', name: 'Красная площадь' },
    { coordinates: '86.9250,27.9881', name: 'Гора Эверест' },
    { coordinates: '107.7500,53.2167', name: 'Озеро Байкал' },
    { coordinates: '20.4522,54.7104', name: 'Центр Калининграда' },
    { coordinates: '20.4750,54.9600', name: 'Центр Зеленоградска' }
  ];
  
  const insertQuery = db.prepare('INSERT INTO points (coordinates, name) VALUES (?, ?)');
  
  samplePoints.forEach(point => {
    insertQuery.run([point.coordinates, point.name]);
  });
  
  insertQuery.free();
  console.log('Тестовые данные добавлены');
}

// Получение всех точек
export function getAllPoints(): Point[] {
  if (fallbackMode) {
    return [...fallbackData];
  }
  
  try {
    const result = db.exec('SELECT * FROM points ORDER BY name');
    if (result.length === 0) return [];
    
    return result[0].values.map((row: any[]) => ({
      id: row[0],
      coordinates: row[1],
      name: row[2],
      description: row[3] || '',
      createdAt: row[4] || new Date().toISOString()
    }));
  } catch (error) {
    console.error('Ошибка получения точек:', error);
    return [];
  }
}

// Получение точки по ID
export function getPointById(id: number): Point | null {
  if (fallbackMode) {
    return fallbackData.find(point => point.id === id) || null;
  }
  
  try {
    const result = db.exec('SELECT * FROM points WHERE id = ?', [id]);
    if (result.length === 0) return null;
    
    const row = result[0].values[0];
    return {
      id: row[0],
      coordinates: row[1],
      name: row[2],
      description: row[3] || '',
      createdAt: row[4] || new Date().toISOString()
    };
  } catch (error) {
    console.error('Ошибка получения точки:', error);
    return null;
  }
}

// Добавление новой точки
export function addPoint(coordinates: string, name: string): Point | null {
  try {
    const insertQuery = db.prepare('INSERT INTO points (coordinates, name) VALUES (?, ?)');
    const result = insertQuery.run([coordinates, name]);
    insertQuery.free();
    
    return getPointById(result.lastInsertRowid);
  } catch (error) {
    console.error('Ошибка добавления точки:', error);
    return null;
  }
}

// Обновление точки
export function updatePoint(id: number, coordinates: string, name: string): boolean {
  try {
    const updateQuery = db.prepare('UPDATE points SET coordinates = ?, name = ? WHERE id = ?');
    const result = updateQuery.run([coordinates, name, id]);
    updateQuery.free();
    
    return result.changes > 0;
  } catch (error) {
    console.error('Ошибка обновления точки:', error);
    return false;
  }
}

// Удаление точки
export function deletePoint(id: number): boolean {
  try {
    const deleteQuery = db.prepare('DELETE FROM points WHERE id = ?');
    const result = deleteQuery.run([id]);
    deleteQuery.free();
    
    return result.changes > 0;
  } catch (error) {
    console.error('Ошибка удаления точки:', error);
    return false;
  }
}

// Сохранение базы данных в localStorage
export function saveDatabase(): void {
  if (fallbackMode) {
    saveFallbackData();
    return;
  }
  
  try {
    if (!db) return;
    
    const data = db.export();
    const buffer = new Uint8Array(data);
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(buffer)));
    localStorage.setItem('compass_db', base64);
    
    console.log('База данных сохранена');
  } catch (error) {
    console.error('Ошибка сохранения базы данных:', error);
  }
}

// Загрузка базы данных из localStorage
export function loadDatabase(): boolean {
  try {
    const base64 = localStorage.getItem('compass_db');
    if (!base64) return false;
    
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    if (SQL) {
      db = new SQL.Database(bytes);
      console.log('База данных загружена');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Ошибка загрузки базы данных:', error);
    return false;
  }
}

// Получение экземпляра базы данных
export function getDatabase() {
  return db;
}

// Инициализация заглушки базы данных
function initFallbackDatabase(): void {
  fallbackMode = true;
  
  // Загружаем данные из localStorage
  const saved = localStorage.getItem('compass_fallback_data');
  if (saved) {
    try {
      fallbackData = JSON.parse(saved);
    } catch (error) {
      console.error('Ошибка загрузки данных из localStorage:', error);
      fallbackData = [];
    }
  }
  
  // Если данных нет, добавляем тестовые
  if (fallbackData.length === 0) {
    fallbackData = [
      { id: 1, coordinates: '37.6173,55.7558', name: 'Красная площадь', description: '', createdAt: new Date().toISOString() },
      { id: 2, coordinates: '86.9250,27.9881', name: 'Гора Эверест', description: '', createdAt: new Date().toISOString() },
      { id: 3, coordinates: '107.7500,53.2167', name: 'Озеро Байкал', description: '', createdAt: new Date().toISOString() },
      { id: 4, coordinates: '20.4522,54.7104', name: 'Центр Калининграда', description: '', createdAt: new Date().toISOString() },
      { id: 5, coordinates: '20.4750,54.9600', name: 'Центр Зеленоградска', description: '', createdAt: new Date().toISOString() }
    ];
    saveFallbackData();
  }
  
  console.log('Заглушка базы данных инициализирована');
}

// Сохранение данных заглушки
function saveFallbackData(): void {
  try {
    localStorage.setItem('compass_fallback_data', JSON.stringify(fallbackData));
  } catch (error) {
    console.error('Ошибка сохранения данных заглушки:', error);
  }
}
