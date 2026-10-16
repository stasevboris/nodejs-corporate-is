import { getDatabase, closeDatabase } from './db/connection.js';
import { runMigrations } from './db/migrations.js';
import { runSeeds } from './db/seeds.js';
import { ProductsRepository } from './repositories/products.repo.js';
import { CategoriesRepository } from './repositories/categories.repo.js';
import { InventoryService } from './services/inventory.service.js';

async function main() {
  console.log('='.repeat(65));
  console.log('Лабораторная работа 6: Персистентный слой SQLite и транзакции');
  console.log('='.repeat(65));

  const db = getDatabase();
  runMigrations(db);
  runSeeds(db);

  const categoriesRepo = new CategoriesRepository(db);
  const productsRepo = new ProductsRepository(db);
  const inventoryService = new InventoryService(db);

  console.log('\n--- Список категорий ---');
  console.table(categoriesRepo.findAll());

  console.log('\n--- Список товаров на складе ---');
  console.table(productsRepo.findAll());

  // 1. Успешная транзакция списания
  console.log('\n[1] Выполнение успешного списания 2 шт со склада (ID 1)...');
  const adjustRes = inventoryService.adjustStock(1, -2, 'Отгрузка клиенту по накладной #105');
  console.log('Результат транзакции:', adjustRes);

  // 2. Демонстрация отката транзакции (ROLLBACK) при нехватке товара
  console.log('\n[2] Попытка списания 100 шт со склада (при остатке 3 шт)...');
  try {
    inventoryService.adjustStock(1, -100, 'Срочный резерв в филиал');
  } catch (err) {
    console.warn(`[ОЖИДАЕМЫЙ СБОЙ И ROLLBACK] Ошибка: ${err.message}`);
  }

  const checkProduct = productsRepo.findById(1);
  console.log(`\nПроверка целостности данных: остаток товара ID 1 остался неизменным: ${checkProduct.stock} шт.`);

  closeDatabase();
  console.log('\n[OK] Демонстрация персистентного слоя успешно завершена.');
}

main().catch(err => {
  console.error('Критическая ошибка:', err);
  closeDatabase();
  process.exit(1);
});
