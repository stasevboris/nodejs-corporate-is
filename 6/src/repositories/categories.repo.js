import { getDatabase } from '../db/connection.js';

export class CategoriesRepository {
  constructor(db = null) {
    this.db = db || getDatabase();
  }

  findAll() {
    return this.db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  }

  create(name, description = '') {
    const stmt = this.db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
    const result = stmt.run(name, description);
    return this.findById(Number(result.lastInsertRowid));
  }
}
