// XLSX is loaded as a global via CDN script in index.html
// This module re-exports it for use in TypeScript files

declare global {
  const XLSX: typeof import("xlsx");
}

export default (window as unknown as { XLSX: typeof import("xlsx") }).XLSX;
