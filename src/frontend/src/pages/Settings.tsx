import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { HelpPanel } from "../components/HelpPanel";
import { helpContent } from "../data/helpContent";

export default function Settings() {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="space-y-5" data-ocid="settings.page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-[13px] mt-0.5">
            System configuration and preferences
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setHelpOpen(true)}
          data-ocid="settings.help.button"
        >
          <HelpCircle size={15} /> Help
        </Button>
      </div>
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground text-[14px]">
          Settings panel coming soon.
        </p>
      </div>
      <HelpPanel
        title={helpContent.settings.title}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        sections={helpContent.settings.sections}
      />
    </div>
  );
}
