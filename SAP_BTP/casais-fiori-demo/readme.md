# CASAIS SAP BTP Fiori Demo

Prototype SAP BTP application for the Fleet Intelligence demo.

This is a custom SAP BTP/CAP/OData/Fiori Elements proof of concept. It is not a standard SAP S/4HANA Equipment or Plant Maintenance implementation.

## Purpose

Demonstrate the flow:

```text
PWA / NFC event -> OData write -> SAP BTP CAP service -> Fiori UI shows updated data
```

The domain mirrors the operational objects needed for the demo:

- `Equipments`: tools/equipment with NFC tag, status, location and replacement value.
- `FaultReports`: damage/fault reports linked to equipment.
- `Movements`: checkout, transfer and logistics movement events.

## Local Commands

```bash
npm install
npm test
npx cds deploy --to sqlite:db.sqlite
npx cds serve --port 4004
```

Open:

```text
http://localhost:4004
```

Use the generated `Fiori preview` link for `Equipments` to see the SAP/Fiori UI.

## Demo Write Test

```bash
PATCH /equipment/Equipments(11111111-1111-1111-1111-111111111111)
Content-Type: application/json

{
  "currentLocationName": "Piso 4 - Frente Norte",
  "status": "IN_USE",
  "lastSeenBy": "PWA NFC Demo"
}
```

Then refresh the Fiori preview. The updated location is visible in the SAP UI.

## BTP Environment

Validated on 2026-06-09:

- SAP BTP Trial global account: `b6dfb9f3trial`
- Subaccount: `trial`
- Region: `US East (VA) - AWS`
- Cloud Foundry org: `b6dfb9f3trial`
- Space: `dev`
- BAS dev space: `casaisfioridemo`
- Required services visible in marketplace: Business Application Studio, SAP HANA Cloud, SAP HANA Schemas & HDI Containers, XSUAA, Destination, HTML5 Application Repository.

## Positioning

For presentation:

> Foi criada uma aplicação SAP BTP com CAP, OData e interface SAP Fiori para demonstrar a integração operacional da PWA. A solução prova o fluxo técnico de leitura/escrita e visualização em UI SAP. A ligação a objetos standard S/4HANA pode ser feita numa fase posterior quando existir um tenant ERP com os processos standard ativos.
