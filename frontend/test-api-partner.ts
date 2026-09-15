import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  try {
    const res = await fetch("http://localhost:3028/api/odoo/partner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: "cff20455-456e-4eb5-9385-b32b65e97d6b",
        full_name: "Munir Manuel Callaos Cardama",
        phone: "+34 690 15 42 68",
        nif_cif: "43475592A",
        billing_address: "C. de Berna 2",
        billing_address_2: "Piso 4 Puerta B",
        billing_city: "Arganda del Rey",
        billing_postal_code: "28500",
        billing_province: "Madrid",
        billing_country: "España",
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch(e) {
    console.error("Fetch failed:", e);
  }
}
run();
