const { Pool } = require('pg');
const crypto = require('crypto');

const local = !process.env.DATABASE_URL || /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: local ? false : { rejectUnauthorized: false }
});

const q = (text, params) => pool.query(text, params);
let dbReady = false;
const isDbReady = () => dbReady;

// Pullar butun son (so'm) sifatida saqlanadi — float ishlatilmaydi.
async function getSettings() {
  const { rows } = await q('SELECT * FROM app_settings WHERE id = 1');
  return rows[0];
}

async function initDb() {
  await q(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INT PRIMARY KEY,
      shop_name TEXT NOT NULL DEFAULT 'Shirinliklar savdo markazi',
      shop_phone TEXT NOT NULL DEFAULT '',
      shop_address TEXT NOT NULL DEFAULT '',
      receipt_header TEXT NOT NULL DEFAULT 'SHIRINLIK',
      receipt_footer TEXT NOT NULL DEFAULT '',
      usd_rate BIGINT NOT NULL DEFAULT 0,
      pay_cash BOOLEAN NOT NULL DEFAULT true,
      pay_card BOOLEAN NOT NULL DEFAULT true,
      pay_click BOOLEAN NOT NULL DEFAULT true,
      pay_payme BOOLEAN NOT NULL DEFAULT true,
      pay_transfer BOOLEAN NOT NULL DEFAULT false,
      pay_tg BOOLEAN NOT NULL DEFAULT false,
      discount_max_percent INT NOT NULL DEFAULT 10,
      discount_max_uzs BIGINT NOT NULL DEFAULT 0,
      work_open TEXT NOT NULL DEFAULT '09:00',
      work_close TEXT NOT NULL DEFAULT '21:00',
      report_hour INT NOT NULL DEFAULT 9,
      report_email TEXT NOT NULL DEFAULT '',
      admin_chat_id TEXT NOT NULL DEFAULT '',
      group_chat_id TEXT NOT NULL DEFAULT '',
      warehouse_sees_cost BOOLEAN NOT NULL DEFAULT false,
      branch_id INT NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL CHECK (role IN ('admin','warehouse','seller')),
      email TEXT UNIQUE,
      password_hash TEXT,
      email_verified BOOLEAN NOT NULL DEFAULT false,
      email_code TEXT,
      pin_hash TEXT,
      pin_view TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      failed_attempts INT NOT NULL DEFAULT 0,
      locked_until TIMESTAMPTZ,
      branch_id INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      parent_id INT REFERENCES categories(id),
      name TEXT NOT NULL,
      sort INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      branch_id INT NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS goods (
      id SERIAL PRIMARY KEY,
      category_id INT REFERENCES categories(id),
      name TEXT NOT NULL,
      sku TEXT NOT NULL DEFAULT '',
      barcode TEXT UNIQUE,
      unit TEXT NOT NULL DEFAULT 'pcs' CHECK (unit IN ('pcs','kg')),
      price BIGINT NOT NULL DEFAULT 0,
      cost_price BIGINT NOT NULL DEFAULT 0,
      min_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      description TEXT NOT NULL DEFAULT '',
      branch_id INT NOT NULL DEFAULT 1,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id SERIAL PRIMARY KEY,
      product_id INT NOT NULL REFERENCES goods(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      barcode TEXT UNIQUE,
      price BIGINT NOT NULL DEFAULT 0,
      cost_price BIGINT NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'pcs',
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort INT NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id SERIAL PRIMARY KEY,
      product_id INT NOT NULL REFERENCES goods(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      sort INT NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS image_blobs (
      id TEXT PRIMARY KEY,
      data BYTEA NOT NULL,
      mime TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      stir TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      debt_uzs BIGINT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      branch_id INT NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS supplier_invoices (
      id SERIAL PRIMARY KEY,
      supplier_id INT NOT NULL REFERENCES suppliers(id),
      doc_no TEXT NOT NULL DEFAULT '',
      total_uzs BIGINT NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      by_user_id INT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS supplier_payments (
      id SERIAL PRIMARY KEY,
      supplier_id INT NOT NULL REFERENCES suppliers(id),
      amount_uzs BIGINT NOT NULL,
      method TEXT NOT NULL DEFAULT 'naqd',
      note TEXT NOT NULL DEFAULT '',
      by_user_id INT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS stock_lots (
      id SERIAL PRIMARY KEY,
      product_id INT NOT NULL REFERENCES goods(id) ON DELETE CASCADE,
      variant_id INT REFERENCES product_variants(id) ON DELETE CASCADE,
      qty NUMERIC(12,3) NOT NULL DEFAULT 0,
      remaining NUMERIC(12,3) NOT NULL DEFAULT 0,
      cost_price BIGINT NOT NULL DEFAULT 0,
      supplier_id INT REFERENCES suppliers(id),
      invoice_id INT REFERENCES supplier_invoices(id),
      lot_no TEXT NOT NULL DEFAULT '',
      expires_at DATE,
      branch_id INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id BIGSERIAL PRIMARY KEY,
      product_id INT NOT NULL,
      variant_id INT,
      lot_id INT,
      qty NUMERIC(12,3) NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('in','sale','writeoff','inventory','return','order','cancel')),
      ref_type TEXT NOT NULL DEFAULT '',
      ref_id BIGINT,
      by_user_id INT,
      note TEXT NOT NULL DEFAULT '',
      branch_id INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tg_customers (
      id SERIAL PRIMARY KEY,
      tg_id BIGINT UNIQUE NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      username TEXT NOT NULL DEFAULT '',
      branch_id INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      no BIGSERIAL,
      customer_id INT REFERENCES tg_customers(id),
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','accepted','preparing','ready','given','cancelled')),
      pickup_date TEXT NOT NULL DEFAULT '',
      pickup_time TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      payment_method TEXT NOT NULL DEFAULT 'cash',
      total_uzs BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      status_updated_at TIMESTAMPTZ,
      branch_id INT NOT NULL DEFAULT 1
    );
    CREATE SEQUENCE IF NOT EXISTS orders_no_seq OWNED BY orders.no;
    ALTER TABLE orders ALTER COLUMN no SET DEFAULT nextval('orders_no_seq');

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INT REFERENCES goods(id),
      variant_id INT REFERENCES product_variants(id),
      name TEXT NOT NULL,
      qty NUMERIC(12,3) NOT NULL DEFAULT 1,
      price_uzs BIGINT NOT NULL,
      line_total_uzs BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('order','sale')),
      ref_id BIGINT NOT NULL,
      method TEXT NOT NULL,
      amount_uzs BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','failed')),
      ext_id TEXT NOT NULL DEFAULT '',
      idem_key TEXT UNIQUE,
      raw JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id),
      opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      closed_at TIMESTAMPTZ,
      opening_cash BIGINT NOT NULL DEFAULT 0,
      expected_cash BIGINT,
      counted_cash BIGINT,
      diff_uzs BIGINT,
      diff_note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
      branch_id INT NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS pos_sales (
      id SERIAL PRIMARY KEY,
      uuid TEXT UNIQUE NOT NULL,
      receipt_no BIGSERIAL,
      shift_id INT REFERENCES shifts(id),
      user_id INT REFERENCES users(id),
      customer_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      subtotal_uzs BIGINT NOT NULL DEFAULT 0,
      discount_uzs BIGINT NOT NULL DEFAULT 0,
      total_uzs BIGINT NOT NULL DEFAULT 0,
      payment JSONB NOT NULL DEFAULT '[]',
      is_return BOOLEAN NOT NULL DEFAULT false,
      return_of INT,
      offline_synced BOOLEAN NOT NULL DEFAULT false,
      branch_id INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE pos_sales ALTER COLUMN receipt_no SET DEFAULT nextval('pos_sales_receipt_no_seq');

    CREATE TABLE IF NOT EXISTS pos_sale_items (
      id SERIAL PRIMARY KEY,
      sale_id INT NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
      product_id INT REFERENCES goods(id),
      variant_id INT REFERENCES product_variants(id),
      name TEXT NOT NULL,
      qty NUMERIC(12,3) NOT NULL DEFAULT 1,
      price_uzs BIGINT NOT NULL,
      line_total_uzs BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id BIGSERIAL PRIMARY KEY,
      user_id INT,
      user_name TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      entity TEXT NOT NULL DEFAULT '',
      entity_id BIGINT,
      old_data JSONB,
      new_data JSONB,
      ip TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS lots_prod_idx ON stock_lots (product_id, expires_at);
    CREATE INDEX IF NOT EXISTS movements_prod_idx ON stock_movements (product_id, created_at);
    CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status, created_at);
    CREATE INDEX IF NOT EXISTS sales_shift_idx ON pos_sales (shift_id);
  `);
  await q('INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
  dbReady = true;
}

// Audit yozuvi — muhim operatsiyalar uchun (xato bo'lsa jarayonni to'xtatmaydi)
async function audit(userId, userName, action, entity, entityId, oldData, newData, ip) {
  try {
    await q(`INSERT INTO audit_log (user_id, user_name, action, entity, entity_id, old_data, new_data, ip)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [userId || null, userName || '', action, entity || '', entityId || null,
       oldData ? JSON.stringify(oldData) : null, newData ? JSON.stringify(newData) : null, ip || '']);
  } catch (e) { console.error('audit:', e.message); }
}

module.exports = { pool, q, getSettings, initDb, isDbReady, audit };
