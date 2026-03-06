# Cloud-1S Server

Backend-сервис на NestJS для управления облачными базами 1С.

## 📋 Описание

Сервис предоставляет REST API для:
- Регистрации и аутентификации пользователей
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
│   │   └── strategies/
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
| POST | `/api/auth/register` | Регистрация пользователя |
| POST | `/api/auth/login` | Вход (получение JWT) |

### Базы 1С

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/bases` | Создание базы (+ загрузка .dt) |
| GET | `/api/bases` | Список всех баз пользователя |
| GET | `/api/bases/:id` | Информация о базе |
| GET | `/api/bases/:id/status` | Статус базы |
| PATCH | `/api/bases/:id` | Обновление базы (+ загрузка .dt) |
| DELETE | `/api/bases/:id` | Удаление базы |

### Файлы выгрузки (.dt)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/bases/:baseId/dt-files` | Список файлов .dt |
| GET | `/api/bases/:baseId/dt-files/:id` | Информация о файле |
| DELETE | `/api/bases/:baseId/dt-files/:id` | Удаление файла |
| POST | `/api/bases/:baseId/dt-files/:id/apply` | Применение файла .dt |

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

### Base1C (базы 1С)
- `id` — уникальный идентификатор
- `name` — имя базы
- `server_path` — путь к серверу 1С
- `admin_user` — пользователь 1С
- `admin_pass` — пароль 1С
- `status` — статус (`ready`, `processing`, `error`)
- `last_log` — лог последней операции
- `owner_id` — владелец (FK → users)

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

## 🔄 Workflow

1. Пользователь регистрируется/входит → получает JWT
2. Создаёт базу 1С через POST `/api/bases` с параметрами и опционально .dt файлом
3. Сервис создаёт запись в БД со статусом `processing`
4. При наличии файла запускается восстановление через команду:
   ```
   1cv8.exe CONFIG /S"<server>" /N"<user>" /P"<pass>" /RestoreIB "<dt>" /Out "<log>" /UC "<code>"
   ```
5. После завершения обновляется статус (`ready`/`error`) и лог
6. Пользователь может загрузить новые .dt файлы и применить их

## 🔐 Безопасность

- Пароли хешируются через **bcrypt**
- JWT токены с сроком действия **24 часа**
- Все endpoints кроме `/auth/register` и `/auth/login` защищены **JwtAuthGuard**
- Валидация входных данных через **class-validator**
- CORS настроен на конкретный origin

## 📝 Примечания

- Логи операций 1С сохраняются в папку `logs/`
- Файлы `.dt` хранятся в `dt-files/`
- В продакшене `synchronize: false` (схема БД не создаётся автоматически)
- Для работы требуется установленная **1С:Предприятие** (путь в `ONEC_PATH`)

## 📄 Лицензия

MIT
