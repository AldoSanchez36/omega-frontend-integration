#!/usr/bin/env node
/**
 * Prueba el flujo de enriquecimiento de usuarios en reportes (misma lógica que el dashboard).
 * Uso: node testers/test-report-usuario-enrich.js
 * Env: NEXT_PUBLIC_API_URL, TEST_EMAIL, TEST_PASSWORD
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const TEST_USER = {
  email: process.env.TEST_EMAIL || "aldotrufa@example.com",
  password: process.env.TEST_PASSWORD || "password123",
};

const PLACEHOLDER_NAMES = new Set(["Default", "Usuario", "Usuario desconocido"]);

function normalizeUserId(id) {
  if (id == null) return "";
  return String(id).trim();
}

function parseReportDatosJsonb(report) {
  let datos = report.datos ?? report.reportSelection ?? {};
  if (typeof datos === "string") {
    try {
      datos = JSON.parse(datos);
    } catch {
      datos = {};
    }
  }
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) datos = {};
  const datosRecord = { ...datos };
  if (report.user && typeof report.user === "object") {
    datosRecord.user = { ...(datosRecord.user || {}), ...report.user };
  }
  return datosRecord;
}

function resolveReportUsuarioDisplay(report, datosJsonb, missingName = "Default") {
  const datosUser = datosJsonb.user || {};
  const usuarioId = normalizeUserId(
    report.usuario_id || report.user_id || datosUser.id || report.creado_por
  );
  const usuario =
    datosUser.username ||
    datosUser.nombre ||
    report.usuario_username ||
    report.usuario_nombre ||
    (typeof report.usuario === "string" ? report.usuario : null) ||
    missingName;
  const puesto = datosUser.puesto || report.usuario_puesto || report.puesto || "Default";
  return { usuario_id: usuarioId, usuario, puesto };
}

function enrichWithMap(resolved, usersMap, missingName = "Default") {
  const needsName =
    !resolved.usuario || resolved.usuario === missingName || PLACEHOLDER_NAMES.has(resolved.usuario);
  if (!resolved.usuario_id || !needsName) return resolved;
  const entry = usersMap.get(resolved.usuario_id);
  if (!entry) return resolved;
  return { ...resolved, usuario: entry.username, puesto: entry.puesto || resolved.puesto };
}

async function main() {
  console.log(`\n🔍 API: ${API_BASE_URL}\n`);

  const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(TEST_USER),
  });
  if (!loginRes.ok) {
    console.error("❌ Login falló:", loginRes.status, await loginRes.text());
    process.exit(1);
  }
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) {
    console.error("❌ Sin token en respuesta de login");
    process.exit(1);
  }
  console.log("✅ Login OK\n");

  const year = new Date().getFullYear();
  const reportsRes = await fetch(
    `${API_BASE_URL}/api/reportes?limit=10&startDate=${year}-01-01&endDate=${year}-12-31`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!reportsRes.ok) {
    console.error("❌ Reportes falló:", reportsRes.status);
    process.exit(1);
  }
  const reportsData = await reportsRes.json();
  const reportes = reportsData.reportes || [];
  console.log(`📋 Reportes recibidos: ${reportes.length}\n`);

  const usersRes = await fetch(`${API_BASE_URL}/api/auth/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const usersMap = new Map();
  if (usersRes.ok) {
    const usersData = await usersRes.json();
    const list = Array.isArray(usersData) ? usersData : usersData.users || usersData.usuarios || [];
    for (const u of list) {
      const id = normalizeUserId(u.id || u._id);
      const username = String(u.username || u.nombre || "").trim();
      if (id && username) usersMap.set(id, { username, puesto: u.puesto || "" });
    }
    console.log(`👥 Usuarios en mapa: ${usersMap.size}\n`);
  } else {
    console.warn(`⚠️ /api/auth/users respondió ${usersRes.status}\n`);
  }

  let fixed = 0;
  let stillDefault = 0;

  reportes.slice(0, 8).forEach((report, i) => {
    const datos = parseReportDatosJsonb(report);
    const before = resolveReportUsuarioDisplay(report, datos);
    const after = enrichWithMap(before, usersMap);
    const ok = after.usuario !== "Default" && !PLACEHOLDER_NAMES.has(after.usuario);
    if (ok) fixed++;
    else stillDefault++;
    console.log(`--- Reporte ${i + 1} (id: ${report.id}) ---`);
    console.log(`  usuario_id: ${after.usuario_id || "(vacío)"}`);
    console.log(`  ANTES:  ${before.usuario} / ${before.puesto}`);
    console.log(`  DESPUÉS: ${after.usuario} / ${after.puesto}`);
    console.log(`  datos.user: ${JSON.stringify(datos.user || null)}\n`);
  });

  console.log("--- Resumen ---");
  console.log(`  Con nombre real: ${fixed}`);
  console.log(`  Siguen en Default: ${stillDefault}`);
  if (stillDefault > 0 && usersMap.size === 0) {
    console.log("\n💡 El mapa de usuarios está vacío. Revisa permisos de /api/auth/users o NEXT_PUBLIC_API_URL.");
  }
  if (stillDefault > 0 && usersMap.size > 0) {
    console.log("\n💡 Hay usuarios en el mapa pero algunos reportes no tienen usuario_id enlazado.");
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
