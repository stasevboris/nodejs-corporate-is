import { getDatabase } from '../db/connection.js';

export class ProductsRepository {
  constructor(db = null) {
    this.db = db || getDatabase();
  }

  findAll(filters = {}) {
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.categoryId) {
      query += ' AND p.category_id = ?';
      params.push(filters.categoryId);
    }
    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY p.id ASC';
    return this.db.prepare(query).all(...params);
  }

  findById(id) {
    return this.db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);
  }

  findBySku(sku) {
    return this.db.prepare('SELECT * FROM products WHERE sku = ?').get(sku);
  }

  create(productData) {
    const stmt = this.db.prepare(`
      INSERT INTO products (category_id, sku, name, price, stock)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      productData.categoryId,
      productData.sku,
      productData.name,
      productData.price,
      productData.stock || 0
    );
    return this.findById(Number(result.lastInsertRowid));
  }

  updateStock(id, newStock) {
    const stmt = this.db.prepare(`
      UPDATE products
      SET stock = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(newStock, id);
    return this.findById(id);
  }

  delete(id) {
    return this.db.prepare('DELETE FROM products WHERE id = ?').run(id);
  }
}
