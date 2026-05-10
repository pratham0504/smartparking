// Compatibility shim: some imports reference ".../common/data" without file extension
// Create a module file that re-exports everything from the `data` folder's index
export * from "./data/index.js";
