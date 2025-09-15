import initSqlJs from 'sql.js';
import type { Point } from '@/types';

let SQL: any = null;
let db: any = null;

// Инициализация SQLite
export async function initDatabase(): Promise<void> {
  try {
    // Загружаем SQL.js
    SQL = await initSqlJs({
      // Используем CDN для загрузки wasm файла
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
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
    throw error;
  }
}

// Добавление тестовых данных
function insertSampleData(): void {
  const samplePoints: Omit<Point, 'id'>[] = [
    { coordinates: '37.6173,55.7558', name: 'Красная площадь' },
    { coordinates: '37.6112,55.7522', name: 'Храм Христа Спасителя' },
    { coordinates: '37.6048,55.7481', name: 'Парк Горького' },
    { coordinates: '37.6201,55.7539', name: 'ГУМ' },
    { coordinates: '37.6156,55.7520', name: 'Мавзолей Ленина' }
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
  try {
    const result = db.exec('SELECT * FROM points ORDER BY name');
    if (result.length === 0) return [];
    
    return result[0].values.map((row: any[]) => ({
      id: row[0],
      coordinates: row[1],
      name: row[2]
    }));
  } catch (error) {
    console.error('Ошибка получения точек:', error);
    return [];
  }
}

// Получение точки по ID
export function getPointById(id: number): Point | null {
  try {
    const result = db.exec('SELECT * FROM points WHERE id = ?', [id]);
    if (result.length === 0) return null;
    
    const row = result[0].values[0];
    return {
      id: row[0],
      coordinates: row[1],
      name: row[2]
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
