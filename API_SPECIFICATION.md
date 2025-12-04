# Rejuvena API Specification

## Общая информация
- **Base URL**: Определяется в конфигурации приложения
- **Авторизация**: JWT токен в заголовке `Authorization: Bearer {token}`
- **Формат данных**: JSON
- **Версия документа**: 1.0
- **Дата создания**: 4 декабря 2025

---

## 1. GENERAL SETTINGS

### GET `/generalsetting/getgeneralsetting`
**Описание**: Получение общих настроек приложения (конфигурация, константы, флаги функций)  
**Метод**: GET  
**Авторизация**: Не требуется  
**Параметры**: Нет  
**Ответ**: 
```json
{
  "items": [
    {
      "settingName": "string",
      "settingValue": "string"
    }
  ]
}
```
**Примечания**: 
- Вызывается при инициализации приложения
- Возвращает массив настроек в виде пар ключ-значение
- Используется для конфигурации UI и бизнес-логики

---

## 2. AUTHENTICATION

### POST `/user/register`
**Описание**: Регистрация нового пользователя по email  
**Метод**: POST  
**Авторизация**: Не требуется  
**Параметры**: 
```json
{
  "email": "string (required)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "playerId": "string (OneSignal player ID)",
  "termCondtion": true,
  "referralCode": "string (optional, из Branch.io)"
}
```
**Ответ**: 
```json
{
  "success": true,
  "message": "Account created successfully"
}
```
**Примечания**: 
- После успешной регистрации показывается alert и пользователь перенаправляется на экран логина
- Поддержка реферальных кодов через Branch.io
- OneSignal playerId для push-уведомлений

### POST `/token/auth`
**Описание**: Аутентификация пользователя по email и паролю  
**Метод**: POST  
**Авторизация**: Не требуется  
**Параметры**: 
```json
{
  "username": "string (email)",
  "password": "string",
  "playerId": "string (OneSignal player ID)",
  "grant_type": "password"
}
```
**Ответ**: 
```json
{
  "access_token": "string (JWT token)",
  "token_type": "Bearer",
  "expires_in": 3600
}
```
**Примечания**: 
- OAuth 2.0 Password Grant Flow
- Токен сохраняется в AsyncStorage и используется для всех последующих запросов
- После успешного логина вызывается `decideAppSectionSaga` для определения следующего экрана

### GET `/user/resetpassword`
**Описание**: Отправка email для сброса пароля  
**Метод**: GET  
**Авторизация**: Не требуется  
**Параметры**: 
- `Email` (query string): email пользователя

**Ответ**: 
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```
**Примечания**: 
- Отправляет письмо со ссылкой для сброса пароля
- После успешной отправки пользователь возвращается на предыдущий экран

### GET `/token/login-with-gmail`
**Описание**: Аутентификация через Google OAuth  
**Метод**: GET  
**Авторизация**: Не требуется  
**Параметры**: 
- `providerToken` (query string): Google ID Token
- `playerId` (query string): OneSignal player ID
- `referralCode` (query string, optional): реферальный код

**Ответ**: 
```json
{
  "access_token": "string (JWT token)",
  "token_type": "Bearer",
  "IsGuestUser": false
}
```
**Примечания**: 
- Использует Google Sign-In SDK
- Перед входом выполняется signOut для очистки предыдущей сессии
- WebClientId из конфигурации: `Config.WEB_CLIENT_ID`
- Если аккаунт не существует, создается автоматически

### GET `/token/login-with-facebook`
**Описание**: Аутентификация через Facebook OAuth  
**Метод**: GET  
**Авторизация**: Не требуется  
**Параметры**: 
- `providerToken` (query string): Facebook Access Token
- `playerId` (query string): OneSignal player ID
- `referralCode` (query string, optional): реферальный код

**Ответ**: 
```json
{
  "access_token": "string (JWT token)",
  "token_type": "Bearer",
  "IsGuestUser": false
}
```
**Примечания**: 
- Использует Facebook SDK (react-native-fbsdk)
- Запрашивает разрешения: public_profile, email
- Если пользователь отменяет вход, выбрасывается ошибка 'authPage.signInCancel'

### GET `/token/login-with-apple`
**Описание**: Аутентификация через Apple Sign In (iOS)  
**Метод**: GET  
**Авторизация**: Не требуется  
**Параметры**: 
- `id` (query string): Apple User ID
- `firstName` (query string): имя пользователя
- `lastName` (query string): фамилия пользователя
- `email` (query string): email (может быть скрыт Apple)
- `providerToken` (query string): Apple Identity Token
- `playerId` (query string): OneSignal player ID
- `referralCode` (query string, optional): реферальный код

**Ответ**: 
```json
{
  "access_token": "string (JWT token)",
  "token_type": "Bearer",
  "IsGuestUser": false
}
```
**Примечания**: 
- Доступно только на iOS
- Запрашивает email и полное имя
- Credential state проверяется перед отправкой запроса
- Apple может скрывать email, возвращая relay email

### GET `/token/GuestUserLogin`
**Описание**: Вход в гостевом режиме (без регистрации)  
**Метод**: GET  
**Авторизация**: Не требуется  
**Параметры**: 
- `deviceId` (query string): уникальный ID устройства
- `referralCode` (query string, optional): реферальный код

**Ответ**: 
```json
{
  "access_token": "string (JWT token)",
  "token_type": "Bearer",
  "IsGuestUser": true
}
```
**Примечания**: 
- Использует уникальный ID устройства для идентификации
- Гостевой токен имеет ограниченные права доступа
- Флаг `IsGuestUser` используется для показа промо-экранов регистрации
- Возможность конвертации в полноценный аккаунт позже 

---

## 3. USER PROFILE

### GET `/user/getuserprofiledetail`
**Описание**: Получение полной информации о профиле текущего пользователя  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: Нет  
**Ответ**: 
```json
{
  "id": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "profileImageUrl": "string (URL)",
  "phoneNumber": "string",
  "dateOfBirth": "ISO 8601 date",
  "gender": "string",
  "country": "string",
  "city": "string",
  "bio": "string"
}
```
**Примечания**: 
- Вызывается при старте приложения для синхронизации данных профиля
- При первом вызове после логина регистрирует External User ID в OneSignal
- Устанавливает User ID в Amplitude для аналитики
- Автоматически обновляет язык пользователя на сервере

### POST `/user/updateprofile`
**Описание**: Обновление информации профиля пользователя (включая фото)  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: multipart/form-data
```
file: File (image, optional) - новое фото профиля
model: JSON string {
  "firstName": "string",
  "lastName": "string",
  "phoneNumber": "string",
  "dateOfBirth": "ISO 8601 date",
  "gender": "string",
  "country": "string",
  "city": "string",
  "bio": "string"
}
```
**Ответ**: 
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```
**Примечания**: 
- Поддержка загрузки фото профиля через multipart/form-data
- После успешного обновления автоматически перезагружает профиль
- Показывает toast-уведомление "Profile updated successfully"
- Поддерживаемые форматы изображений: JPEG, PNG

### POST `/user/changepassword`
**Описание**: Изменение пароля пользователя  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
```json
{
  "password": "string (текущий пароль)",
  "newPassword": "string (новый пароль)",
  "confirmPassword": "string (подтверждение)"
}
```
**Ответ**: 
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```
**Примечания**: 
- Требует ввода текущего пароля для подтверждения
- Новый пароль должен совпадать с confirmPassword
- После успешной смены экран перезагружается (NavigationService.replace)
- Событие аналитики: 'PASSWORD_CHANGED'

### GET `/User/DeleteAccount`
**Описание**: Удаление аккаунта пользователя  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: Нет  
**Ответ**: 
```json
{
  "success": true,
  "message": "Account deleted"
}
```
**Примечания**: 
- Безвозвратное удаление всех данных пользователя
- После удаления выполняется logout и очистка локальных данных
- Событие аналитики: 'ACCOUNT_DELETED'
- Пользователь перенаправляется на экран авторизации

### GET `/User/SetUserLanguage`
**Описание**: Установка предпочитаемого языка интерфейса пользователя  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `Email` (query string): email пользователя
- `LanguageCulture` (query string): код языка (ru-RU, en-US, etc.)

**Ответ**: 
```json
{
  "success": true
}
```
**Примечания**: 
- Автоматически вызывается при первом запуске после логина
- Использует язык устройства (getDeviceLanguage)
- Влияет на язык уведомлений и email-рассылок

---

## 4. ORDERS

### GET `/order/getuserorders`
**Описание**: Получение списка всех заказов/подписок пользователя  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `timeZoneOffSet` (query string): смещение часового пояса в минутах

**Ответ**: 
```json
{
  "items": [
    {
      "orderId": "string",
      "marathonId": "string",
      "marathonName": "string",
      "orderDate": "ISO 8601 datetime",
      "status": "string (Active, Expired, Cancelled)",
      "price": number,
      "currency": "string",
      "subscriptionType": "string (Free, Paid, Trial)",
      "expiryDate": "ISO 8601 datetime",
      "autoRenewal": boolean
    }
  ]
}
```
**Примечания**: 
- Учитывает часовой пояс пользователя для корректного отображения дат
- Включает как платные, так и бесплатные курсы
- Сортировка по дате создания (новые сверху)

### GET `/order/checkformarathonpurchased`
**Описание**: Проверка, куплен ли конкретный марафон пользователем  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `marathonId` (query string): ID марафона для проверки

**Ответ**: 
```json
{
  "isPurchased": boolean,
  "orderId": "string (если куплен)",
  "expiryDate": "ISO 8601 datetime (если куплен)"
}
```
**Примечания**: 
- Используется для контроля доступа к контенту марафона
- Быстрая проверка без загрузки всех заказов

### GET `/order/purchasemarathon`
**Описание**: Покупка/активация марафона по купону (бесплатные курсы)  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `orderNumber` (query string): номер заказа (из CreateOrder)
- `couponCode` (query string): код купона (может быть null для бесплатных)
- `timeZoneOffset` (query string): смещение часового пояса

**Ответ**: 
```json
{
  "success": true,
  "message": "Marathon activated",
  "orderId": "string"
}
```
**Примечания**: 
- Для бесплатных курсов couponCode = null
- Требует предварительного создания заказа через CreateOrder
- События аналитики: 'Subscribed Demo Course' (гость), 'Subscribed Free Course' (пользователь)
- После активации перенаправляет на экран старта марафона

### GET `/Order/CreateOrder`
**Описание**: Создание нового заказа для марафона  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `marathonId` (query string): ID марафона для создания заказа

**Ответ**: 
```json
{
  "orderId": "string (UUID)",
  "orderNumber": "string"
}
```
**Примечания**: 
- Первый шаг в процессе покупки марафона
- Возвращает orderId/orderNumber для последующих операций
- Заказ в статусе "Pending" до завершения оплаты или активации купона 

---

## 5. MARATHON / EXERCISES

### GET `/usermarathon/startmarathon`
**Описание**: Получение полной информации о марафоне и прогрессе пользователя  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `marathonId` (query string): ID марафона
- `timeZoneOffset` (query string): смещение часового пояса в минутах

**Ответ**: 
```json
{
  "marathonId": "string",
  "title": "string",
  "description": "string",
  "imageUrl": "string",
  "startDate": "ISO 8601 datetime",
  "endDate": "ISO 8601 datetime",
  "isTermsAccepted": boolean,
  "totalDays": number,
  "completedDays": number,
  "progress": number (0-100),
  "days": [
    {
      "dayId": "string",
      "day": number,
      "title": "string",
      "description": "string",
      "dayDate": "ISO 8601 datetime",
      "isLocked": boolean,
      "completedExercises": number,
      "totalExercises": number,
      "rating": number (0-5 stars)
    }
  ]
}
```
**Примечания**: 
- Центральный эндпоинт для получения структуры марафона
- Включает прогресс по дням и упражнениям
- Учитывает часовой пояс для корректного отображения дат открытия дней

### GET `/usermarathon/acceptcourserules`
**Описание**: Принятие/отклонение правил марафона пользователем  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `status` (query string): true (принято) / false (отклонено)
- `courseId` (query string): ID марафона

**Ответ**: 
```json
{
  "isTermsAccepted": boolean,
  "acceptedDate": "ISO 8601 datetime"
}
```
**Примечания**: 
- Обязательно для доступа к контенту марафона
- Событие аналитики: 'ACCEPT_COURSE_RULES' с параметром status
- После принятия открывается доступ к первому дню

### GET `/usermarathon/getdayexercise`
**Описание**: Получение списка упражнений для конкретного дня марафона  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `marathonId` (query string): ID марафона
- `dayId` (query string): ID дня
- `timeZoneOffset` (query string): смещение часового пояса

**Ответ**: 
```json
{
  "marathonDay": {
    "id": "string",
    "day": number,
    "description": "string",
    "dayDate": "ISO 8601 datetime",
    "isShowThreeStarPopup": boolean,
    "isShowFiveStarPopup": boolean
  },
  "title": "string",
  "exercises": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "videoUrl": "string",
      "imageUrl": "string",
      "duration": number (секунды),
      "type": "string (Video, Reading, Practice)",
      "status": "string (NotStarted, InProgress, Completed)",
      "order": number,
      "commentsCount": number
    }
  ]
}
```
**Примечания**: 
- Упражнения сортируются по полю order
- Флаги isShowThreeStarPopup/isShowFiveStarPopup для показа оценочных попапов
- Событие аналитики: 'Exercise' с параметрами day, productTitle, title

### POST `/usermarathon/setuserexercisestatus`
**Описание**: Изменение статуса выполнения упражнения (отметка как выполненное)  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
```json
{
  "dayId": "string",
  "marathonExerciseId": "string",
  "status": "string (Completed, InProgress)"
}
```
**Ответ**: 
```json
{
  "success": true,
  "day": number,
  "isPracticeDay": boolean,
  "progress": number (0-100, прогресс дня),
  "rating": number (звезды за день)
}
```
**Примечания**: 
- Автоматически пересчитывает прогресс дня и марафона
- Событие аналитики: 'Star' с параметрами day, star, productTitle
- После изменения статуса обновляет данные марафона (fork getMarathonSaga)
- Рейтинг (звезды) рассчитывается по прогрессу: <33% = 1★, <66% = 2★, etc.

### GET `/usermarathon/getcomments`
**Описание**: Получение комментариев к упражнению (корневые комментарии)  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `exerciseId` (query string): ID упражнения
- `marathonId` (query string): ID марафона
- `timeZoneOffset` (query string): смещение часового пояса

**Ответ**: 
```json
{
  "items": [
    {
      "id": "string",
      "userId": "string",
      "userName": "string",
      "userAvatar": "string (URL)",
      "text": "string",
      "createdDate": "ISO 8601 datetime",
      "likesCount": number,
      "isLiked": boolean,
      "repliesCount": number,
      "canEdit": boolean,
      "canDelete": boolean
    }
  ]
}
```
**Примечания**: 
- Загружает только корневые комментарии (без вложенных ответов)
- Для загрузки ответов используется getchildcomments
- Сортировка по дате (новые сверху)

### GET `/usermarathon/getchildcomments`
**Описание**: Получение ответов (вложенных комментариев) на комментарий  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `commentId` (query string): ID родительского комментария
- `exerciseId` (query string): ID упражнения
- `marathonId` (query string): ID марафона
- `timeZoneOffset` (query string): смещение часового пояса

**Ответ**: 
```json
{
  "items": [
    {
      "id": "string",
      "parentCommentId": "string",
      "userId": "string",
      "userName": "string",
      "userAvatar": "string (URL)",
      "text": "string",
      "createdDate": "ISO 8601 datetime",
      "likesCount": number,
      "isLiked": boolean
    }
  ]
}
```
**Примечания**: 
- Поддерживает только один уровень вложенности (ответы на комментарии)
- Поле parentCommentId автоматически добавляется на клиенте

### POST `/usermarathon/createcomment`
**Описание**: Создание нового комментария или ответа на комментарий  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
```json
{
  "comment": "string (текст комментария)",
  "commentId": "string (optional, для ответов)",
  "exerciseId": "string",
  "marathonId": "string",
  "parentCommentId": "string (optional, ID родительского комментария)",
  "timeZoneOffset": number
}
```
**Ответ**: 
```json
{
  "id": "string",
  "userId": "string",
  "userName": "string",
  "userAvatar": "string",
  "text": "string",
  "createdDate": "ISO 8601 datetime",
  "likesCount": 0,
  "isLiked": false,
  "parentCommentId": "string (если это ответ)"
}
```
**Примечания**: 
- Если parentCommentId указан, создается ответ на комментарий
- Если commentId не указан, создается новый корневой комментарий
- Комментарий сразу добавляется в локальный стор без перезагрузки списка

### GET `/marathon/likecomment`
**Описание**: Лайк/анлайк комментария  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `commentId` (query string): ID комментария

**Ответ**: 
```json
{
  "success": true,
  "likesCount": number,
  "isLiked": boolean
}
```
**Примечания**: 
- Работает как toggle: повторный вызов убирает лайк
- Возвращает обновленное количество лайков

### GET `/Marathon/ExtensionDescription`
**Описание**: Получение детального описания марафона (лендинг страница)  
**Метод**: GET  
**Авторизация**: Bearer Token (optional, работает и для гостей)  
**Параметры**: 
- `marathonid` (query string): ID марафона

**Ответ**: 
```json
{
  "id": "string",
  "title": "string",
  "description": "string (HTML)",
  "imageUrl": "string",
  "videoUrl": "string (promo video)",
  "price": number,
  "currency": "string",
  "duration": number (дней),
  "features": ["string"],
  "testimonials": [
    {
      "userName": "string",
      "userAvatar": "string",
      "text": "string",
      "rating": number
    }
  ],
  "isPurchased": boolean
}
```
**Примечания**: 
- Используется на экране с подробностями курса перед покупкой
- Поддержка HTML в description для богатого форматирования
- Доступно для незарегистрированных пользователей

### GET `/usermarathon/UpdateDayStarValue`
**Описание**: Обновление оценки дня пользователем (звезды)  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `dayId` (query string): ID дня
- `value` (query string): оценка (1-5)
- `popup` (query string): тип попапа ('three' / 'five')
- `timeZoneOffset` (query string): смещение часового пояса

**Ответ**: 
```json
{
  "success": true,
  "averageRating": number
}
```
**Примечания**: 
- Вызывается при закрытии оценочного попапа после завершения дня
- Событие аналитики: 'Three Star Popup' или 'Five Star Popup'
- Используется для улучшения контента и мотивации пользователей

### GET `/marathon/getcourseplan`
**Описание**: Получение доступных тарифных планов для марафона  
**Метод**: GET  
**Авторизация**: Bearer Token (optional)  
**Параметры**: 
- `courseId` (query string): ID марафона

**Ответ**: 
```json
{
  "plans": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "price": number,
      "currency": "string",
      "duration": number (месяцев),
      "androidProductId": "string",
      "iosProductId": "string",
      "features": ["string"],
      "isMostPopular": boolean,
      "discount": number (процент скидки)
    }
  ]
}
```
**Примечания**: 
- Возвращает планы с привязкой к продуктам IAP (In-App Purchase)
- Клиент запрашивает актуальные цены из Google Play / App Store
- Планы сортируются по цене (от дешевых к дорогим)
- Поддержка реферальных кодов (передается в Branch.io)

### GET `/marathon/GetMarathonsGuestUser`
**Описание**: Получение списка доступных марафонов для гостевых пользователей  
**Метод**: GET  
**Авторизация**: Не требуется  
**Параметры**: Нет  
**Ответ**: 
```json
{
  "marathons": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "imageUrl": "string",
      "duration": number,
      "isFree": boolean,
      "isDemo": boolean,
      "category": "string"
    }
  ]
}
```
**Примечания**: 
- Показывает только публичные марафоны для незарегистрированных пользователей
- Используется на экране выбора курса при гостевом входе
- Включает демо-версии платных курсов

### GET `/marathon/GetDemoCourseList`
**Описание**: Получение списка демо-версий курсов  
**Метод**: GET  
**Авторизация**: Не требуется  
**Параметры**: Нет  
**Ответ**: 
```json
{
  "courses": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "imageUrl": "string",
      "previewDays": number,
      "fullCourseId": "string"
    }
  ]
}
```
**Примечания**: 
- Демо-курсы дают доступ к ограниченному набору дней (обычно 3-7)
- Используются для конвертации гостей в платящих пользователей
- Ссылка fullCourseId ведет на полную версию курса 

---

## 6. PHOTO DIARY / CONTEST

### GET `/contest/getcontest`
**Описание**: Получение информации о текущем активном конкурсе фотодневника  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `marathonId` (query string): ID марафона

**Ответ**: 
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "startDate": "ISO 8601 datetime",
  "endDate": "ISO 8601 datetime",
  "isActive": boolean,
  "isParticipating": boolean,
  "isRulesAccepted": boolean,
  "rejuvenationChallengeId": "string",
  "prizes": [
    {
      "place": number,
      "description": "string",
      "imageUrl": "string"
    }
  ]
}
```
**Примечания**: 
- Возвращает активный конкурс для данного марафона
- isParticipating: согласие пользователя на участие в публичном конкурсе
- isRulesAccepted: принятие правил конкурса
- rejuvenationChallengeId используется для получения победителей

### GET `/contest/GetContestGuestUser`
**Описание**: Получение информации о конкурсе для гостевых пользователей (для голосования)  
**Метод**: GET  
**Авторизация**: Не требуется  
**Параметры**: Нет  
**Ответ**: 
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "startDate": "ISO 8601 datetime",
  "endDate": "ISO 8601 datetime",
  "votingStartDate": "ISO 8601 datetime",
  "votingEndDate": "ISO 8601 datetime",
  "isVotingActive": boolean
}
```
**Примечания**: 
- Публичная информация о конкурсе без авторизации
- Используется на экране голосования для всех пользователей
- Показывает даты голосования отдельно от основного периода конкурса

### GET `/contest/getusercontestimages`
**Описание**: Получение всех загруженных фото пользователя в фотодневнике  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `contestId` (query string, optional): ID конкурса
- `marathonId` (query string): ID марафона
- `timeZoneOffset` (query string): смещение часового пояса

**Ответ**: 
```json
{
  "beforeImages": [
    {
      "imagePosition": number (1-5),
      "positionName": "string (front/left/right/profile/closeup)",
      "imageUrl": "string",
      "uploadDate": "ISO 8601 datetime",
      "isConfirmed": boolean,
      "croppedImageUrl": "string",
      "maskType": "string"
    }
  ],
  "afterImages": [
    {
      "imagePosition": number (1-5),
      "positionName": "string",
      "imageUrl": "string",
      "uploadDate": "ISO 8601 datetime",
      "isConfirmed": boolean,
      "croppedImageUrl": "string",
      "maskType": "string"
    }
  ],
  "completedPositions": {
    "before": number,
    "after": number
  }
}
```
**Примечания**: 
- 5 позиций фото: фронтальное (1), левый профиль (2), правый профиль (3), профиль (4), closeup (5)
- beforeImages: фото "до" (начало марафона)
- afterImages: фото "после" (конец марафона)
- isConfirmed: фото обрезано с маской и подтверждено пользователем
- Автоматически загружает userRecord (данные анкеты)

### POST `/contest/uploadcontestimages`
**Описание**: Загрузка оригинального фото в фотодневник (первый шаг)  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: multipart/form-data
```
model: JSON string {
  "ContestId": "string",
  "ImagePostion": number (1-5),
  "MarathonId": "string",
  "masktype": "string (before/after)"
}
file: File (image)
```
**Ответ**: 
```json
{
  "imageUrl": "string",
  "imageId": "string",
  "uploadDate": "ISO 8601 datetime"
}
```
**Примечания**: 
- Первый шаг загрузки: загружает полное изображение
- После загрузки вызывается uploadusermaskimages для обрезки с маской
- Поддержка onUploadProgress для progress bar
- ImagePosition: 1-фронт, 2-левый, 3-правый, 4-профиль, 5-closeup

### POST `/contest/uploadusermaskimages`
**Описание**: Обрезка и маскирование загруженного фото (второй шаг)  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: multipart/form-data
```
model: JSON string {
  "ContestId": "string",
  "ImagePostion": number (1-5),
  "MarathonId": "string",
  "masktype": "string (before/after)"
}
file: File (image)
```
**Ответ**: 
```json
{
  "croppedImageUrl": "string",
  "fileName": "string",
  "imgPath": "string",
  "maskApplied": boolean
}
```
**Примечания**: 
- Второй шаг: применяет маску к фото для единообразия
- Возвращает обрезанное фото с примененной маской
- fileName и imgPath используются для confirmcontestmaskimages
- Поддержка onUploadProgress

### POST `/contest/confirmcontestmaskimages`
**Описание**: Подтверждение обрезанного фото с маской (третий финальный шаг)  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: multipart/form-data
```
model: JSON string {
  "ContestId": "string",
  "ImagePostion": number (1-5),
  "MarathonId": "string",
  "masktype": "string"
}
fileName: string
ImgPath: string
```
**Ответ**: 
```json
{
  "success": true,
  "isConfirmed": true,
  "imageUrl": "string (финальный URL)"
}
```
**Примечания**: 
- Финальный шаг: сохраняет подтвержденное фото
- После подтверждения автоматически обновляет список фото (getContestImagesSaga)
- Показывает поздравительные экраны при завершении всех фото "до" или "после"
- События: canShowCongratsForBefore, canShowCongratsForAfter

### GET `/contest/takepartincontest`
**Описание**: Согласие/отказ на участие в публичном конкурсе (публикация фото)  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `marathonId` (query string): ID марафона
- `isContestParticipated` (query string): true/false

**Ответ**: 
```json
{
  "success": true,
  "isParticipating": boolean
}
```
**Примечания**: 
- Управляет публичностью фото пользователя
- true: фото будут видны другим для голосования
- false: фото остаются приватными (только для пользователя)
- События аналитики: "'Yes' To Share Images" или "'No' To Share Images"

### GET `/contest/acceptcontestrules`
**Описание**: Принятие/отклонение правил конкурса  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `marathonId` (query string): ID марафона
- `contestRulesAccepted` (query string): true/false

**Ответ**: 
```json
{
  "success": true,
  "rulesAccepted": boolean,
  "acceptedDate": "ISO 8601 datetime"
}
```
**Примечания**: 
- Обязательно для участия в конкурсе
- Правила включают: требования к фото, призы, условия публикации
- Событие аналитики (при true): 'Agree Photo-diary Rules'
- После принятия открывается доступ к загрузке фото 

### GET `/contest/downloadcollageimageforuser`
**Описание**: Скачивание коллажа с фото "до" и "после" в формате изображения  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `marathonId` (query string): ID марафона
- `timeZoneOffset` (query string): смещение часового пояса

**Ответ**: 
```
Binary image data (PNG/JPEG)
Content-Type: image/png
```
**Примечания**: 
- Генерирует коллаж из всех фото "до" и "после"
- Включает сравнение фронтального, профильных и closeup фото
- Используется для сохранения результатов марафона
- Доступно через RNFetchBlob для сохранения в галерею

### GET `/contest/downloadcollageimageforuserpdf`
**Описание**: Скачивание коллажа с фото "до" и "после" в формате PDF  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `marathonId` (query string): ID марафона
- `timeZoneOffset` (query string): смещение часового пояса

**Ответ**: 
```
Binary PDF data
Content-Type: application/pdf
```
**Примечания**: 
- PDF версия коллажа для печати или отправки
- Включает брендинг приложения и данные марафона
- Более высокое качество по сравнению с изображением
- Поддержка разрешений на запись в хранилище

### POST `/contest/setuserrecordbeforephotoupload`
**Описание**: Сохранение анкетных данных пользователя (возраст, вес, рост, комментарии)  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: multipart/form-data
```
model: JSON string {
  "contestId": "string",
  "marathonId": "string",
  "isItForAfter": boolean,
  "comment": "string (опционально)",
  "age": number,
  "weight": number,
  "height": number,
  "Like": "string (что понравилось, опционально)",
  "Photodiary": boolean (флаг загрузки фото),
  "isForPhotodiary": boolean
}
```
**Ответ**: 
```json
{
  "success": true
}
```
**Примечания**: 
- isItForAfter: false для данных "до", true для данных "после"
- Сохраняет метрики и впечатления от марафона
- После сохранения автоматически перезагружает данные (getRecordForBeforePhotoUploadSaga)
- Toast: "Data updated successfully"
- Используется для статистики и мотивации пользователей

### GET `/contest/getuserrecordbeforephotoupload`
**Описание**: Получение сохраненных анкетных данных пользователя  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `marathonId` (query string): ID марафона
- `contestId` (query string): ID конкурса

**Ответ**: 
```json
{
  "before": {
    "age": number,
    "weight": number,
    "height": number,
    "comment": "string",
    "date": "ISO 8601 datetime"
  },
  "after": {
    "age": number,
    "weight": number,
    "height": number,
    "comment": "string",
    "like": "string",
    "date": "ISO 8601 datetime"
  }
}
```
**Примечания**: 
- Загружается автоматически при получении фото (getContestImagesSaga)
- Используется для предзаполнения форм и отображения прогресса
- Разделение на данные "до" и "после" марафона

### GET `/User/GetAllCourseUers`
**Описание**: Получение списка финалистов конкурса для голосования  
**Метод**: GET  
**Авторизация**: Bearer Token (optional)  
**Параметры**: 
- `marathonId` (query string): ID марафона
- `pageSize` (query string): количество записей на странице (обычно 100)
- `pageIndex` (query string): номер страницы (0-based)

**Ответ**: 
```json
{
  "items": [
    {
      "id": "string (finalist ID)",
      "userId": "string",
      "userName": "string",
      "userAge": number,
      "beforeImages": [
        {
          "imagePosition": number,
          "imageUrl": "string"
        }
      ],
      "afterImages": [
        {
          "imagePosition": number,
          "imageUrl": "string"
        }
      ],
      "totalVote": number,
      "isVoted": boolean,
      "comment": "string",
      "metrics": {
        "weightBefore": number,
        "weightAfter": number,
        "ageBefore": number,
        "ageAfter": number
      }
    }
  ],
  "totalCount": number
}
```
**Примечания**: 
- Показывает всех участников, давших согласие на публикацию (isContestParticipated=true)
- isVoted: проголосовал ли текущий пользователь за этого финалиста
- Пагинация для больших списков (обычно загружается 100 записей)
- Используется на экране голосования

### POST `/contest/vote`
**Описание**: Голосование за финалиста конкурса (лайк/анлайк)  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
```json
{
  "contestId": "string",
  "marathonId": "string (hardcoded в коде)",
  "finalistId": "string",
  "isActive": boolean (true=лайк, false=убрать лайк),
  "timeZoneOffset": number
}
```
**Ответ**: 
```json
{
  "success": true,
  "totalVotes": number,
  "isVoted": boolean
}
```
**Примечания**: 
- Работает как toggle: повторный вызов убирает голос
- Оптимистичное обновление UI (updateContestFinalist в Redux перед запросом)
- События аналитики: 'Increment Vote For RC' или 'Decrement Vote For RC'
- marathonId хардкоден: '8AE4DB8B-B256-462A-8918-7E7811243D64' (legacy)

### GET `/Contest/GetWinners`
**Описание**: Получение списка победителей конкурса (устаревший эндпоинт)  
**Метод**: GET  
**Авторизация**: Bearer Token (optional)  
**Параметры**: 
- `contestId` (query string): ID конкурса

**Ответ**: 
```json
{
  "winners": [
    {
      "place": number,
      "userId": "string",
      "userName": "string",
      "totalVotes": number,
      "prize": "string",
      "images": ["string"]
    }
  ]
}
```
**Примечания**: 
- Устаревший, используется GetRejuvenationChallengeWinners в новых версиях
- Возвращает топ-3 (или больше) победителей
- Сортировка по количеству голосов

### GET `/Contest/GetRejuvenationChallengeWinners`
**Описание**: Получение победителей Rejuvenation Challenge (обновленная версия)  
**Метод**: GET  
**Авторизация**: Bearer Token (optional)  
**Параметры**: 
- `rejuvenationChallengeId` (query string): ID челленджа из getcontest

**Ответ**: 
```json
{
  "winners": [
    {
      "place": number,
      "finalistId": "string",
      "userId": "string",
      "userName": "string",
      "userAge": number,
      "totalVotes": number,
      "prize": "string",
      "prizeDescription": "string",
      "beforeImages": [{"imagePosition": number, "imageUrl": "string"}],
      "afterImages": [{"imagePosition": number, "imageUrl": "string"}],
      "metrics": {
        "weightChange": number,
        "ageChange": number
      }
    }
  ],
  "announcementDate": "ISO 8601 datetime"
}
```
**Примечания**: 
- Актуальная версия получения победителей
- Включает детальную информацию о призах и метриках
- Автоматически загружает contest перед получением победителей (getContestSaga)
- Используется rejuvenationChallengeId из объекта contest

### POST `/contest/UploadImageAgeBot`
**Описание**: Определение возраста по фото через AI (Age Bot + InsightFace)  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: multipart/form-data
```
file: File (image) - фото лица пользователя
```
**Ответ**: 
```json
{
  "age": number (определенный возраст),
  "confidence": number (0-1, уверенность модели),
  "croppedImageUrl": "string (обрезанное фото лица)",
  "status": "success"
}
```
**Примечания**: 
- Использует InsightFace AI для определения возраста
- Прокси через бэкенд к Age-bot API (37.252.20.170:5000)
- Автоматически обрезает и центрирует лицо на фото
- Событие аналитики: 'Checkout Age Bot Result'
- Используется для мотивации: показывает "биологический возраст"
- Может возвращать null age если лицо не обнаружено
- Поддержка onUploadProgress для индикации загрузки 

---

## 7. PAYMENTS / SUBSCRIPTIONS

### POST `/order/googlesubscription`
**Описание**: Подтверждение покупки подписки через Google Play (Android)  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: multipart/form-data
```
orderid: string - ID заказа из CreateOrder
receipt: string - transactionReceipt от Google Play Billing
```
**Ответ**: 
```json
{
  "success": true,
  "orderId": "string",
  "subscriptionStatus": "Active",
  "expiryDate": "ISO 8601 datetime"
}
```
**Примечания**: 
- Вызывается после успешного requestSubscription через react-native-iap
- Сервер верифицирует receipt через Google Play Developer API
- После успешной верификации транзакция финализируется (finishTransaction)
- Событие аналитики: 'Subscribed Course' с productId
- Активирует доступ к платному контенту марафона

### POST `/order/IOSSubscription`
**Описание**: Подтверждение покупки подписки через App Store (iOS)  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
```json
{
  "orderId": "string",
  "receiptData": "string (base64)",
  "productId": "string"
}
```
**Ответ**: 
```json
{
  "success": true,
  "orderId": "string",
  "subscriptionStatus": "Active",
  "expiryDate": "ISO 8601 datetime"
}
```
**Примечания**: 
- Вызывается после requestPurchase через react-native-iap на iOS
- Сервер верифицирует receipt через Apple App Store API
- Поддерживает тестовую среду (sandbox) и production
- Автоматическое продление подписки управляется App Store

### POST `/Order/VerifyIOSSubscriptionData`
**Описание**: Дополнительная верификация данных iOS подписки  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
```json
{
  "receiptData": "string (base64)",
  "transactionId": "string"
}
```
**Ответ**: 
```json
{
  "isValid": boolean,
  "expiryDate": "ISO 8601 datetime",
  "productId": "string",
  "originalTransactionId": "string"
}
```
**Примечания**: 
- Используется для проверки статуса существующей подписки
- Проверяет валидность и срок действия
- Может использоваться при восстановлении покупок

### GET `/Order/UnSubscribeFreeCourse`
**Описание**: Отписка от бесплатного курса  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `marathonId` (query string): ID марафона для отписки

**Ответ**: 
```json
{
  "success": true,
  "message": "Unsubscribed successfully"
}
```
**Примечания**: 
- Применяется только к бесплатным курсам
- После отписки обновляет список заказов (getOrders)
- Очищает текущий марафон в Redux (setMarathon(null))
- Перенаправляет на экран списка курсов
- Событие аналитики: 'Free Course Unsubscribed'

---

## 8. NOTIFICATIONS

### GET `/usermarathon/getnotification`
**Описание**: Получение списка уведомлений пользователя (новые и старые)  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
- `timeZone` (query string): смещение часового пояса в минутах

**Ответ**: 
```json
{
  "newNotification": [
    {
      "id": "string",
      "title": "string",
      "message": "string",
      "type": "string (System, Marathon, Contest)",
      "createdDate": "ISO 8601 datetime",
      "isRead": false,
      "actionUrl": "string (deep link, optional)",
      "imageUrl": "string (optional)"
    }
  ],
  "oldNotification": [
    {
      "id": "string",
      "title": "string",
      "message": "string",
      "type": "string",
      "createdDate": "ISO 8601 datetime",
      "isRead": true
    }
  ]
}
```
**Примечания**: 
- Разделение на новые (непрочитанные) и старые (прочитанные)
- Новые уведомления помечаются флагом isNew на клиенте
- Учитывает часовой пояс для корректного отображения времени
- Поддержка deep links для навигации при клике

### POST `/usermarathon/saveusernotificationstate`
**Описание**: Отметка уведомлений как прочитанных  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
```json
["notificationId1", "notificationId2", ...]
```
**Ответ**: 
```json
{
  "success": true
}
```
**Примечания**: 
- Принимает массив ID уведомлений
- Вызывается при просмотре уведомления пользователем
- Не требует перезагрузки списка уведомлений (оптимистичное обновление)

### POST `/usermarathon/deletenotification`
**Описание**: Удаление уведомления  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
```json
{
  "notificationId": "string"
}
```
**Ответ**: 
```json
{
  "success": true
}
```
**Примечания**: 
- Безвозвратное удаление уведомления
- После удаления автоматически перезагружает список (getNotificationsSaga)
- Показывает toast при ошибке

### POST `/marathon/SetUserNotificationSettings`
**Описание**: Сохранение настроек уведомлений пользователя  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: multipart/form-data
```
model: JSON string {
  "DailyReminder": boolean,
  "MorningReminder": boolean,
  "MassageReminder": boolean,
  "MorningReminderTime": "HH:mm",
  "MassageReminderTime": "HH:mm",
  "MorningReminderDays": ["Monday", "Tuesday", ...],
  "MassageReminderDays": ["Monday", "Wednesday", ...]
}
```
**Ответ**: 
```json
{
  "success": true
}
```
**Примечания**: 
- DailyReminder: ежедневные напоминания о курсе
- MorningReminder: утренние напоминания о зарядке
- MassageReminder: напоминания о массаже лица
- Поддержка выбора дней недели и времени для каждого типа
- После сохранения показывает toast "Settings saved successfully"
- Автоматически перезагружает настройки (getNotificationsSettingsSaga)

### GET `/marathon/GetUserNotificationSettings`
**Описание**: Получение текущих настроек уведомлений пользователя  
**Метод**: GET  
**Авторизация**: Bearer Token (required)  
**Параметры**: Нет  
**Ответ**: 
```json
{
  "dailyReminder": boolean,
  "morningReminder": boolean,
  "massageReminder": boolean,
  "morningReminderTime": "HH:mm",
  "massageReminderTime": "HH:mm",
  "morningReminderDays": ["string"],
  "massageReminderDays": ["string"]
}
```
**Примечания**: 
- Загружается при открытии экрана настроек уведомлений
- Значения по умолчанию устанавливаются на сервере при создании аккаунта
- Синхронизируется с OneSignal для управления push-уведомлениями

---

## 9. USER FEEDBACK

### POST `/usermarathon/createreview`
**Описание**: Отправка отзыва/оценки приложения от пользователя  
**Метод**: POST  
**Авторизация**: Bearer Token (required)  
**Параметры**: 
```json
{
  "Ratings": number (1-5),
  "Feedback": "string (текст отзыва)",
  "Platform": "string (iOS / Android)",
  "AppVersion": "string (версия приложения)"
}
```
**Ответ**: 
```json
{
  "success": true,
  "message": "Thank you for your feedback"
}
```
**Примечания**: 
- Ratings: оценка от 1 до 5 звезд
- Feedback может быть пустым при быстрой оценке
- AppVersion автоматически получается через react-native-version-check
- После отправки показывает toast "Feedback saved successfully"
- Данные используются для улучшения приложения и анализа удовлетворенности
- При высокой оценке (4-5) может предложить оставить отзыв в App Store/Google Play 

---

## СТАТУС ЗАПОЛНЕНИЯ

- [x] 0-20%: General Settings + Authentication (Итерация 1) ✅
- [x] 20-40%: User Profile + Orders (Итерация 2) ✅
- [x] 40-60%: Marathon / Exercises (Итерация 3) ✅
- [x] 60-70%: Photo Diary - Основные операции (Итерация 4a) ✅
- [x] 70-80%: Photo Diary - Конкурс и голосование (Итерация 4b) ✅
- [x] 80-100%: Payments + Notifications + Feedback (Итерация 5) ✅

**Всего API эндпоинтов**: 57  
**Заполнено**: 57 (100%) 🎉

**Документация завершена!**
