import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  dbPath: process.env.DB_PATH 
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.resolve(__dirname, '../../data/warehouse.sqlite'),
  isTest: process.env.NODE_ENV === 'test'
};
