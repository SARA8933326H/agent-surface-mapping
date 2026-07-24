"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphEdgeType = exports.GraphNodeType = exports.Severity = exports.FunctionalityType = exports.AssetType = exports.EndpointType = exports.ScanStatus = void 0;
var ScanStatus;
(function (ScanStatus) {
    ScanStatus["PENDING"] = "PENDING";
    ScanStatus["RUNNING"] = "RUNNING";
    ScanStatus["COMPLETED"] = "COMPLETED";
    ScanStatus["FAILED"] = "FAILED";
})(ScanStatus || (exports.ScanStatus = ScanStatus = {}));
var EndpointType;
(function (EndpointType) {
    EndpointType["REST"] = "REST";
    EndpointType["GRAPHQL"] = "GRAPHQL";
    EndpointType["JS_ROUTE"] = "JS_ROUTE";
    EndpointType["STATIC"] = "STATIC";
    EndpointType["UNKNOWN"] = "UNKNOWN";
})(EndpointType || (exports.EndpointType = EndpointType = {}));
var AssetType;
(function (AssetType) {
    AssetType["SCRIPT"] = "SCRIPT";
    AssetType["STYLESHEET"] = "STYLESHEET";
    AssetType["IMAGE"] = "IMAGE";
    AssetType["FONT"] = "FONT";
    AssetType["OTHER"] = "OTHER";
})(AssetType || (exports.AssetType = AssetType = {}));
var FunctionalityType;
(function (FunctionalityType) {
    FunctionalityType["AUTH"] = "AUTH";
    FunctionalityType["ADMIN"] = "ADMIN";
    FunctionalityType["DASHBOARD"] = "DASHBOARD";
    FunctionalityType["SEARCH"] = "SEARCH";
    FunctionalityType["CRUD"] = "CRUD";
    FunctionalityType["UPLOAD"] = "UPLOAD";
    FunctionalityType["DOWNLOAD"] = "DOWNLOAD";
    FunctionalityType["API"] = "API";
    FunctionalityType["GRAPHQL"] = "GRAPHQL";
    FunctionalityType["HIDDEN"] = "HIDDEN";
})(FunctionalityType || (exports.FunctionalityType = FunctionalityType = {}));
var Severity;
(function (Severity) {
    Severity["CRITICAL"] = "CRITICAL";
    Severity["HIGH"] = "HIGH";
    Severity["MEDIUM"] = "MEDIUM";
    Severity["LOW"] = "LOW";
    Severity["INFO"] = "INFO";
})(Severity || (exports.Severity = Severity = {}));
var GraphNodeType;
(function (GraphNodeType) {
    GraphNodeType["PAGE"] = "PAGE";
    GraphNodeType["FORM"] = "FORM";
    GraphNodeType["ENDPOINT"] = "ENDPOINT";
    GraphNodeType["ASSET"] = "ASSET";
    GraphNodeType["SCRIPT"] = "SCRIPT";
    GraphNodeType["AUTH"] = "AUTH";
    GraphNodeType["ADMIN"] = "ADMIN";
    GraphNodeType["OBJECT"] = "OBJECT";
})(GraphNodeType || (exports.GraphNodeType = GraphNodeType = {}));
var GraphEdgeType;
(function (GraphEdgeType) {
    GraphEdgeType["NAVIGATION"] = "NAVIGATION";
    GraphEdgeType["API_CALL"] = "API_CALL";
    GraphEdgeType["FORM_ACTION"] = "FORM_ACTION";
    GraphEdgeType["JS_IMPORT"] = "JS_IMPORT";
    GraphEdgeType["RELATIONSHIP"] = "RELATIONSHIP";
})(GraphEdgeType || (exports.GraphEdgeType = GraphEdgeType = {}));
//# sourceMappingURL=index.js.map