import { init, mockTelegramEnv } from '@telegram-apps/sdk';

// Инициализация Telegram Mini Apps SDK
export function initTelegram(): void {
  try {
    // Проверяем, находимся ли мы в Telegram
    if (window.Telegram?.WebApp) {
      // Инициализируем SDK для реального Telegram
      init();
      console.log('Telegram Mini App SDK инициализирован');
    } else {
      // Создаем мок для разработки
      mockTelegramEnv({
        themeParams: {
          accentTextColor: '#6ab2f2',
          bgColor: '#17212b',
          buttonColor: '#5288c1',
          buttonTextColor: '#ffffff',
          destructiveTextColor: '#ec3942',
          headerBgColor: '#17212b',
          hintColor: '#708499',
          linkColor: '#6ab3f3',
          secondaryBgColor: '#232e3c',
          sectionBgColor: '#17212b',
          sectionHeaderTextColor: '#6ab3f3',
          subtitleTextColor: '#708499',
          textColor: '#f5f5f5',
        },
        initData: {
          user: {
            id: 123456789,
            firstName: 'Test',
            lastName: 'User',
            username: 'testuser',
            languageCode: 'ru',
            isPremium: false,
            allowsWriteToPm: true,
          },
          hash: 'test_hash',
          authDate: new Date(),
          signature: 'test_signature',
          startParam: 'compass',
          chatType: 'sender',
          chatInstance: 'test_instance',
        },
        version: '7.2',
        platform: 'web',
      });
      
      console.log('Telegram Mini App мок инициализирован для разработки');
    }
  } catch (error) {
    console.error('Ошибка инициализации Telegram SDK:', error);
  }
}

// Получение данных пользователя
export function getTelegramUser() {
  try {
    return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error);
    return null;
  }
}

// Получение параметров запуска
export function getStartParam(): string | null {
  try {
    return window.Telegram?.WebApp?.initDataUnsafe?.startParam || null;
  } catch (error) {
    console.error('Ошибка получения параметра запуска:', error);
    return null;
  }
}

// Получение темы
export function getTelegramTheme() {
  try {
    return window.Telegram?.WebApp?.themeParams || {};
  } catch (error) {
    console.error('Ошибка получения темы:', error);
    return {};
  }
}

// Проверка, запущено ли приложение в Telegram
export function isInTelegram(): boolean {
  return !!window.Telegram?.WebApp;
}

// Настройка главной кнопки
export function setupMainButton(text: string, onClick: () => void) {
  try {
    if (window.Telegram?.WebApp?.MainButton) {
      window.Telegram.WebApp.MainButton.setText(text);
      window.Telegram.WebApp.MainButton.onClick(onClick);
      window.Telegram.WebApp.MainButton.show();
    }
  } catch (error) {
    console.error('Ошибка настройки главной кнопки:', error);
  }
}

// Скрытие главной кнопки
export function hideMainButton() {
  try {
    if (window.Telegram?.WebApp?.MainButton) {
      window.Telegram.WebApp.MainButton.hide();
    }
  } catch (error) {
    console.error('Ошибка скрытия главной кнопки:', error);
  }
}

// Настройка кнопки "Назад"
export function setupBackButton(onClick: () => void) {
  try {
    if (window.Telegram?.WebApp?.BackButton) {
      window.Telegram.WebApp.BackButton.onClick(onClick);
      window.Telegram.WebApp.BackButton.show();
    }
  } catch (error) {
    console.error('Ошибка настройки кнопки "Назад":', error);
  }
}

// Скрытие кнопки "Назад"
export function hideBackButton() {
  try {
    if (window.Telegram?.WebApp?.BackButton) {
      window.Telegram.WebApp.BackButton.hide();
    }
  } catch (error) {
    console.error('Ошибка скрытия кнопки "Назад":', error);
  }
}

// Закрытие приложения
export function closeApp() {
  try {
    if (window.Telegram?.WebApp?.close) {
      window.Telegram.WebApp.close();
    }
  } catch (error) {
    console.error('Ошибка закрытия приложения:', error);
  }
}

// Вибрация
export function vibrate(type: 'impact' | 'notification' | 'selection' = 'impact') {
  try {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      switch (type) {
        case 'impact':
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
          break;
        case 'notification':
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          break;
        case 'selection':
          window.Telegram.WebApp.HapticFeedback.selectionChanged();
          break;
      }
    }
  } catch (error) {
    console.error('Ошибка вибрации:', error);
  }
}

// Показать уведомление
export function showAlert(message: string) {
  try {
    if (window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert(message);
    } else {
      alert(message);
    }
  } catch (error) {
    console.error('Ошибка показа уведомления:', error);
    alert(message);
  }
}

// Показать подтверждение
export function showConfirm(message: string, callback: (confirmed: boolean) => void) {
  try {
    if (window.Telegram?.WebApp?.showConfirm) {
      window.Telegram.WebApp.showConfirm(message, callback);
    } else {
      const confirmed = confirm(message);
      callback(confirmed);
    }
  } catch (error) {
    console.error('Ошибка показа подтверждения:', error);
    const confirmed = confirm(message);
    callback(confirmed);
  }
}
