import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase, closeDatabase } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrations.js';
import { runSeeds } from '../src/db/seeds.js';
import { ProductsRepository } from '../src/repositories/products.repo.js';
import { CategoriesRepository } from '../src/repositories/categories.repo.js';
import { InventoryLogsRepository } from '../src/repositories/inventory-logs.repo.js';
import { InventoryService } from '../src/services/inventory.service.js';
import { InsufficientStockError } from '../src/errors/db-error.js';

let db;
let productsRepo;
let categoriesRepo;
let logsRepo;
let inventoryService;

beforeEach(() => {
  db = getDatabase(':memory:');
  runMigrations(db);
  runSeeds(db);
  productsRepo = new ProductsRepository(db);
  categoriesRepo = new CategoriesRepository(db);
  logsRepo = new InventoryLogsRepository(db);
  inventoryService = new InventoryService(db);
});

afterEach(() => {
  if (db) {
    db.close();
  }
});

test('Categories and Products repositories read initial seeded data', () => {
  const cats = categoriesRepo.findAll();
  assert.equal(cats.length, 2);

  const prods = productsRepo.findAll();
  assert.equal(prods.length, 3);
  assert.equal(prods[0].sku, 'SRV-DL380');
  assert.equal(prods[0].stock, 5);
});

test('Products repository supports filtering by category and search', () => {
  const filtered = productsRepo.findAll({ categoryId: 1 });
  assert.equal(filtered.length, 2);

  const searched = productsRepo.findAll({ search: 'Cisco' });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].sku, 'SW-CISCO-2960');
});

test('InventoryService.adjustStock successfully commits transaction', () => {
  const result = inventoryService.adjustStock(1, 3, 'Поступление от поставщика');
  assert.equal(result.success, true);
  assert.equal(result.previousStock, 5);
  assert.equal(result.newStock, 8);

  const updatedProd = productsRepo.findById(1);
  assert.equal(updatedProd.stock, 8);

  const logs = logsRepo.findByProductId(1);
  assert.ok(logs.length >= 2);
  assert.equal(logs[0].change_amount, 3);
});

test('InventoryService.adjustStock rolls back on negative stock error', () => {
  assert.throws(
    () => {
      inventoryService.adjustStock(1, -20, 'Попытка списать больше остатка');
    },
    (err) => {
      return err instanceof InsufficientStockError;
    }
  );

  // Остаток не должен измениться
  const prodAfter = productsRepo.findById(1);
  assert.equal(prodAfter.stock, 5);

  // Лог движения не должен был добавиться
  const logs = logsRepo.findByProductId(1);
  assert.equal(logs.length, 1); // Только начальный сид
});

test('Foreign keys constraint is enforced on DELETE category', () => {
  assert.throws(
    () => {
      // Категория 1 используется в products, ON DELETE RESTRICT выбросит ошибку
      db.prepare('DELETE FROM categories WHERE id = 1').run();
    },
    /FOREIGN KEY constraint failed/
  );
});
