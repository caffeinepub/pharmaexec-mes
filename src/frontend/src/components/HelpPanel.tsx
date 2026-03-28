import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AlertTriangle, BookOpen, CheckCircle2 } from "lucide-react";

interface HelpSection {
  heading: string;
  content: string;
  tips?: string[];
  warning?: string;
}

interface HelpPanelProps {
  title: string;
  open: boolean;
  onClose: () => void;
  sections: HelpSection[];
}

export function HelpPanel({ title, open, onClose, sections }: HelpPanelProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-[420px] sm:w-[480px] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-5 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            <SheetTitle className="text-[16px] font-semibold text-foreground">
              {title}
            </SheetTitle>
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            User manual &amp; reference guide
          </p>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-6">
            {sections.map((section) => (
              <div key={section.heading} className="space-y-2">
                <h3 className="text-[13px] font-semibold text-foreground border-b border-border pb-1.5">
                  {section.heading}
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
                {section.tips && section.tips.length > 0 && (
                  <ul className="space-y-1.5 mt-2">
                    {section.tips.map((tip) => (
                      <li key={tip} className="flex items-start gap-2">
                        <CheckCircle2
                          size={13}
                          className="text-emerald-500 mt-0.5 shrink-0"
                        />
                        <span className="text-[12.5px] text-foreground">
                          {tip}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {section.warning && (
                  <div className="flex items-start gap-2 mt-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5">
                    <AlertTriangle
                      size={13}
                      className="text-amber-600 mt-0.5 shrink-0"
                    />
                    <span className="text-[12.5px] text-amber-800 leading-relaxed">
                      {section.warning}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
