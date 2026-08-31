#!/bin/bash
# ============================================================
# Script: set-odoo-test.sh
# Propósito: Configurar credenciales Odoo TEST de forma segura
# Seguridad: Los valores NUNCA salen de tu máquina local
# Uso: bash scripts/set-odoo-test.sh
# ============================================================

set -e

ENV_FILE="frontend/.env.local"
BACKUP_FILE="frontend/.env.local.backup"

echo "╔══════════════════════════════════════════════════════╗"
echo "║   Configuración Odoo TEST - Melosmile               ║"
echo "║   🔒 Tus credenciales se escriben localmente        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Verificar que existe el archivo .env.local
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: No se encontró $ENV_FILE"
    exit 1
fi

# Backup del archivo actual
echo "📦 Creando backup en $BACKUP_FILE..."
cp "$ENV_FILE" "$BACKUP_FILE"

echo ""
echo "📝 Ingresa las credenciales de prueba de Odoo:"
echo "   (Presiona Enter sin valor para mantener el actual)"
echo ""

# Leer valores con opción de mantener el actual
read -p "ODOO_URL (ej: https://mi-odoo-test.com): " odoo_url
read -p "ODOO_DB (ej: mi_base_test): " odoo_db
read -p "ODOO_USER (ej: test@correo.com): " odoo_user
read -p "ODOO_API_KEY (obtener en Odoo → Configuración → Usuarios → API Keys): " odoo_api_key
read -s -p "ODOO_PASSWORD: " odoo_password
echo ""

# Función para reemplazar variable si se proporcionó un valor
replace_var() {
    local var_name=$1
    local var_value=$2
    
    if [ -n "$var_value" ]; then
        # Escapar caracteres especiales para sed
        local escaped_value=$(printf '%s\n' "$var_value" | sed 's/[&/\]/\\&/g')
        sed -i '' "s|^${var_name}=.*|${var_name}=${escaped_value}|" "$ENV_FILE"
        echo "   ✅ $var_name actualizado"
    else
        echo "   ⏭️  $var_name mantenido (sin cambios)"
    fi
}

echo ""
echo "🔄 Actualizando credenciales..."

replace_var "ODOO_URL" "$odoo_url"
replace_var "ODOO_DB" "$odoo_db"
replace_var "ODOO_USER" "$odoo_user"
replace_var "ODOO_API_KEY" "$odoo_api_key"
replace_var "ODOO_PASSWORD" "$odoo_password"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ✅ Credenciales Odoo TEST configuradas            ║"
echo "║                                                      ║"
echo "║   🔄 Para aplicar cambios:                           ║"
echo "║      Reinicia el servidor: npm run dev               ║"
echo "║                                                      ║"
echo "║   🔙 Para volver a producción:                       ║"
echo "║      cp frontend/.env.local.backup frontend/.env.local║"
echo "╚══════════════════════════════════════════════════════╝"
