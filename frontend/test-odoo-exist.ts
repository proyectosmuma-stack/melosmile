import { odooExecute } from "./src/lib/odoo/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  try {
    const data = await odooExecute('res.partner', 'search_read', [[['id', '=', 14]], ['name']]);
    console.log("ID 14 in Odoo:", data);
  } catch (err) {
    console.error("Failed:", err);
  }
}
run();
