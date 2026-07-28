# Reglas del Proyecto MeloSmile

## Diccionario de Tratamiento y Abreviaturas de Clínica (Albi / Albacete)
- **RC** o **R.C.** → **Reconstrucción Simple**
- **Rev** o **Rev.** → **Control**
- **Notas y Observaciones Clínicas**: Indicaciones no facturables (ej: *Ataches / Poner ataches*, *Quitar Brackets*, *Poner Brackets Superior*, *Hará un poco de IPR*, *Coloc Myobrace*, etc.) deben registrarse estrictamente como una **nota / observación** dentro del campo `notes` (Evolución Clínica & Observaciones del Doctor) de la cita de Control (o Revisión) correspondiente, y **NO** como un procedimiento facturable separado.

## Reglas de Agrupamiento de Citas
- **Misma Hora y Paciente**: Si un mismo paciente tiene varios tratamientos o renglones anotados a la misma hora (ej: 09:30 Lucas cementar 60€ y 09:30 Lucas líneas 50€), deben unificarse en **una sola cita** a esa hora.
- Los tratamientos se agregan en un array/lista de tratamientos `["cementar", "líneas"]` y el precio total se suma (ej: `price_eur: 110`).

## Reglas de Precios e Identificación de Pacientes
- **Precios Escritos**: Si en el papel/documento aparece reflejado un precio numérico en euros (ej: 60€, 100€, 125€), se debe usar **estrictamente ese monto** (prevalece sobre los precios por defecto del catálogo).
- **Resolución de Paciente por Nombre**: Si sólo se dispone del nombre de pila del paciente (sin apellido), el sistema debe buscar en la base de datos de la clínica:
  1. **Si existe 1 solo paciente** con ese nombre de pila (ej: "Lucas Callaos"), la cita se asocia directamente a ese paciente.
  2. **Si existen varios pacientes** con el mismo nombre de pila (ej: "Lucas Pérez" y "Lucas Callaos"), la cita SE CREA igualmente, pero se marca con estado/nota de **Pendiente de Revisión** para que el usuario pueda seleccionar manualmente el paciente correcto.
  3. **Si no existe ningún paciente** con ese nombre de pila, se crea la ficha inicial del paciente.
