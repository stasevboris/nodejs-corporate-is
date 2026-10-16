# Лабораторная работа №2: Разработка CLI-утилит и автоматизация процессов в операционной системе

## Описание
Консольная утилита `sysops`, разработанная на базе стандартных библиотек Node.js (`node:util.parseArgs`, `node:child_process`, `node:os`, `node:fs`).

## Возможности
1. `sysops info` — системные метрики ОС, CPU, оперативной памяти и аптайма.
2. `sysops exec --cmd "<команда>" [--timeout <мс>]` — запуск внешних процессов с потоковым логированием stdout/stderr и эскалацией таймаутов (SIGTERM -> SIGKILL).
3. `sysops clean <каталог> [--dry-run] [--force]` — контролируемая очистка временных файлов с симуляцией и интерактивным подтверждением.
4. `sysops run-pipeline <config.json> [--mode series|parallel]` — конвейерный запуск задач в последовательном или параллельном режимах.

## Запуск
- Тесты: `npm test`
- Запуск справки: `node bin/sysops.js --help`
- Запуск конвейера: `node bin/sysops.js run-pipeline pipeline.example.json`
