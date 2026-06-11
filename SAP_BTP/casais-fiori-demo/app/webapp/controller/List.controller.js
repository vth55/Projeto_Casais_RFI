sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("casais.equipment.controller.List", {

        onItemPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oCtx = oItem.getBindingContext();
            var sId = oCtx.getProperty("ID");
            this.getOwnerComponent().getRouter().navTo("detail", { equipmentId: encodeURIComponent(sId) });
        },

        onSelectionChange: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oCtx = oItem.getBindingContext();
            var sId = oCtx.getProperty("ID");
            this.getOwnerComponent().getRouter().navTo("detail", { equipmentId: encodeURIComponent(sId) });
        },

        onRefresh: function () {
            this.byId("equipmentTable").getBinding("items").refresh();
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oTable = this.byId("equipmentTable");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];
            if (sQuery) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("equipmentCode", FilterOperator.Contains, sQuery),
                        new Filter("name", FilterOperator.Contains, sQuery),
                        new Filter("assignedProject", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }
            oBinding.filter(aFilters);
        }
    });
});
