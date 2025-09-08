"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Navbar } from "@/components/navbar";
// import { StepProgress } from "@/components/step-progress";
import dynamic from "next/dynamic";
import { MAX_CAPTURE } from "@/constants";
import {
  uploadToCloudinary,
  updateQRGenerationCount,
} from "@/lib/upload-utils";
import { toast } from "sonner";
import Footer from "@/components/footer";
import confetti from "canvas-confetti";

const PhotoShoot = dynamic(() =>
  import("../components/photo-shoot").then((mod) => mod.PhotoShoot),
);
const LayoutSelection = dynamic(() =>
  import("../components/layout-selection").then((mod) => mod.LayoutSelection),
);

const transitionVariants: Variants = {
  initial: (direction) => ({ opacity: 0, x: direction > 0 ? 20 : -20 }),
  animate: { opacity: 1, x: 0 },
  exit: (direction) => ({ opacity: 0, x: direction > 0 ? -20 : 20 }),
};

export default function PhotoBoothApp() {
  const [step, setStep] = useState<"shoot" | "layout">("shoot");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [layoutType, setLayoutType] = useState<number>(4);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<string | null>("none");
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const canProceedToLayout = capturedImages.length === MAX_CAPTURE;
  const canDownload = selectedIndices.length === layoutType;

  const handleStepChange = () => setStep("layout");

  const retakePhotos = () => {
    setCapturedImages([]);
    setSelectedIndices([]);
    setImageUrl(null);
    setStep("shoot");
  };

  const triggerConfetti = useCallback((duration: number = 3000) => {
    const end = Date.now() + duration;
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

    const frame = () => {
      if (Date.now() > end) return;
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors,
      });
      requestAnimationFrame(frame);
    };

    frame();
  }, []);

  const generateImage = async (layoutType: number): Promise<void | string> => {
    if (!previewRef.current || isDownloading) return;
    setIsDownloading(true);

    try {
      const desiredWidth = layoutType === 4 ? 600 : 1200;
      const desiredHeight = 1800;
      const rect = previewRef.current.getBoundingClientRect();
      const scaleFactor = desiredWidth / rect.width;

      const html2canvas = (await import("html2canvas-pro")).default;

      const canvas = await html2canvas(previewRef.current, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: null,
        width: rect.width,
        height: rect.height,
        scale: scaleFactor,
      });

      const forcedCanvas = document.createElement("canvas");
      forcedCanvas.width = desiredWidth;
      forcedCanvas.height = desiredHeight;
      const ctx = forcedCanvas.getContext("2d");
      if (!ctx) throw new Error("Unable to get 2D context");
      ctx.drawImage(
        canvas,
        0,
        0,
        canvas.width,
        canvas.height,
        0,
        0,
        desiredWidth,
        desiredHeight,
      );

      triggerConfetti();
      return forcedCanvas.toDataURL("image/jpeg", 1.0);
    } catch (error) {
      console.error("Error generating the image:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const uploadAndGenerateQR = async () => {
    if (!previewRef.current || isUploading) return;
    setIsUploading(true);
    setImageUrl(null);

    try {
      const html2canvas = (await import("html2canvas-pro")).default;

      const scaleValue = 2;

      const canvas = await html2canvas(previewRef.current, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: null,
        scale: scaleValue,
      });

      const fileToUpload = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.8);
      });

      if (!fileToUpload) throw new Error("No file to upload");

      const secureUrl = await uploadToCloudinary(fileToUpload);
      setImageUrl(secureUrl);
      updateQRGenerationCount();
      triggerConfetti();
    } catch (error) {
      console.error("Error uploading image:", error);
      toast("Failed to upload. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-hidden">
      <Navbar />
      {/* <StepProgress currentStep={step === "shoot" ? 1 : 2} /> */}
      <AnimatePresence custom={step === "shoot" ? -1 : 1} mode="wait">
        <motion.div
          key={step}
          className="flex-1 overflow-hidden"
          custom={step === "shoot" ? -1 : 1}
          variants={transitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          {step === "shoot" ? (
            <PhotoShoot
              capturedImages={capturedImages}
              setCapturedImages={setCapturedImages}
              canProceedToLayout={canProceedToLayout}
              goToLayoutScreen={handleStepChange}
            />
          ) : (
            <LayoutSelection
              capturedImages={capturedImages}
              previewRef={previewRef}
              layoutType={layoutType}
              selectedIndices={selectedIndices}
              setSelectedIndices={setSelectedIndices}
              setLayoutType={setLayoutType}
              selectedFrame={selectedFrame}
              setSelectedFrame={setSelectedFrame}
              retakePhotos={retakePhotos}
              generateImage={generateImage}
              canDownload={canDownload}
              isDownloading={isDownloading}
              uploadAndGenerateQR={uploadAndGenerateQR}
              isUploading={isUploading}
              imageUrl={imageUrl}
              setImageUrl={setImageUrl}
            />
          )}
        </motion.div>
      </AnimatePresence>
      <Footer />
    </div>
  );
}
