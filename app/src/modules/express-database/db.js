import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../../config/env.js';

let dbInstance = null;

export function getDatabase(customPath = null) {
  if (dbInstance && !customPath) return dbInstance;

  const targetPath = customPath || config.dbPath;
  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (targetPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  // Применяем схему БД (Темы 5-6)
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      change_amount INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Заполняем начальными сидами если пусто
  const count = db.prepare('SELECT count(*) as c FROM categories;').get();
  if (count.c === 0) {
    db.exec(`
      INSERT INTO categories (id, name, description) VALUES
        (1, 'Серверное оборудование', 'Серверы, blade-шасси и rack-стойки'),
        (2, 'Сетевое оборудование', 'Коммутаторы, маршрутизаторы, межсетевые экраны'),
        (3, 'Системы хранения данных', 'SAN/NAS хранилища и NVMe массивы');

      INSERT INTO products (id, category_id, sku, name, price, stock) VALUES
        (1, 1, 'SRV-DL380-G10', 'Сервер HPE ProLiant DL380 Gen10', 4500.00, 15),
        (2, 2, 'NET-CAT9300-48', 'Коммутатор Cisco Catalyst 9300 48-Port', 2800.00, 24),
        (3, 3, 'STR-POWERVAULT-ME5', 'СХД Dell PowerVault ME5024', 8900.00, 8);
    `);
  }

  if (!customPath) dbInstance = db;
  return db;
}
