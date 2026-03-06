# Cloud-1S Server

Backend-сервис на NestJS для управления облачными базами 1С.

## 📋 Описание

Сервис предоставляет REST API для:
- Регистрации и аутентификации пользователей
- Подтверждения учетных записей администратором
- Создания и управления базами 1С
- Загрузки файлов выгрузки `.dt` для восстановления баз
- Отслеживания статуса операций восстановления
- Просмотра истории применённых файлов

## 🛠 Технологии

- **Фреймворк:** NestJS 11.x
- **Язык:** TypeScript 5.7.x
- **База данных:** PostgreSQL (TypeORM)
- **Аутентификация:** JWT (passport-jwt, bcrypt)
- **Валидация:** class-validator, class-transformer
- **Файлы:** Multer
- **Интеграция:** 1C Enterprise (child_process)

## 📁 Структура проекта

```
server/
├── src/
│   ├── auth/              # Модуль аутентификации
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── entities/user.entity.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   └── decorators/
│   │
│   ├── admin/             # Админ-модуль для управления пользователями
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── dto/
│   │
│   ├── bases/             # Модуль управления базами 1С
│   │   ├── bases.controller.ts
│   │   ├── bases.service.ts
│   │   ├── entities/base1c.entity.ts
│   │   └── dto/
│   │
│   ├── dt-files/          # Модуль файлов выгрузки .dt
│   │   ├── dt-files.controller.ts
│   │   ├── dt-files.service.ts
│   │   └── entities/dt-file.entity.ts
│   │
│   ├── command-executor/  # Модуль выполнения команд 1С
│   │   └── command-executor.service.ts
│   │
│   ├── seeds/             # Сиды для начального наполнения
│   │   ├── seeds.module.ts
│   │   └── seeds.service.ts
│   │
│   ├── app.module.ts
│   ├── app.controller.ts
│   └── main.ts
│
├── dt-files/              # Загруженные файлы .dt
├── logs/                  # Логи операций 1С
├── .env.example
├── package.json
└── tsconfig.json
```

## ⚙️ Установка

```bash
# Установка зависимостей
npm install
```

## 🔧 Настройка

Создайте файл `.env` на основе `.env.example`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=cloud1c

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# 1C Enterprise
ONEC_PATH=C:\Program Files\1cv8\8.3.25.1549\bin\1cv8.exe
ONEC_RESOLUTION_CODE=КодРазрешения

# Server
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Environment
NODE_ENV=development
```

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `DB_HOST` | Хост PostgreSQL | `localhost` |
| `DB_PORT` | Порт PostgreSQL | `5432` |
| `DB_USERNAME` | Пользователь БД | `postgres` |
| `DB_PASSWORD` | Пароль БД | `postgres` |
| `DB_DATABASE` | Имя базы данных | `cloud1c` |
| `JWT_SECRET` | Секретный ключ JWT | — |
| `ONEC_PATH` | Путь к 1cv8.exe | — |
| `ONEC_RESOLUTION_CODE` | Код разрешения 1С | — |
| `RAC_PATH` | Путь к rac.exe | — |
| `IB_CMD_PATH` | Путь к ibcmd.exe | — |
| `WEBINST_PATH` | Путь к webinst.exe | — |
| `WWW_ROOT` | Корневая папка веб-сервера | `C:\inetpub\wwwroot` |
| `CLUSTER_ID` | ID кластера 1С | — |
| `CLUSTER_ADDRESS` | Адрес кластера 1С | `localhost` |
| `CLUSTER_WEB_URL` | URL веб-сервера 1С | `http://192.168.1.104` |
| `CLUSTER_DBMS` | Тип СУБД | `PostgreSQL` |
| `CLUSTER_DB_SERVER` | Сервер БД | `localhost` |
| `CLUSTER_DB_USER` | Пользователь БД | `postgres` |
| `CLUSTER_DB_PASSWORD` | Пароль БД | — |
| `CLUSTER_LOCALE` | Локаль 1С | `ru_RU` |
| `IB_USER_PASS_REQUIRED` | Требовать логин/пароль ИБ | `false` |
| `IB_USER` | Пользователь 1С по умолчанию | `Admin` |
| `IB_PASSWORD` | Пароль 1С по умолчанию | — |
| `PORT` | Порт сервера | `3000` |
| `CORS_ORIGIN` | Разрешённый origin | `http://localhost:5173` |

## 🚀 Запуск

```bash
# Режим разработки (watch mode)
npm run start:dev

# Обычный запуск
npm run start

# Отладка
npm run start:debug

# Продакшен
npm run build
npm run start:prod
```

## 🧪 Тесты

```bash
# Unit-тесты
npm run test

# E2E-тесты
npm run test:e2e

# Покрытие
npm run test:cov
```

## 🌐 API

### Аутентификация

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/auth/register` | Регистрация пользователя (статус: pending) |
| POST | `/api/auth/login` | Вход (получение JWT) |
| GET | `/api/auth/profile` | Получить профиль текущего пользователя |
| PATCH | `/api/auth/change-password` | Изменить пароль |

### Администрирование (требуется роль admin)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/admin/users` | Список всех пользователей |
| GET | `/api/admin/users/:id` | Информация о пользователе |
| POST | `/api/admin/users` | Создать пользователя |
| PATCH | `/api/admin/users/:id` | Обновить пользователя (роль, статус) |
| POST | `/api/admin/users/:id/confirm` | Подтвердить пользователя |
| POST | `/api/admin/users/:id/block` | Заблокировать пользователя |
| DELETE | `/api/admin/users/:id` | Удалить пользователя |

### Базы 1С

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/bases` | Создание базы (пустой) |
| POST | `/api/bases/:id/dt-files` | Загрузить файл .dt с комментарием |
| GET | `/api/bases` | Список всех баз пользователя |
| GET | `/api/bases/:id` | Информация о базе |
| GET | `/api/bases/:id/status` | Статус базы |
| PATCH | `/api/bases/:id` | Обновление базы (описание) |
| DELETE | `/api/bases/:id` | Удаление базы (помечает на удаление) |
| POST | `/api/bases/:id/publish` | Опубликовать базу на веб-сервере |

### Файлы выгрузки (.dt)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/bases/:baseId/dt-files` | Список файлов .dt с комментариями |
| GET | `/api/bases/:baseId/dt-files/:id` | Информация о файле |
| DELETE | `/api/bases/:baseId/dt-files/:id` | Удаление файла |
| POST | `/api/bases/:baseId/dt-files/:id/apply` | Применение файла .dt |
| PATCH | `/api/bases/:baseId/dt-files/:id` | Обновление комментария к файлу |

### Примеры запросов

**Регистрация:**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Вход:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

# Ответ: { "access_token": "eyJhbG..." }
```

**Создание базы:**
```bash
POST /api/bases
Authorization: Bearer <token>
Content-Type: multipart/form-data

name: "Моя база"
serverPath: "srv1c"
adminUser: "admin"
adminPass: "12345"
dtFile: <файл .dt>
```

## 📊 Модель данных

### Users (пользователи)
- `id` — уникальный идентификатор
- `email` — email (unique)
- `password` — хешированный пароль
- `role` — роль (`admin`, `user`)
- `status` — статус (`pending`, `active`, `blocked`)
- `confirmedAt` — дата подтверждения
- `confirmedBy` — ID администратора, подтвердившего пользователя

### Base1C (базы 1С)
- `id` — уникальный идентификатор
- `name` — имя базы
- `server_path` — путь к серверу 1С
- `admin_user` — пользователь 1С
- `admin_pass` — пароль 1С
- `status` — статус (`ready`, `processing`, `error`)
- `last_log` — лог последней операции
- `owner_id` — владелец (FK → users)
- `description` — описание базы
- `isEmpty` — флаг пустой базы (true если нет .dt)
- `isDeleted` — флаг удаления (true если помечена на удаление)
- `isPublished` — флаг публикации (true если опубликована на веб-сервере)
- `cluster_guid` — GUID базы в кластере 1С

### DtFile (файлы выгрузки)
- `id` — уникальный идентификатор
- `filename` — имя файла
- `original_name` — оригинальное имя
- `file_path` — полный путь на диске
- `file_size` — размер в байтах
- `base_id` — база (FK → base1c)
- `created_at` — дата загрузки
- `last_applied_at` — дата последнего применения
- `applied` — флаг текущего файла
- `comment` — комментарий пользователя

## 🔄 Workflow

### Регистрация и подтверждение
1. Пользователь регистрируется → создается пользователь со статусом `pending`
2. Пользователь входит → получает JWT, но не может работать с базами
3. Администратор подтверждает пользователя через `/api/admin/users/:id/confirm`
4. Пользователь получает статус `active` и может создавать базы

### Работа с базами 1С

#### Создание базы:
1. Пользователь создаёт базу через POST `/api/bases` (только название и описание)
2. Сервис создаёт пустую базу в кластере 1С через rac.exe
3. База получает статус `ready` и флаг `isEmpty=true`

#### Загрузка .dt:
1. Пользователь загружает .dt файл через POST `/api/bases/:id/dt-files`
2. Сервис сохраняет файл и восстанавливает базу через ibcmd.exe
3. Флаг `isEmpty` устанавливается в `false`

#### Публикация на веб-сервер:
1. Пользователь нажимает "Опубликовать" → POST `/api/bases/:id/publish`
2. Сервис выполняет webinst.exe -publish -iis
3. Устанавливается флаг `isPublished=true`
4. База доступна по URL `http://<CLUSTER_WEB_URL>/<base_name>`

#### Удаление базы:
1. Пользователь нажимает "Удалить" → DELETE `/api/bases/:id`
2. Сервис помечает базу `isDeleted=true`
3. Планировщик каждую минуту проверяет базу в кластере
4. Если база удалена из кластера → удаляется из БД и файлов

## 🔐 Безопасность

- Пароли хешируются через **bcrypt**
- JWT токены с сроком действия **24 часа**
- Все endpoints кроме `/auth/register` и `/auth/login` защищены **JwtAuthGuard**
- Endpoints кроме auth защищены **UserStatusGuard** (проверка статуса)
- Admin endpoints защищены **RolesGuard** (требуется роль `admin`)
- Валидация входных данных через **class-validator**
- CORS настроен на конкретный origin

## 📝 Примечания

- **Суперадмин** создается автоматически при первом запуске:
  - Email: `alex.galitsky.kd@gmail.com`
  - Пароль: `hflj!e7SAd6ghd552asd`
- Логи операций 1С сохраняются в папку `logs/`
- Файлы `.dt` хранятся в `dt-files/`
- В продакшене `synchronize: false` (схема БД не создаётся автоматически)
- Для работы требуется установленная **1С:Предприятие** (пути в `RAC_PATH`, `IB_CMD_PATH`, `WEBINST_PATH`)
- Пользователи со статусом `pending` не могут создавать базы
- Пользователи со статусом `blocked` не могут входить в систему
- Базы помеченные на удаление (`isDeleted=true`) отображаются полупрозрачными
- Планировщик использует `@nestjs/schedule` для проверки удаленных баз

## 📄 Лицензия

MIT
