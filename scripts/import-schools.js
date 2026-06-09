/**
 * Import ACARA school list into Supabase `schools` table.
 *
 * Usage:
 *   node scripts/import-schools.js "path/to/School Profile 2025.xlsx"
 *   node scripts/import-schools.js path/to/schools.csv
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env
 */

import { createClient } from '@supabase/supabase-js';
import { extname } from 'path';
import XLSX from 'xlsx';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Try root .env first, fall back to backend/.env
config({ path: join(__dirname, '../.env') });
config({ path: join(__dirname, '../backend/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/import-schools.js "path/to/School Profile 2025.xlsx"');
  process.exit(1);
}

// ── Parse the file (xlsx or csv) ─────────────────────────────────────────────

function parseFile(filePath) {
  const ext = extname(filePath).toLowerCase();

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath);
    // Skip metadata/dictionary sheets — use the first sheet with >100 rows
    const dataSheetName = workbook.SheetNames.find(n => {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[n], { defval: '' });
      return rows.length > 100;
    }) || workbook.SheetNames[0];
    console.log(`Using sheet: ${dataSheetName}`);
    const sheet = workbook.Sheets[dataSheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }

  if (ext === '.csv') {
    // Use XLSX to parse CSV too — avoids needing csv-parse dependency
    const workbook = XLSX.readFile(filePath, { type: 'file' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

// Find a column value by trying several possible name variants
function pick(row, ...candidates) {
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const c of candidates) {
    const key = Object.keys(row).find(k => norm(k) === norm(c));
    if (key && String(row[key]).trim()) return String(row[key]).trim();
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`Reading ${filePath}…`);
  const rows = parseFile(filePath);
  console.log(`Parsed ${rows.length} rows`);

  // Log first row keys so we can see the column names
  if (rows.length > 0) {
    console.log('Columns found:', Object.keys(rows[0]).join(', '));
  }

  const schools = rows.map(row => ({
    acara_id:    pick(row, 'ACARA SML ID', 'acarasmlid', 'School ID', 'schoolid', 'AISNSW ID'),
    name:        pick(row, 'School Name', 'schoolname', 'Name', 'School'),
    suburb:      pick(row, 'Suburb', 'suburb', 'Town', 'Suburb/Town', 'Location'),
    state:       pick(row, 'State', 'state', 'State Territory'),
    sector:      pick(row, 'Sector', 'sector', 'School Sector', 'Education Sector'),
    school_type: pick(row, 'School Type', 'schooltype', 'Type', 'Level of Schooling'),
  })).filter(s => s.name);

  console.log(`Importing ${schools.length} schools into Supabase…`);

  const BATCH = 500;
  let imported = 0;

  for (let i = 0; i < schools.length; i += BATCH) {
    const batch = schools.slice(i, i + BATCH);
    const { error } = await supabase
      .from('schools')
      .upsert(batch, { onConflict: 'acara_id', ignoreDuplicates: false });

    if (error) {
      console.error('❌  Batch error:', error.message);
      console.error('First row of failed batch:', batch[0]);
      process.exit(1);
    }

    imported += batch.length;
    process.stdout.write(`\r  ${imported}/${schools.length}`);
  }

  console.log(`\n✅  Done — ${imported} schools imported`);
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
