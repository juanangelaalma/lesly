"use client";

import { useState, useTransition } from "react";
import { CheckIcon, CopyIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { Button, buttonClass } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/phone";
import { logShareEvent } from "@/features/sessions/actions";

type Props = {
  text: string;
  phone: string | null;
  entityId: string;
  kind: "report" | "reminder";
};

export function ShareActions({ text, phone, entityId, kind }: Props) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [, startTransition] = useTransition();

  const log = (event: "whatsapp_opened" | "copied") => {
    startTransition(async () => {
      await logShareEvent(`${kind}_${event}`, entityId);
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("done");
      log("copied");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <a
        href={whatsappUrl(text, phone)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => log("whatsapp_opened")}
        className={buttonClass("primary", "md", "w-full")}
      >
        <WhatsappLogoIcon size={20} weight="bold" aria-hidden />
        {phone ? "Buka WhatsApp" : "Buka WhatsApp, pilih kontak"}
      </a>
      <Button variant="secondary" className="w-full" onClick={copy}>
        {copied === "done" ? <CheckIcon size={20} weight="bold" aria-hidden /> : <CopyIcon size={20} weight="bold" aria-hidden />}
        {copied === "done" ? "Teks tersalin" : "Salin teks"}
      </Button>
      <p aria-live="polite" className="text-sm text-ink-muted">
        {copied === "failed"
          ? "Browser menolak menyalin otomatis. Tekan lama teks di atas lalu pilih Salin."
          : "WhatsApp hanya dibuka dengan pesan terisi. Pastikan Anda menekan kirim di WhatsApp."}
      </p>
    </div>
  );
}
