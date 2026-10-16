#!/bin/bash
set -e

echo "================================================================="
echo "КОМПЛЕКСНАЯ ПРОВЕРКА ВСЕХ 10 ЛАБОРАТОРНЫХ РАБОТ"
echo "================================================================="

ROOT_DIR="/sessions/compassionate-sleepy-carson/mnt/stefan"
PASSED_COUNT=0
TOTAL_LABS=10

for i in $(seq 1 $TOTAL_LABS); do
  echo ""
  echo ">>> [ЛАБОРАТОРНАЯ РАБОТА $i] Запуск тестов в $ROOT_DIR/$i ..."
  cd "$ROOT_DIR/$i"
  if npm test; then
    echo ">>> [ЛАБОРАТОРНАЯ РАБОТА $i] ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО [OK]"
    PASSED_COUNT=$((PASSED_COUNT + 1))
  else
    echo ">>> [ЛАБОРАТОРНАЯ РАБОТА $i] ОШИБКА В ТЕСТАХ [FAIL]"
    exit 1
  fi
done

echo ""
echo "================================================================="
echo "ИТОГ ПРОВЕРКИ: $PASSED_COUNT из $TOTAL_LABS лабораторных работ УСПЕШНО пройдены!"
echo "================================================================="
