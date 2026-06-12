#!/usr/bin/env node
/**
 * seed-masterdata.js — Curadoria de master data SAP BTP
 *
 * Dry-run por defeito: imprime create/update por equipmentCode sem escrever no OData.
 * Para executar escritas: node seed-masterdata.js --write
 *
 * Pré-requisitos para --write:
 *   O servidor CAP deve estar a correr (cds watch ou produção BTP).
 *   Endpoint: ODATA_BASE_URL (env var) ou https://casais-fiori-demo-srv.cfapps.us10-001.hana.ondemand.com/equipment
 */

const https = require('https');
const http = require('http');

const DRY_RUN = !process.argv.includes('--write');
const BASE_URL = process.env.ODATA_BASE_URL
  || 'https://casais-fiori-demo-srv.cfapps.us10-001.hana.ondemand.com/equipment';

// ─── Master data ───────────────────────────────────────────────────────────
//
// NFC split: apenas 5 equipamentos têm tag física (rfidTag preenchido).
// Os restantes 11 são master data SAP sem tag atribuída (rfidTag: null).
//
// NFC-ready (5): MART-002, LIXA-001, LASER-004, SERRA-006, APAR-005
// Sem tag (11):  REBARB-003, COMP-008, PERF-007, ASPI-009, BETON-010,
//                COMP-011, GER-012, MART-013, LIXA-014, LASER-015, REBARB-016
//
// Na PWA, ao importar SAP: só equipamentos com rfidTag podem usar fluxo NFC.
// Admin pode atribuir tag depois via PWA (campo rfidTag editável).
const MASTER_DATA = [
  // ── NFC-ready ──────────────────────────────────────────────────────────────
  {
    equipmentCode: 'MART-002',
    name: 'Martelo Perfurador Bosch GBH 2-26 F',
    rfidTag: 'MARTELO_002',
    brand: 'Bosch', model: 'GBH 2-26 F', category: 'FERRAMENTA_ELETRICA',
    serialNumber: 'GBH226F-2204507321', sapEquipmentId: 'EQ-10000001', sapAssetNumber: '0010000001',
    manufacturer: 'Robert Bosch GmbH', costCenter: 'CC-PORTO-001', plant: 'PT01', storageLocation: 'OBR-TVB',
    acquisitionValue: 980.00, acquisitionDate: '2023-03-15', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
  {
    equipmentCode: 'LIXA-001',
    name: 'Lixadora Orbital Bosch GEX 125-150 AVE',
    rfidTag: 'LIXA_001',
    brand: 'Bosch', model: 'GEX 125-150 AVE', category: 'FERRAMENTA_ELETRICA',
    serialNumber: 'GEX125-2203891045', sapEquipmentId: 'EQ-10000002', sapAssetNumber: '0010000002',
    manufacturer: 'Robert Bosch GmbH', costCenter: 'CC-PORTO-001', plant: 'PT01', storageLocation: 'OBR-TVB',
    acquisitionValue: 420.00, acquisitionDate: '2023-03-15', source: 'SAP_BTP', technicalStatus: 'INSPECTION_DUE',
  },
  {
    equipmentCode: 'LASER-004',
    name: 'Laser Nivelador Hilti PR 30-HVS',
    rfidTag: 'LASER_004',
    brand: 'Hilti', model: 'PR 30-HVS', category: 'INSTRUMENTO_MEDICAO',
    serialNumber: 'PR30HVS-HIL20241387', sapEquipmentId: 'EQ-10000003', sapAssetNumber: '0010000003',
    manufacturer: 'Hilti AG', costCenter: 'CC-TRANSCO-002', plant: 'PT02', storageLocation: 'OBR-IP2',
    acquisitionValue: 1850.00, acquisitionDate: '2022-09-08', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
  {
    equipmentCode: 'SERRA-006',
    name: 'Serra Circular Makita DHS680Z',
    rfidTag: 'SERRA_006',
    brand: 'Makita', model: 'DHS680Z', category: 'FERRAMENTA_ELETRICA',
    serialNumber: 'DHS680-MAK2310294', sapEquipmentId: 'EQ-10000004', sapAssetNumber: '0010000004',
    manufacturer: 'Makita Corporation', costCenter: 'CC-GAIA-003', plant: 'PT01', storageLocation: 'OBR-GAN',
    acquisitionValue: 760.00, acquisitionDate: '2023-07-22', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
  {
    equipmentCode: 'APAR-005',
    name: 'Aparafusadora Makita DDF484Z',
    rfidTag: 'APAR_005',
    brand: 'Makita', model: 'DDF484Z', category: 'FERRAMENTA_ELETRICA',
    serialNumber: 'DDF484-MAK2402871', sapEquipmentId: 'EQ-10000009', sapAssetNumber: '0010000009',
    manufacturer: 'Makita Corporation', costCenter: 'CC-PORTO-001', plant: 'PT01', storageLocation: 'OBR-TVB',
    acquisitionValue: 280.00, acquisitionDate: '2024-02-20', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
  // ── SAP master data — sem tag NFC (pendente de etiquetagem) ───────────────
  {
    equipmentCode: 'REBARB-003',
    name: 'Rebarbadora DeWalt DWE4120',
    rfidTag: null,
    brand: 'DeWalt', model: 'DWE4120', category: 'FERRAMENTA_ELETRICA',
    serialNumber: 'DWE4120-DEW2318047', sapEquipmentId: 'EQ-10000005', sapAssetNumber: '0010000005',
    manufacturer: 'Stanley Black & Decker', costCenter: 'CC-PORTO-001', plant: 'PT01', storageLocation: 'OBR-TVB',
    acquisitionValue: 320.00, acquisitionDate: '2024-01-10', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
  {
    equipmentCode: 'COMP-008',
    name: 'Compactador Wacker Neuson BS50-4',
    rfidTag: null,
    brand: 'Wacker Neuson', model: 'BS50-4', category: 'EQUIPAMENTO_PESADO',
    serialNumber: 'BS504-WN22003791', sapEquipmentId: 'EQ-10000006', sapAssetNumber: '0010000006',
    manufacturer: 'Wacker Neuson SE', costCenter: 'CC-GAIA-003', plant: 'PT01', storageLocation: 'OBR-GAN',
    acquisitionValue: 4200.00, acquisitionDate: '2021-11-05', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
  {
    equipmentCode: 'PERF-007',
    name: 'Perfurador Hilti TE 60-ATC',
    rfidTag: null,
    brand: 'Hilti', model: 'TE 60-ATC', category: 'FERRAMENTA_ELETRICA',
    serialNumber: 'TE60ATC-HIL20228745', sapEquipmentId: 'EQ-10000007', sapAssetNumber: '0010000007',
    manufacturer: 'Hilti AG', costCenter: 'CC-TRANSCO-002', plant: 'PT02', storageLocation: 'OBR-IP2',
    acquisitionValue: 2800.00, acquisitionDate: '2022-05-30', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
  {
    equipmentCode: 'ASPI-009',
    name: 'Aspirador Industrial Bosch GAS 25 L AFC',
    rfidTag: null,
    brand: 'Bosch', model: 'GAS 25 L AFC', category: 'EQUIPAMENTO_AUXILIAR',
    serialNumber: 'GAS25-2301647832', sapEquipmentId: 'EQ-10000008', sapAssetNumber: '0010000008',
    manufacturer: 'Robert Bosch GmbH', costCenter: 'CC-ARM-000', plant: 'PT01', storageLocation: 'MAIA',
    acquisitionValue: 450.00, acquisitionDate: '2023-09-12', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
  {
    equipmentCode: 'BETON-010',
    name: 'Betoneira Altrad B130',
    rfidTag: null,
    brand: 'Altrad', model: 'B130', category: 'EQUIPAMENTO_PESADO',
    serialNumber: 'B130-ALT20190443', sapEquipmentId: 'EQ-10000010', sapAssetNumber: '0010000010',
    manufacturer: 'Altrad Group', costCenter: 'CC-GAIA-003', plant: 'PT01', storageLocation: 'OBR-GAN',
    acquisitionValue: 680.00, acquisitionDate: '2022-04-18', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
  {
    equipmentCode: 'COMP-011',
    name: 'Compressor Atlas Copco XAMS 287',
    rfidTag: null,
    brand: 'Atlas Copco', model: 'XAMS 287', category: 'EQUIPAMENTO_AUXILIAR',
    serialNumber: 'XAMS287-AC2021004122', sapEquipmentId: 'EQ-10000011', sapAssetNumber: '0010000011',
    manufacturer: 'Atlas Copco AB', costCenter: 'CC-PORTO-001', plant: 'PT01', storageLocation: 'OBR-TVB',
    acquisitionValue: 12500.00, acquisitionDate: '2021-08-14', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
  {
    equipmentCode: 'GER-012',
    name: 'Gerador Honda EU70is',
    rfidTag: null,
    brand: 'Honda', model: 'EU70is', category: 'EQUIPAMENTO_AUXILIAR',
    serialNumber: 'EU70IS-HND21445701', sapEquipmentId: 'EQ-10000012', sapAssetNumber: '0010000012',
    manufacturer: 'Honda Motor Co. Ltd.', costCenter: 'CC-TRANSCO-002', plant: 'PT02', storageLocation: 'OBR-IP2',
    acquisitionValue: 3200.00, acquisitionDate: '2022-11-23', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
  {
    equipmentCode: 'MART-013',
    name: 'Martelo Demolidor Hilti TE 2000-AVR',
    rfidTag: null,
    brand: 'Hilti', model: 'TE 2000-AVR', category: 'FERRAMENTA_ELETRICA',
    serialNumber: 'TE2000-HIL23011897', sapEquipmentId: 'EQ-10000013', sapAssetNumber: '0010000013',
    manufacturer: 'Hilti AG', costCenter: 'CC-PORTO-001', plant: 'PT01', storageLocation: 'OBR-TVB',
    acquisitionValue: 2150.00, acquisitionDate: '2023-01-09', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
  {
    equipmentCode: 'LIXA-014',
    name: 'Lixadora Angular Makita 9565CVR',
    rfidTag: null,
    brand: 'Makita', model: '9565CVR', category: 'FERRAMENTA_ELETRICA',
    serialNumber: '9565CVR-MAK2211034', sapEquipmentId: 'EQ-10000014', sapAssetNumber: '0010000014',
    manufacturer: 'Makita Corporation', costCenter: 'CC-GAIA-003', plant: 'PT01', storageLocation: 'OBR-GAN',
    acquisitionValue: 195.00, acquisitionDate: '2022-10-07', source: 'SAP_BTP', technicalStatus: 'INSPECTION_DUE',
  },
  {
    equipmentCode: 'LASER-015',
    name: 'Laser Rotativo Leica Rugby 610',
    rfidTag: null,
    brand: 'Leica', model: 'Rugby 610', category: 'INSTRUMENTO_MEDICAO',
    serialNumber: 'RUG610-LEI2020047823', sapEquipmentId: 'EQ-10000015', sapAssetNumber: '0010000015',
    manufacturer: 'Leica Geosystems AG', costCenter: 'CC-ARM-000', plant: 'PT01', storageLocation: 'MAIA',
    acquisitionValue: 2400.00, acquisitionDate: '2020-06-25', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
  {
    equipmentCode: 'REBARB-016',
    name: 'Rebarbadora Bosch GWS 22-230 JH',
    rfidTag: null,
    brand: 'Bosch', model: 'GWS 22-230 JH', category: 'FERRAMENTA_ELETRICA',
    serialNumber: 'GWS22-2312847091', sapEquipmentId: 'EQ-10000016', sapAssetNumber: '0010000016',
    manufacturer: 'Robert Bosch GmbH', costCenter: 'CC-TRANSCO-002', plant: 'PT02', storageLocation: 'OBR-IP2',
    acquisitionValue: 580.00, acquisitionDate: '2023-12-01', source: 'SAP_BTP', technicalStatus: 'OPERATIONAL',
  },
];

// ─── HTTP helper ────────────────────────────────────────────────────────────
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const lib = url.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search, method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== CASAIS SAP BTP — SEED MASTER DATA ===');
  console.log(`Modo: ${DRY_RUN ? 'DRY-RUN (sem escritas)' : 'LIVE (PATCH/POST para OData)'}`);
  console.log(`Endpoint: ${BASE_URL}`);
  console.log(`Equipamentos: ${MASTER_DATA.length}\n`);

  let created = 0, updated = 0, errors = 0;
  const syncTs = new Date().toISOString();

  for (const eq of MASTER_DATA) {
    const filter = `$filter=equipmentCode eq '${eq.equipmentCode}'&$select=ID,equipmentCode`;
    let existing = null;

    if (!DRY_RUN) {
      try {
        const res = await request('GET', `/Equipments?${filter}`);
        if (res.status === 200 && res.body.value?.length > 0) {
          existing = res.body.value[0];
        }
      } catch (e) {
        console.error(`  [ERROR] GET ${eq.equipmentCode}: ${e.message}`);
        errors++;
        continue;
      }
    }

    const payload = { ...eq, lastSapSyncAt: syncTs };
    delete payload.equipmentCode; // key field, not in PATCH body
    // rfidTag: include explicitly (null clears the tag; string sets it)
    if (!('rfidTag' in payload)) payload.rfidTag = null;

    const nfcLabel = eq.rfidTag ? `NFC:${eq.rfidTag}` : 'sem tag NFC';

    if (existing) {
      // PATCH
      if (DRY_RUN) {
        console.log(`[DRY] PATCH Equipments(${existing?.ID ?? '<id>'}) — ${eq.equipmentCode} | ${eq.brand} ${eq.model} | ${eq.sapAssetNumber} | ${nfcLabel}`);
      } else {
        try {
          const res = await request('PATCH', `/Equipments(${existing.ID})`, payload);
          if (res.status >= 200 && res.status < 300) {
            console.log(`[OK]  PATCH ${eq.equipmentCode} → updated`);
            updated++;
          } else {
            console.error(`[ERR] PATCH ${eq.equipmentCode} → HTTP ${res.status}`, res.body);
            errors++;
          }
        } catch (e) {
          console.error(`[ERR] PATCH ${eq.equipmentCode}: ${e.message}`);
          errors++;
        }
      }
    } else {
      // POST (new record — only for truly new equipment codes)
      const fullPayload = { equipmentCode: eq.equipmentCode, ...payload };
      if (DRY_RUN) {
        console.log(`[DRY] POST  Equipments — ${eq.equipmentCode} | ${eq.brand} ${eq.model} | ${eq.sapAssetNumber} | ${nfcLabel}`);
      } else {
        try {
          const res = await request('POST', '/Equipments', fullPayload);
          if (res.status >= 200 && res.status < 300) {
            console.log(`[OK]  POST  ${eq.equipmentCode} → created`);
            created++;
          } else {
            console.error(`[ERR] POST  ${eq.equipmentCode} → HTTP ${res.status}`, res.body);
            errors++;
          }
        } catch (e) {
          console.error(`[ERR] POST  ${eq.equipmentCode}: ${e.message}`);
          errors++;
        }
      }
    }
  }

  console.log('\n=== SUMÁRIO ===');
  if (DRY_RUN) {
    console.log(`Dry-run concluído. ${MASTER_DATA.length} equipamentos processados.`);
    console.log('Para aplicar: node seed-masterdata.js --write');
  } else {
    console.log(`Criados: ${created} | Actualizados: ${updated} | Erros: ${errors}`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
