// components/ShareDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeCanvas } from "qrcode.react";
import { Smartphone, Download, Copy, Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  copied: boolean;
  copyToClipboard: () => void;
  shareUrl: () => void;
}

export default function ShareDialog({
  open,
  onOpenChange,
  imageUrl,
  copied,
  copyToClipboard,
  shareUrl,
}: ShareDialogProps) {
  const t = useTranslations("HomePage");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border-0 p-0 shadow-xl">
        <div className="border-b">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>{t("share_title")}</DialogTitle>
          </DialogHeader>
        </div>

        {imageUrl && (
          <div className="bg-white p-4">
            <div className="flex flex-col items-center">
              <div className="mb-3 flex items-center gap-2">
                <Smartphone className="text-primary h-5 w-5" />
                <h3 className="text-base font-medium text-gray-800">
                  {t("scan_to_view_on_mobile")}
                </h3>
              </div>

              <div className="mb-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <QRCodeCanvas
                  value={imageUrl}
                  size={200}
                  level="H"
                  marginSize={4}
                  className="max-w-full"
                />
              </div>

              <p className="mb-3 max-w-xs text-center text-xs text-gray-500">
                {t("scan_content")}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="rounded-b-xl border-t bg-gray-50 px-6 py-4">
          <Button
            variant="outline"
            onClick={
              imageUrl ? () => window.open(imageUrl, "_blank") : undefined
            }
          >
            <Download className="mr-1 h-3 w-3" />
            {t("open_link")}
          </Button>
          <Button variant="outline" onClick={copyToClipboard}>
            {copied ? (
              <Check className="mr-1 h-3 w-3" />
            ) : (
              <Copy className="mr-1 h-3 w-3" />
            )}
            {copied ? `${t("copied")}!` : t("copy_link")}
          </Button>
          {typeof window !== "undefined" &&
            navigator &&
            typeof navigator.share === "function" && (
              <Button variant="outline" onClick={shareUrl}>
                <Share2 className="mr-1 h-3 w-3" />
                {t("share")}
              </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
