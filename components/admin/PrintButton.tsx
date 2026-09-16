"use client";
import { PrinterIcon } from "@phosphor-icons/react/ssr";
import Button from "@/components/ui/Button";

export default function PrintButton() {
  return (
    <Button
      onClick={() => window.print()}
      icon={<PrinterIcon className="size-4" weight="bold" aria-hidden />}
    >
      Cetak
    </Button>
  );
}
