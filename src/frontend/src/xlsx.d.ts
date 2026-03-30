// XLSX is loaded via CDN in index.html
declare module "xlsx" {
  const utils: {
    book_new(): WorkBook;
    book_append_sheet(wb: WorkBook, ws: WorkSheet, name: string): void;
    json_to_sheet(data: Record<string, unknown>[]): WorkSheet;
    aoa_to_sheet(data: unknown[][]): WorkSheet;
  };
  function writeFile(wb: WorkBook, filename: string): void;
  interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, WorkSheet>;
  }
  interface WorkSheet {}
}
