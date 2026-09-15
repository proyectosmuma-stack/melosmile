import { upsertOdooPartner } from "./src/lib/odoo/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  try {
    const id = await upsertOdooPartner({
      odoo_partner_id: 14,
      full_name: "Munir Mauel Callaos Cardama",
      nif_cif: "43475592A",
    });
    console.log("Success with normal NIF! Updated partner ID:", id);
  } catch (err) {
    console.error("Failed with normal NIF:", err);
  }
}
run();
