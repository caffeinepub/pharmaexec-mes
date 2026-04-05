/**
 * RequiredLabel Component
 * Renders a form label with an optional red asterisk (*) for required fields.
 * Usage: <RequiredLabel label="Equipment Name" required htmlFor="name" />
 */

import type React from "react";
import { Label } from "./ui/label";

interface RequiredLabelProps {
  label: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}

export const RequiredLabel: React.FC<RequiredLabelProps> = ({
  label,
  required = false,
  htmlFor,
  className = "",
}) => {
  return (
    <Label htmlFor={htmlFor} className={`text-sm font-medium ${className}`}>
      {label}
      {required && (
        <span
          className="ml-0.5 text-red-500 font-bold"
          aria-hidden="true"
          title="Required field"
        >
          *
        </span>
      )}
    </Label>
  );
};

export default RequiredLabel;
