import { odooExecute } from "./src/lib/odoo/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  try {
    const countries = await odooExecute('res.country', 'search_read', [
      [['name', 'ilike', 'España']],
      ['id']
    ]);
    console.log("Countries:", countries);
  } catch (err) {
    console.error("Failed:", err);
  }
}
run();
