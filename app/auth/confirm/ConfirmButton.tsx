"use client";
import { useFormStatus } from "react-dom";
import { ImagesIcon } from "@phosphor-icons/react/ssr";
import Button from "@/components/ui/Button";

export default function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      block
      loading={pending}
      icon={<ImagesIcon className="size-5" weight="bold" aria-hidden />}
    >
      {pending ? "Masuk" : "Masuk ke galeri"}
    </Button>
  );
}
