import { Button } from "@/components/ui/button";
import {
  exportAllData,
  importAllData,
  resetAllData,
} from "@/lib/dataPortability";
import { Download, Trash2, Upload } from "lucide-react";
import { useRef } from "react";

export default function DataPortabilityButtons() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    exportAllData();
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-selected if needed
    e.target.value = "";
    try {
      await importAllData(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Import failed.");
    }
  }

  function handleReset() {
    const confirmed = window.confirm(
      "This will permanently clear all MES data. This cannot be undone. Are you sure?",
    );
    if (confirmed) {
      resetAllData();
    }
  }

  return (
    <div
      className="flex items-center gap-1.5"
      data-ocid="data_portability.panel"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
        data-ocid="data_portability.dropzone"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        title="Export all MES data as JSON backup"
        className="h-8 gap-1.5 text-[12px] font-medium"
        data-ocid="data_portability.export.button"
      >
        <Download size={13} />
        <span className="hidden sm:inline">Export</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleImportClick}
        title="Import MES data from JSON backup file"
        className="h-8 gap-1.5 text-[12px] font-medium"
        data-ocid="data_portability.import.button"
      >
        <Upload size={13} />
        <span className="hidden sm:inline">Import</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleReset}
        title="Reset all MES data (irreversible)"
        className="h-8 gap-1.5 text-[12px] font-medium text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
        data-ocid="data_portability.reset.button"
      >
        <Trash2 size={13} />
        <span className="hidden sm:inline">Reset</span>
      </Button>
    </div>
  );
}
