# Компас - Telegram Mini App

Приложение-компас для Telegram Mini Apps, которое показывает направление к выбранным точкам с использованием пешеходных маршрутов.

## Функциональность

- 🧭 Компас-стрелка, указывающая направление к точке
- 📍 Определение текущего местоположения пользователя
- 🗺️ Интерактивная карта Mapbox с пешеходными маршрутами
- 📊 Отображение расстояния и времени в пути
- 💾 Локальная база данных SQLite для хранения точек
- 📱 Интеграция с Telegram Mini Apps

## Технологии

- **Vue 3** + **TypeScript** - фронтенд фреймворк
- **Vite** - сборщик и dev-сервер
- **SQLite** (sql.js) - локальная база данных
- **Mapbox GL JS** - карты и маршрутизация
- **Telegram Mini Apps SDK** - интеграция с Telegram
- **Heroicons** - иконки

## Установка и запуск

1. **Клонирование и установка зависимостей:**
   ```bash
   npm install
   ```

2. **Настройка переменных окружения:**
   
   **Вариант 1: Создайте файл `.env` в корне проекта:**
   ```
   VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
   VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```
   
   **Вариант 2: Установите переменные окружения в системе:**
   ```bash
   # Windows (PowerShell)
   $env:VITE_MAPBOX_ACCESS_TOKEN="pk.your_mapbox_token_here"
   
   # Linux/Mac
   export VITE_MAPBOX_ACCESS_TOKEN="pk.your_mapbox_token_here"
   ```
   
   **Вариант 3: Для Netlify/Vercel добавьте переменные в настройках деплоя**
   
   Получите токен на [Mapbox](https://account.mapbox.com/access-tokens/)

3. **Запуск в режиме разработки:**
   ```bash
   npm run dev
   ```

4. **Сборка для продакшена:**
   ```bash
   npm run build
   ```

## Структура проекта

```
src/
├── components/          # Vue компоненты
│   ├── CompassApp.vue   # Основной компонент приложения
│   ├── CompassArrow.vue # Стрелка компаса
│   ├── MapboxMap.vue    # Интерактивная карта
│   ├── PointSelector.vue # Селект точек назначения
│   ├── DistanceDisplay.vue # Отображение расстояния
│   └── LocationStatus.vue # Статус геолокации
├── database/            # Работа с SQLite
│   └── sqlite.ts        # Утилиты для базы данных
├── utils/               # Утилиты
│   ├── geolocation.ts   # Геолокация
│   ├── mapbox.ts        # Mapbox API
│   └── telegram.ts      # Telegram Mini Apps
├── types/               # TypeScript типы
│   └── index.ts         # Интерфейсы
└── main.js              # Точка входа
```

## База данных

Приложение использует SQLite для хранения точек назначения. Таблица `points` содержит:

- `id` - уникальный идентификатор
- `coordinates` - координаты в формате "lng,lat"
- `name` - название точки

По умолчанию загружаются тестовые точки в Москве.

## API

### Mapbox Directions API

Используется для построения пешеходных маршрутов между текущим местоположением и выбранной точкой.

### Telegram Mini Apps

Поддерживается интеграция с Telegram Mini Apps с моком для разработки.

## Развертывание

Для развертывания в Telegram Mini Apps:

1. Соберите проект: `npm run build`
2. Загрузите на хостинг с HTTPS
3. Настройте бота через @BotFather
4. Укажите URL вашего приложения

## Разработка

### Добавление новых точек

Точки можно добавлять программно через функции в `src/database/sqlite.ts`:

```typescript
import { addPoint } from '@/database/sqlite';

// Добавить новую точку
const newPoint = addPoint('37.6173,55.7558', 'Красная площадь');
```

### Кастомизация стилей

Все стили находятся в компонентах Vue. Основные цвета и размеры можно изменить в CSS переменных.

## Лицензия

MIT