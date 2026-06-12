sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("casais.equipment.controller.Detail", {

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("detail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sId = decodeURIComponent(oEvent.getParameter("arguments").equipmentId);
            var sPath = "/Equipments(" + sId + ")";
            this.getView().bindElement({
                path: sPath,
                parameters: {
                    $expand: "faults,movements",
                    $select: "ID,equipmentCode,name,rfidTag,status,assignedProject,currentLocationName,latitude,longitude,lastSeenAt,lastSeenBy,hasOpenFault,replacementValue,criticality,sapEquipmentId,sapAssetNumber,serialNumber,brand,model,category,costCenter,plant,storageLocation,acquisitionValue,acquisitionDate,manufacturer,source,lastSapSyncAt,technicalStatus"
                }
            });
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("list");
        },

        onRefresh: function () {
            this.getView().getElementBinding().refresh();
        }
    });
});
