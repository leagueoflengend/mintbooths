import React, { useRef, ChangeEvent } from "react";
import { Button } from "./ui/button";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface UploadPhotoButtonProps {
  onImageUpload: (imageData: (string | ArrayBuffer | null)[]) => void;
  disabled?: boolean | undefined;
  maxFiles: number;
}

export default function UploadPhotoButton({
  onImageUpload,
  disabled,
  maxFiles,
}: UploadPhotoButtonProps) {
  const t = useTranslations("HomePage");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click(); // mở hộp thoại chọn file
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (maxFiles <= 0) {
      // toast(`The upload limit is not set properly.`);
      toast(t("uploadLimitNotSet"));
      e.target.value = "";
      return;
    }

    if (files.length > maxFiles) {
      // toast(
      //   `You can only upload up to ${maxFiles} ${maxFiles === 1 ? "image" : "images"}.`,
      // );
      toast(
        t("uploadMaxFiles", {
          maxFiles,
          fileLabel: maxFiles === 1 ? t("fileLabel_one") : t("fileLabel_other"),
        }),
      );
      e.target.value = "";
      return;
    }

    const imagesData: string[] = [];
    let loadedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (result !== undefined && typeof result === "string") {
          imagesData.push(result);
          loadedCount++;
          if (loadedCount === files.length) {
            onImageUpload(imagesData);
            e.target.value = "";
          }
        }
      };
      reader.onerror = () => {
        toast(`Failed to read file: ${files[i].name}`);
      };
      reader.readAsDataURL(files[i]);
    }
  };

  return (
    <>
      <Button
        onClick={handleButtonClick}
        className="flex h-10 w-10 items-center justify-center rounded-full p-0"
        variant="outline"
        size="icon"
        disabled={disabled}
      >
        <ImagePlus className="h-4 w-4" />
        <span className="sr-only">Upload photo</span>
      </Button>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />
    </>
  );
}
