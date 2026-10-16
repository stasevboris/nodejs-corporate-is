export class InventoryRepo {
  constructor(db) {
    this.db = db;
  }

  findAllProducts(search = '', categoryId = null) {
    let q = `
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (categoryId) {
      q += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    if (search) {
      q += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    q += ' ORDER BY p.id ASC';
    return this.db.prepare(q).all(...params);
  }

  findProductById(id) {
    return this.db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);
  }

  findAllCategories() {
    return this.db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
  }

  getRecentLogs(limit = 20) {
    return this.db.prepare(`
      SELECT l.*, p.name as product_name, p.sku
      FROM inventory_logs l
      JOIN products p ON l.product_id = p.id
      ORDER BY l.id DESC
      LIMIT ?
    `).all(limit);
  }
}
