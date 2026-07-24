require("dotenv").config({ path: "./.env.local" });
const { Client } = require("pg");

const client = new Client({
  host: "aws-0-eu-west-3.pooler.supabase.com",
  port: 6543,
  user: "postgres.amhfdzfcmpastmlsosou",
  password: process.env.SUPABASE_DB_PASSWORD || "Mum@sly1983!",
  database: "postgres",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log("Connected to Supabase Postgres!");
  
  const sql = `
    CREATE TABLE IF NOT EXISTS public.agent_learnings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category VARCHAR(50) NOT NULL DEFAULT 'vocabulary',
      expression TEXT NOT NULL,
      meaning TEXT NOT NULL,
      notes TEXT,
      usage_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_agent_learnings_category ON public.agent_learnings(category);
    CREATE INDEX IF NOT EXISTS idx_agent_learnings_expression ON public.agent_learnings(expression);
  `;
  
  await client.query(sql);
  console.log("✅ Table public.agent_learnings created successfully!");

  const seedSql = `
    INSERT INTO public.agent_learnings (category, expression, meaning, notes)
    VALUES 
      ('vocabulary', 'agenda de la semana', 'Consultar citas con date_range=this_week', 'Modismo recurrente de la Dra.'),
      ('vocabulary', 'agenda de hoy', 'Consultar citas con date_range=today', 'Modismo del día'),
      ('vocabulary', 'hueco por la tarde', 'Filtrar citas o disponibilidad a partir de las 16:00', 'Preferencia horaria clínica')
    ON CONFLICT DO NOTHING;
  `;
  await client.query(seedSql);
  console.log("✅ Seeded default learned vocabulary!");
  
  const res = await client.query("SELECT count(*) FROM public.agent_learnings;");
  console.log("Total records in agent_learnings:", res.rows[0].count);
  
  await client.end();
}

run().catch(console.error);
