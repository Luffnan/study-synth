import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../data/notes.json');
const DATA_DIR = join(__dirname, '../data');

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    import('fs').then(({ mkdirSync }) => mkdirSync(DATA_DIR, { recursive: true }));
  }
}

function read() {
  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function write(records) {
  ensureDir();
  writeFileSync(DB_PATH, JSON.stringify(records, null, 2));
}

export function saveNote(notes, fileNames) {
  const records = read();
  const record = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    fileNames,
    notes,
  };
  records.unshift(record);
  write(records);
  return record;
}

export function getAllNotes() {
  return read();
}

export function getNoteById(id) {
  return read().find(r => r.id === id) || null;
}

export function deleteNote(id) {
  const records = read().filter(r => r.id !== id);
  write(records);
}
