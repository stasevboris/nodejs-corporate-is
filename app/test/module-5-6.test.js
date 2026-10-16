import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../src/modules/express-database/db.js';
import { InventoryRepo } from '../src/modules/express-database/inventory.repo.js';
import { InventoryService } from '../src/modules/express-database/inventory.service.js';

test('[Модуль 5-6] SQLite база данных: репозиторий товаров и категорий', () => {
  const db = getDatabase(':memory:');
  const repo = new InventoryRepo(db);

  const categories = repo.findAllCategories();
  assert.ok(categories.length >= 3);

  const products = repo.findAllProducts();
  assert.ok(products.length >= 3);
});

test('[Модуль 5-6] Атомарная транзакция изменения остатков товара (COMMIT)', () => {
  const db = getDatabase(':memory:');
  const service = new InventoryService(db);

  const res = service.adjustStock(1, 5, 'Поступление от поставщика');
  assert.equal(res.success, true);
  assert.equal(res.newStock, res.previousStock + 5);
});

test('[Модуль 5-6] Откат транзакции (ROLLBACK) при списании сверх остатка', () => {
  const db = getDatabase(':memory:');
  const service = new InventoryService(db);
  const repo = new InventoryRepo(db);

  const before = repo.findProductById(1);
  assert.throws(() => {
    service.adjustStock(1, -999999, 'Недопустимое списание');
  }, /Недостаточно товара на складе/);

  const after = repo.findProductById(1);
  assert.equal(after.stock, before.stock, 'Остаток не должен измениться при ошибке');
});
