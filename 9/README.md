# Лабораторная работа №9: Архитектурное построение и валидация REST-совместимых веб-служб

## Описание
Служба публикации статей и рецензий (PublishHub API), строго следующая стандартам REST (Richardson Maturity Model 2/3).

## Архитектурные стандарты
1. **RFC 7807 (Problem Details):** Единый формат ошибок `application/problem+json` (`type`, `title`, `status`, `detail`, `instance`, `invalidParams`).
2. **Валидация через Zod:** Декларативные схемы параметров запроса (`query`, `params`, `body`).
3. **ETag и Оптимистическая блокировка:**
   - Поддержка условных запросов `If-None-Match` -> `304 Not Modified`.
   - Защита от потерянных обновлений (Lost Update): метод `PUT` требует `If-Match` (`428 Precondition Required`, `412 Precondition Failed`).
4. **HATEOAS и RFC 8288:** Ссылки переходов в теле ответов (`_links`) и стандартный заголовок `Link`.
5. **Идемпотентность и HTTP методы:** Поддержка `GET`, `POST` (`Location` header), `PUT`, `PATCH`, `DELETE` (`204`), `HEAD`, `OPTIONS` (`Allow` header).

## Запуск
- Установка зависимостей: `npm install`
- Запуск сервера: `npm start`
- Запуск тестов: `npm test`
