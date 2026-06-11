using { casais.sapdemo as db } from '../db/schema';

service EquipmentService @(path: '/equipment') {
  entity Equipments as projection on db.Equipments;
  entity FaultReports as projection on db.FaultReports;
  entity Movements as projection on db.Movements;
}

annotate EquipmentService.Equipments with @(
  UI.HeaderInfo: {
    TypeName: 'Equipment',
    TypeNamePlural: 'Equipments',
    Title: { Value: name },
    Description: { Value: equipmentCode }
  },
  UI.SelectionFields: [ status, assignedProject, currentLocationName ],
  UI.LineItem: [
    { Value: equipmentCode, Label: 'Code' },
    { Value: name, Label: 'Equipment' },
    { Value: status, Label: 'Status' },
    { Value: assignedProject, Label: 'Project' },
    { Value: currentLocationName, Label: 'Location' },
    { Value: lastSeenAt, Label: 'Last NFC Read' },
    { Value: hasOpenFault, Label: 'Open Fault' }
  ],
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Operational Status', Target: '@UI.FieldGroup#Operational' },
    { $Type: 'UI.ReferenceFacet', Label: 'Commercial Data', Target: '@UI.FieldGroup#Commercial' },
    { $Type: 'UI.ReferenceFacet', Label: 'Fault Reports', Target: 'faults/@UI.LineItem' },
    { $Type: 'UI.ReferenceFacet', Label: 'Movements', Target: 'movements/@UI.LineItem' }
  ],
  UI.FieldGroup #Operational: {
    Data: [
      { Value: status, Label: 'Status' },
      { Value: rfidTag, Label: 'NFC Tag' },
      { Value: assignedProject, Label: 'Project' },
      { Value: currentLocationName, Label: 'Location' },
      { Value: latitude, Label: 'Latitude' },
      { Value: longitude, Label: 'Longitude' },
      { Value: lastSeenBy, Label: 'Last Seen By' },
      { Value: lastSeenAt, Label: 'Last Seen At' }
    ]
  },
  UI.FieldGroup #Commercial: {
    Data: [
      { Value: replacementValue, Label: 'Replacement Value' },
      { Value: criticality, Label: 'Criticality' }
    ]
  }
);

annotate EquipmentService.FaultReports with @(
  UI.HeaderInfo: {
    TypeName: 'Fault Report',
    TypeNamePlural: 'Fault Reports',
    Title: { Value: faultType },
    Description: { Value: status }
  },
  UI.LineItem: [
    { Value: faultType, Label: 'Type' },
    { Value: status, Label: 'Status' },
    { Value: reportedAt, Label: 'Reported At' },
    { Value: reportedBy, Label: 'Reported By' },
    { Value: description, Label: 'Description' }
  ]
);

annotate EquipmentService.Movements with @(
  UI.HeaderInfo: {
    TypeName: 'Movement',
    TypeNamePlural: 'Movements',
    Title: { Value: movementType },
    Description: { Value: toLocation }
  },
  UI.LineItem: [
    { Value: movementType, Label: 'Type' },
    { Value: fromLocation, Label: 'From' },
    { Value: toLocation, Label: 'To' },
    { Value: createdAt, Label: 'Created At' },
    { Value: createdBy, Label: 'Created By' }
  ]
);
