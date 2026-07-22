# Documentation — Módulo de Configuración, Tratamientos y Rentabilidad

## 📌 Visión General
El **Módulo de Configuración** de Melosmile centraliza la administración de Sedes (Clínicas), Profesionales y el Catálogo de Tratamientos por Familias. Está diseñado a medida para la **Dra. Osly Melo**, concentrando las reglas financieras y de comisiones en las clínicas y sedes donde ejerce.

---

## 🏗️ Arquitectura de Base de Datos (Migración 005)

### Tablas Principales
- **`clinics`**: Sedes de la clínica (Goya, Las Rozas, RyA). Almacena dirección, teléfono, email, color identificador hex, `base_commission_pct` (porcentaje base por defecto) y `odoo_pricelist_id` (tarifa asociada en Odoo).
- **`professionals`**: Doctoras y colaboradores del equipo. Se asocian a las sedes sin asignarles porcentaje individual (ya que el porcentaje es una regla de la sede).
- **`treatment_families`**: Categorías de tratamientos (Ortodoncia, Implantología, Endodoncia, Periodoncia, Odontología General, Estética, Prostodoncia, Aparatología, Odontopediatría, Radiología).
- **`treatments`**: Catálogo de 50+ procedimientos dentales. Contiene `service_name`, `abbreviation`, `default_price`, `typical_lab_cost`, `family_id`, `odoo_product_id` y `odoo_product_tmpl_id`.
- **`treatment_clinic_prices`**: Precios específicos de cada tratamiento por clínica (`treatment_id`, `clinic_id`, `price`, `odoo_pricelist_item_id`).
- **`clinic_commission_rules`**: Reglas específicas por sede y familia de tratamiento (`commission_pct` y `lab_discount_pct`).
- **`billing_records`**: Registro contable por cita. Incluye `actual_lab_cost` (coste real de laboratorio) y `profitability_status` (`ok` | `warning` | `loss`).

---

## 🧭 Estructura de Rutas y Navegación

| Ruta | Descripción |
|---|---|
| `/settings` | Hub principal de configuración con cards explicativas |
| `/settings/clinics` | CRUD de sedes y panel expandible de reglas de comisión por familia |
| `/settings/professionals` | Directorio de profesionales con botón "Ver Ficha" |
| `/settings/professionals/[id]` | Ficha del profesional estilo Notion con KPIs, historial de citas y notas |
| `/settings/treatments` | Catálogo agrupado por familias con buscador e historial de costes típicos |
| `/api/ai-context` | Endpoint JSON para el agente IA n8n con el modelo financiero completo |

---

## 💡 Lógica de Negocio y Reglas Financieras

1. **Reglas de Porcentaje centradas en la Sede**:
   - Los porcentajes de comisión y descuentos de laboratorio se configuran **a nivel de Clínica/Sede** y por **Familia de Tratamiento**.
   - Si no existe una regla específica para una familia en una clínica, se utiliza la comisión base de la clínica (`clinics.base_commission_pct`).

2. **Cálculo de Rentabilidad por Cita (`/appointments/[id]`)**:
   - `Neto Calculado = (Precio × % Comisión) - (Gasto Lab Real × % Descuento Lab)`
   - **Indicadores de Alerta en Tiempo Real**:
     - 🔴 `⚠️ TRATAMIENTO EN PÉRDIDA` (si el Neto Calculado < 0€).
     - 🟡 `⚠️ MARGEN BAJO` (si el margen sobre precio es < 15%).
     - 🟢 `Rentable — Margen XX%` (en operaciones normales).

3. **Modales de Confirmación Custom**:
   - Reemplazados todos los `confirm()` nativos del navegador por componentes `<Dialog>` personalizados de React para garantizar estabilidad de foco y evitar cierres accidentales al eliminar clínicas, profesionales o tratamientos.

---

## 🤖 API para Agentes de Inteligencia Artificial (`/api/ai-context`)
Expone la información requerida por los workflows de n8n para:
- Responder consultas sobre precios por sede y tratamiento.
- Elaborar presupuestos informados en lenguaje natural.
- Verificar reglas de rentabilidad y comisiones en informes contables.

---

## 📌 Roadmap Futuro
- **Historial de Precios por Proveedor de Laboratorio**:
  - Tablas `lab_providers` y `lab_cost_history` para seguimiento de precios reales cobrados por cada laboratorio dental.
  - Estadísticas de rendimiento económico por laboratorio.
