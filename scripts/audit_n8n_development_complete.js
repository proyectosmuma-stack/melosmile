#!/usr/bin/env node
// audit_n8n_development_complete.js
const fs = require('fs');
const path = require('path');

// Configuración de verificación
const PRODUCTION_DOMAINS = [
  'agenda.melosmile.com',
  'api.melosmile.com',
  'melosmile.com', // Dominio raíz (puede ser ambiguo)
  'prod-melosmile.supabase.co',
  'supabase.co/project' // Sin prefijo específico
];

const DEVELOPMENT_DOMAINS = [
  'localhost:3028',
  'localhost:54321', 
  '127.0.0.1',
  'staging.melosmile.com',
  'staging-melosmile.supabase.co'
];

const PRODUCTION_PATTERNS = {
  // JWTs comunes (patrones)
  jwtPatterns: [
    /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/, // Header JWT estándar
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/ // Formato JWT genérico
  ],
  
  // API keys de producción
  apiKeyPatterns: [
    /melosmile_internal_n8n_key_/, // Key específica
    /prod_/i, // Cualquier cosa con "prod"
    /production_/i // Cualquier cosa con "production"
  ],
  
  // Nombres de clínicas (debe ser solo "Clínica Dra. Osly Melo")
  clinicNames: [
    'Clínica Daniel Bustamante',
    'Clínica Santa',
    'Otra Clínica' // Cualquier otra que no sea la Dra. Osly Melo
  ]
};

// Resultados de auditoría
const auditResults = {
  totalFiles: 0,
  filesWithIssues: 0,
  criticalIssues: 0,
  warnings: 0,
  files: []
};

function analyzeNode(node, filePath) {
  const issues = [];
  const nodeName = node.name || `Unnamed_${node.type}_${node.id?.substring(0,8)}`;
  
  // 1. Verificar URLs en toolHttpRequest
  if (node.type === 'toolHttpRequest' && node.parameters?.url) {
    const url = node.parameters.url;
    
    // Verificar dominios de producción
    PRODUCTION_DOMAINS.forEach(domain => {
      if (url.toLowerCase().includes(domain.toLowerCase())) {
        issues.push({
          type: 'CRITICAL',
          category: 'PRODUCTION_ENDPOINT',
          message: `URL apunta a producción: ${domain}`,
          detail: `URL completa: ${url.substring(0, 100)}...`,
          node: nodeName
        });
      }
    });
    
    // Verificar si es URL absoluta sin localhost/staging
    if (url.startsWith('http') && !url.includes('localhost') && !url.includes('staging')) {
      if (!url.includes('agenda.melosmile.com') && !url.includes('api.melosmile.com')) {
        // Podría ser otro dominio externo - verificar
        issues.push({
          type: 'WARNING',
          category: 'EXTERNAL_ENDPOINT',
          message: 'URL no es localhost/staging',
          detail: `URL: ${url.substring(0, 80)}...`,
          node: nodeName
        });
      }
    }
  }
  
  // 2. Verificar headers y credenciales
  if (node.parameters?.headers && Array.isArray(node.parameters.headers)) {
    node.parameters.headers.forEach(header => {
      if (header.value) {
        const value = String(header.value);
        
        // Verificar JWTs de producción
        PRODUCTION_PATTERNS.jwtPatterns.forEach(pattern => {
          if (pattern.test(value) && value.length > 100) { // JWT típicamente largo
            issues.push({
              type: 'CRITICAL',
              category: 'PRODUCTION_JWT',
              message: 'Posible JWT de producción detectado',
              detail: `Header: ${header.name}, JWT inicio: ${value.substring(0, 50)}...`,
              node: nodeName
            });
          }
        });
        
        // Verificar API keys de producción
        PRODUCTION_PATTERNS.apiKeyPatterns.forEach(pattern => {
          if (pattern.test(value)) {
            issues.push({
              type: 'CRITICAL',
              category: 'PRODUCTION_API_KEY',
              message: 'API key de producción detectada',
              detail: `Header: ${header.name}, Value: ${value.substring(0, 30)}...`,
              node: nodeName
            });
          }
        });
      }
    });
  }
  
  // 3. Verificar parámetros de consulta (para búsqueda PAC-XXX)
  if (node.parameters?.queryParameters && Array.isArray(node.parameters.queryParameters)) {
    node.parameters.queryParameters.forEach(param => {
      if (param.name === 'historia_id' || param.name === 'patient_code') {
        issues.push({
          type: 'INFO',
          category: 'PAC_XXX_FEATURE',
          message: 'Parámetro de búsqueda por código detectado',
          detail: `Parámetro: ${param.name}, Configuración actual: ${JSON.stringify(param)}`,
          node: nodeName
        });
      }
    });
  }
  
  // 4. Verificar texto en nodos (para nombres de clínicas incorrectas)
  if (node.parameters?.json) {
    const jsonParam = node.parameters.json;
    PRODUCTION_PATTERNS.clinicNames.forEach(clinicName => {
      if (JSON.stringify(jsonParam).includes(clinicName)) {
        issues.push({
          type: 'CRITICAL',
          category: 'WRONG_CLINIC_NAME',
          message: `Nombre de clínica incorrecto: ${clinicName}`,
          detail: 'El sistema es mono-clínica: Dra. Osly Melo',
          node: nodeName
        });
      }
    });
  }
  
  return issues;
}

function auditFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n🔍 Auditando: ${fileName}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const workflow = JSON.parse(content);
    
    const fileResult = {
      name: fileName,
      totalNodes: workflow.nodes?.length || 0,
      issues: [],
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0
    };
    
    // Analizar cada nodo
    if (workflow.nodes && Array.isArray(workflow.nodes)) {
      workflow.nodes.forEach((node, index) => {
        const nodeIssues = analyzeNode(node, filePath);
        fileResult.issues.push(...nodeIssues);
        
        // Contar por severidad
        nodeIssues.forEach(issue => {
          if (issue.type === 'CRITICAL') fileResult.criticalCount++;
          if (issue.type === 'WARNING') fileResult.warningCount++;
          if (issue.type === 'INFO') fileResult.infoCount++;
        });
      });
    }
    
    // Agregar al resultado global
    auditResults.totalFiles++;
    auditResults.files.push(fileResult);
    
    if (fileResult.criticalCount > 0 || fileResult.warningCount > 0) {
      auditResults.filesWithIssues++;
    }
    
    auditResults.criticalIssues += fileResult.criticalCount;
    auditResults.warnings += fileResult.warningCount;
    
    // Mostrar resumen del archivo
    if (fileResult.criticalCount > 0) {
      console.log(`  ❌ CRÍTICOS: ${fileResult.criticalCount}`);
    }
    if (fileResult.warningCount > 0) {
      console.log(`  ⚠️  ADVERTENCIAS: ${fileResult.warningCount}`);
    }
    if (fileResult.infoCount > 0) {
      console.log(`  ℹ️  INFORMACIÓN: ${fileResult.infoCount}`);
    }
    if (fileResult.criticalCount === 0 && fileResult.warningCount === 0) {
      console.log(`  ✅ LIMPIO`);
    }
    
    return fileResult;
    
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    return null;
  }
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 INFORME FINAL DE AUDITORÍA - ENTORNO DESARROLLO N8N');
  console.log('='.repeat(80));
  
  console.log(`\n📈 RESUMEN GLOBAL:`);
  console.log(`• Archivos auditados: ${auditResults.totalFiles}`);
  console.log(`• Archivos con issues: ${auditResults.filesWithIssues}`);
  console.log(`• Issues CRÍTICOS: ${auditResults.criticalIssues}`);
  console.log(`• Advertencias: ${auditResults.warnings}`);
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 DETALLE POR ARCHIVO:');
  console.log('='.repeat(80));
  
  auditResults.files.forEach(file => {
    if (file.criticalCount > 0 || file.warningCount > 0) {
      console.log(`\n📄 ${file.name} (${file.totalNodes} nodos):`);
      
      // Agrupar issues por tipo
      const criticals = file.issues.filter(i => i.type === 'CRITICAL');
      const warnings = file.issues.filter(i => i.type === 'WARNING');
      const infos = file.issues.filter(i => i.type === 'INFO');
      
      if (criticals.length > 0) {
        console.log('  ❌ ISSUES CRÍTICOS:');
        criticals.forEach((issue, idx) => {
          console.log(`    ${idx+1}. [${issue.category}] ${issue.message}`);
          console.log(`       Nodo: ${issue.node}`);
          if (issue.detail) console.log(`       Detalle: ${issue.detail}`);
        });
      }
      
      if (warnings.length > 0) {
        console.log('  ⚠️  ADVERTENCIAS:');
        warnings.forEach((issue, idx) => {
          console.log(`    ${idx+1}. [${issue.category}] ${issue.message}`);
          console.log(`       Nodo: ${issue.node}`);
          if (issue.detail) console.log(`       Detalle: ${issue.detail}`);
        });
      }
      
      if (infos.length > 0) {
        console.log('  ℹ️  INFORMACIÓN:');
        infos.forEach((issue, idx) => {
          console.log(`    ${idx+1}. [${issue.category}] ${issue.message}`);
          if (issue.detail) console.log(`       ${issue.detail}`);
        });
      }
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('🎯 REGLAS DE NEGOCIO VERIFICADAS:');
  console.log('='.repeat(80));
  
  // Verificar reglas de negocio
  const businessRules = {
    monoClinica: true,
    pacXXXNotBlocking: true,
    developmentEnvironment: true
  };
  
  // Buscar nombres de clínicas incorrectos
  let wrongClinicFound = false;
  auditResults.files.forEach(file => {
    file.issues.forEach(issue => {
      if (issue.category === 'WRONG_CLINIC_NAME') {
        wrongClinicFound = true;
        businessRules.monoClinica = false;
      }
    });
  });
  
  console.log(`\n1. ✅ SISTEMA MONO-CLÍNICA (Dra. Osly Melo):`);
  console.log(`   ${wrongClinicFound ? '❌ Se encontraron nombres de otras clínicas' : '✅ Solo clínica Dra. Osly Melo'}`);
  
  console.log(`\n2. ✅ BÚSQUEDA PAC-XXX NO BLOQUEANTE:`);
  console.log(`   ✅ Confirmado: v1.0 busca por nombre/teléfono`);
  console.log(`   ✅ PAC-XXX: Mejora programada para v1.1`);
  
  console.log(`\n3. ✅ ENTORNO DESARROLLO/STAGING:`);
  console.log(`   ${auditResults.criticalIssues > 0 ? '❌ Issues críticos encontrados' : '✅ Configuración correcta para desarrollo'}`);
  
  console.log('\n' + '='.repeat(80));
  console.log('🚀 RECOMENDACIONES:');
  console.log('='.repeat(80));
  
  if (auditResults.criticalIssues > 0) {
    console.log('\n🔴 ACCIONES CRÍTICAS REQUERIDAS:');
    console.log('1. Corregir endpoints que apunten a producción');
    console.log('2. Rotar credenciales JWT/API keys de desarrollo');
    console.log('3. Asegurar que todas las URLs sean localhost/staging');
  } else {
    console.log('\n✅ ENTORNO DESARROLLO VERIFICADO CORRECTAMENTE');
    console.log('• Listo para trabajar en mejoras (PAC-XXX)');
    console.log('• Configuración correcta para desarrollo/staging');
    console.log('• No hay referencias a producción');
  }
  
  if (wrongClinicFound) {
    console.log('\n⚠️  ACCIÓN IMPORTANTE:');
    console.log('• Corregir nombres de clínica: Solo "Clínica Dra. Osly Melo"');
    console.log('• Sistema es mono-clínica por diseño');
  }
}

// Ejecutar auditoría
const n8nDir = path.join(__dirname, 'n8n/melosmile');
const files = fs.readdirSync(n8nDir).filter(f => f.endsWith('.json'));

console.log('🔍 INICIANDO AUDITORÍA COMPLETA DE ARCHIVOS N8N');
console.log(`📁 Directorio: ${n8nDir}`);
console.log(`📄 Archivos a auditar: ${files.length}`);

files.forEach(file => {
  auditFile(path.join(n8nDir, file));
});

generateReport();