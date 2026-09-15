import { odooExecute } from "./src/lib/odoo/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  try {
    const states = await odooExecute('res.country.state', 'search_read', [[['name', 'ilike', 'Madrid']], ['name', 'country_id']]);
    console.log("States:", states);
    
    const countries = await odooExecute('res.country', 'search_read', [[['name', 'ilike', 'Espa']], ['name']]);
    console.log("Countries:", countries);
  } catch (err) {
    console.error("Failed:", err);
  }
}
run();
