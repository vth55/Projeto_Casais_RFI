namespace casais.sapdemo;

using { cuid, managed } from '@sap/cds/common';

entity Equipments : cuid, managed {
  equipmentCode       : String(40);
  name                : String(120);
  rfidTag             : String(80);
  status              : String(30);
  assignedProject     : String(120);
  currentLocationName : String(120);
  latitude            : Decimal(9, 6);
  longitude           : Decimal(9, 6);
  lastSeenAt          : Timestamp;
  lastSeenBy          : String(120);
  hasOpenFault        : Boolean default false;
  replacementValue    : Decimal(13, 2);
  criticality         : Integer default 1;
  // SAP Master Data
  sapEquipmentId      : String(20);
  sapAssetNumber      : String(20);
  serialNumber        : String(60);
  brand               : String(60);
  model               : String(80);
  category            : String(60);
  costCenter          : String(20);
  plant               : String(10);
  storageLocation     : String(20);
  acquisitionValue    : Decimal(13, 2);
  acquisitionDate     : Date;
  manufacturer        : String(80);
  source              : String(40);
  lastSapSyncAt       : Timestamp;
  technicalStatus     : String(30);
  faults              : Composition of many FaultReports on faults.equipment = $self;
  movements           : Composition of many Movements on movements.equipment = $self;
}

entity FaultReports : cuid, managed {
  equipment    : Association to Equipments;
  faultType    : String(60);
  description  : String(500);
  status       : String(30);
  reportedAt   : Timestamp;
  reportedBy   : String(120);
  gpsLatitude  : Decimal(9, 6);
  gpsLongitude : Decimal(9, 6);
}

entity Movements : cuid, managed {
  equipment    : Association to Equipments;
  movementType : String(40);
  fromLocation : String(120);
  toLocation   : String(120);
  createdAt    : Timestamp;
  createdBy    : String(120);
  gpsLatitude  : Decimal(9, 6);
  gpsLongitude : Decimal(9, 6);
}
