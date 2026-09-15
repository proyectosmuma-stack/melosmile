import { upsertOdooPartner, odooExecute } from "./src/lib/odoo/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  try {
    const id = await upsertOdooPartner({
      odoo_partner_id: 14,
      full_name: "Munir Mauel Callaos Cardama",
      billing_name: "Munir Mauel Callaos Cardama",
      email: "mcallaos83@gmail.com",
      phone: "+34 690 15 42 68",
      nif_cif: "ES43475592A",
      billing_address: "C. de Berna 2",
      billing_address_2: "Piso 4 Puerta B",
      billing_city: "Arganda del Rey",
      billing_postal_code: "28500",
      billing_province: "Madrid",
      billing_country: "España"
    });
    console.log("Success with ES! Updated partner ID:", id);
  } catch (err) {
    console.error("Failed with ES:", err);
  }
}
run();
