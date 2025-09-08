"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Undo2,
  Camera,
  X,
  ImageIcon,
  ChevronDown,
  Smartphone,
  Monitor,
  CameraOff,
  Clock,
  ArrowRight,
  FlipHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { PhotoShootProps } from "@/types";
import { MAX_CAPTURE, TIMER_OPTIONS, DEFAULT_TIMER_INDEX } from "@/constants";
import { FilterGallery, generateFilterStyle } from "./filter-gallery";
import type { FilterValues } from "@/types/filters";
import { FILTER_COLLECTIONS } from "@/constants/filters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMobile } from "@/hooks/use-mobile";
import "context-filter-polyfill";
import UploadPhotoButton from "./upload-photo-button";
import Image from "next/image";

// Camera type enum
enum CameraType {
  FRONT = "front",
  BACK = "back",
  BACK_ULTRA_WIDE = "back_ultra_wide",
  BACK_TELEPHOTO = "back_telephoto",
  EXTERNAL = "external",
  UNKNOWN = "unknown",
}

// Camera info interface
interface CameraInfo {
  device: MediaDeviceInfo;
  type: CameraType;
  label: string;
}

export function PhotoShoot({
  capturedImages,
  setCapturedImages,
  canProceedToLayout,
  goToLayoutScreen,
}: PhotoShootProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const capturedImagesRef = useRef<HTMLDivElement>(null);
  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isMobile = useMobile();
  const [currentFilter, setCurrentFilter] = useState<FilterValues>(
    FILTER_COLLECTIONS.normal[0].filter,
  );
  const [isMirrored, setIsMirrored] = useState(isMobile);
  const [isCameraStarted, setIsCameraStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Mode toggles and auto sequence state
  const [isAutoModeEnabled, setIsAutoModeEnabled] = useState(true); // just mode toggle
  const [isAutoSequenceActive, setIsAutoSequenceActive] = useState(false); // whether auto capture sequence is running

  // Timer-related state
  const [selectedTimerIndex, setSelectedTimerIndex] =
    useState<number>(DEFAULT_TIMER_INDEX);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  // Add a new state variable for filter gallery visibility after the other state declarations
  const [showFilters, setShowFilters] = useState(true);

  const t = useTranslations("HomePage");

  const isMaxCaptureReached = capturedImages.length >= MAX_CAPTURE;
  const selectedTimer = TIMER_OPTIONS[selectedTimerIndex];

  // Create disable variable for Timer button
  const timerDisabled =
    !isCameraStarted || isAutoSequenceActive || countdown !== null;

  // Timer control functions
  const changeTimer = useCallback(() => {
    if (timerDisabled) return;
    setSelectedTimerIndex((prev) => (prev + 1) % TIMER_OPTIONS.length);
  }, [timerDisabled]);

  // Add a toggle function after the other function declarations
  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  // Detect camera type based on label and capabilities
  const detectCameraType = useCallback(
    (
      device: MediaDeviceInfo,
      index: number,
      totalCameras: number,
    ): CameraType => {
      const label = device.label.toLowerCase();

      // Check for explicit keywords in the label
      if (label.includes("ultra") || label.includes("wide")) {
        return CameraType.BACK_ULTRA_WIDE;
      }

      if (label.includes("tele") || label.includes("zoom")) {
        return CameraType.BACK_TELEPHOTO;
      }

      if (
        label.includes("back") ||
        label.includes("rear") ||
        label.includes("environment")
      ) {
        return CameraType.BACK;
      }

      if (
        label.includes("front") ||
        label.includes("face") ||
        label.includes("user") ||
        label.includes("selfie")
      ) {
        return CameraType.FRONT;
      }

      // Heuristics for mobile devices
      if (isMobile) {
        // On mobile with multiple cameras
        if (totalCameras >= 3) {
          // First is usually main back, second is ultra-wide or telephoto, last is front
          if (index === 0) return CameraType.BACK;
          if (index === totalCameras - 1) return CameraType.FRONT;
          return index === 1
            ? CameraType.BACK_ULTRA_WIDE
            : CameraType.BACK_TELEPHOTO;
        } else if (totalCameras === 2) {
          // With 2 cameras, first is usually back, second is front
          return index === 0 ? CameraType.BACK : CameraType.FRONT;
        }
        // Single camera on mobile is usually front
        return CameraType.FRONT;
      }

      // For desktop/laptop
      if (index === 0 && totalCameras === 1) {
        // Built-in webcam
        return CameraType.FRONT;
      }

      // External cameras or additional cameras
      if (index > 0 || totalCameras > 1) {
        return CameraType.EXTERNAL;
      }

      return CameraType.UNKNOWN;
    },
    [isMobile],
  );

  // Format camera label for display
  const formatCameraLabel = useCallback(
    (cameraInfo: CameraInfo): string => {
      const { type, device } = cameraInfo;
      const baseLabel =
        device.label || `Camera ${cameras.indexOf(cameraInfo) + 1}`;

      switch (type) {
        case CameraType.FRONT:
          return isMobile ? "Front Camera" : "Main Camera";
        case CameraType.BACK:
          return "Rear Camera";
        case CameraType.BACK_ULTRA_WIDE:
          return "Ultra-Wide Camera";
        case CameraType.BACK_TELEPHOTO:
          return "Telephoto Camera";
        case CameraType.EXTERNAL:
          return `External Camera ${cameras.filter((c) => c.type === CameraType.EXTERNAL).indexOf(cameraInfo) + 1}`;
        default:
          return baseLabel;
      }
    },
    [cameras, isMobile],
  );

  // Initialize camera
  useEffect(() => {
    const initializeCameras = async () => {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ video: true });

        const devices = await navigator.mediaDevices.enumerateDevices();

        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput",
        );

        if (videoDevices.length === 0) {
          setCameraError("No cameras detected on your device");
          return;
        }

        // Process camera information
        const cameraInfos: CameraInfo[] = videoDevices.map((device, index) => {
          const type = detectCameraType(device, index, videoDevices.length);
          return {
            device,
            type,
            label: device.label || `Camera ${index + 1}`,
          };
        });

        setCameras(cameraInfos);

        // If we haven't started a camera yet, select the preferred one
        if (!isCameraStarted) {
          let preferredCameraIndex = 0; // Default: select the first camera

          if (isMobile) {
            // For mobile devices, prefer the front camera if available
            const frontCameraIndex = cameraInfos.findIndex(
              (c) => c.type === CameraType.FRONT,
            );

            if (frontCameraIndex !== -1) {
              preferredCameraIndex = frontCameraIndex;
            } else {
              // If no front camera exists, fall back to a back camera
              const backCameraIndex = cameraInfos.findIndex(
                (c) =>
                  c.type === CameraType.BACK ||
                  c.type === CameraType.BACK_ULTRA_WIDE ||
                  c.type === CameraType.BACK_TELEPHOTO,
              );
              if (backCameraIndex !== -1) {
                preferredCameraIndex = backCameraIndex;
              }
            }
          }

          setCurrentCameraIndex(preferredCameraIndex);
        }
      } catch (error) {
        console.error("Camera initialization error:", error);
        setCameraError(t("errors.camera_access_required"));
      }
    };

    initializeCameras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectCameraType, isMobile, t]);

  const selectedCamera = useMemo(
    () => cameras[currentCameraIndex],
    [cameras, currentCameraIndex],
  );

  const startCamera = useCallback(async () => {
    if (cameras.length === 0 || currentCameraIndex >= cameras.length) return;

    try {
      // Set mirroring based on camera type
      const shouldMirror =
        selectedCamera.type === CameraType.FRONT ||
        selectedCamera.type === CameraType.UNKNOWN;
      setIsMirrored(shouldMirror);

      // Camera constraints
      const constraints = {
        video: {
          deviceId: { exact: selectedCamera.device.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraStarted(true);
        setCameraError(null);
      }
    } catch (error) {
      console.error("Camera start error:", error);
      setCameraError(t("errors.camera_access_required"));
    }
  }, [cameras.length, currentCameraIndex, selectedCamera, t]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsCameraStarted(false);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start the selected camera
  useEffect(() => {
    if (!navigator.mediaDevices) {
      console.warn("Camera is not supported");
      return;
    }

    startCamera();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        startCamera();
      } else {
        stopCamera();
      }
    };

    const handleBeforeUnload = () => {
      stopCamera();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      stopCamera();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [startCamera, stopCamera]);

  const stopAutoSequence = useCallback(() => {
    setIsAutoSequenceActive(false);
    setCountdown(null);
  }, []);

  // Auto-scroll when new capture is added and stop auto sequence if max capture reached
  useEffect(() => {
    if (capturedImagesRef.current && capturedImages.length > 0) {
      capturedImagesRef.current.scrollLeft =
        capturedImagesRef.current.scrollWidth;
    }
    if (isMaxCaptureReached && isAutoSequenceActive) {
      stopAutoSequence();
    }
  }, [
    capturedImages.length,
    isMaxCaptureReached,
    isAutoSequenceActive,
    stopAutoSequence,
  ]);

  // After captureImage completes, schedule the next auto capture if in auto mode
  const scheduleNextAutoCapture = useCallback(() => {
    if (isAutoModeEnabled && capturedImages.length < MAX_CAPTURE - 1) {
      setTimeout(() => {
        hasCapturedRef.current = false;
        setCountdown(selectedTimer);
      }, 1000);
    } else {
      setIsAutoSequenceActive(false);
      setCountdown(null);
    }
  }, [capturedImages.length, isAutoModeEnabled, selectedTimer]);

  // Modify the captureImage function to remove the flash effect
  const captureImage = useCallback(() => {
    if (
      !isCameraStarted ||
      !videoRef.current ||
      !canvasRef.current ||
      isMaxCaptureReached ||
      isCapturing
    )
      return;

    setIsCapturing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    const { videoWidth: width, videoHeight: height } = videoRef.current;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.filter = generateFilterStyle(currentFilter);

    // Mirror image if needed
    ctx.setTransform(isMirrored ? -1 : 1, 0, 0, 1, isMirrored ? width : 0, 0);
    ctx.drawImage(videoRef.current, 0, 0, width, height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const imageData = canvas.toDataURL("image/png");

    // Remove flash effect and just add the image
    setCapturedImages((prev) => [...prev, imageData]);
    setIsCapturing(false);
    scheduleNextAutoCapture();
  }, [
    currentFilter,
    isCameraStarted,
    isCapturing,
    isMaxCaptureReached,
    isMirrored,
    scheduleNextAutoCapture,
    setCapturedImages,
  ]);

  const uploadDisabled =
    !isCameraStarted ||
    isCapturing ||
    countdown !== null ||
    isAutoSequenceActive ||
    isMaxCaptureReached;
  // Create disable variable for Undo button
  const undoDisabled =
    !capturedImages.length || isAutoSequenceActive || countdown !== null;
  const captureDisabled =
    !canProceedToLayout &&
    (!isCameraStarted || isMaxCaptureReached || isCapturing);
  // const autoDisabled =
  //   !isCameraStarted ||
  //   isMaxCaptureReached ||
  //   isCapturing ||
  //   countdown !== null ||
  //   isAutoSequenceActive;
  const selectCameraDisabled =
    !isCameraStarted ||
    isCapturing ||
    countdown !== null ||
    isAutoSequenceActive;
  const mirrorDisabled =
    !isCameraStarted ||
    isCapturing ||
    countdown !== null ||
    isAutoSequenceActive;
  const filtersDisabled =
    !isCameraStarted ||
    isCapturing ||
    countdown !== null ||
    isAutoSequenceActive;

  // Undo last capture
  const undoCapture = useCallback(() => {
    if (undoDisabled) return;
    if (capturedImages.length) {
      setCapturedImages((prev) => prev.slice(0, -1));
    }
  }, [capturedImages.length, setCapturedImages, undoDisabled]);

  // Start capture (single-shot or auto-capture)
  const startCapture = useCallback(() => {
    if (isMaxCaptureReached) return;
    // Start countdown with the selected timer
    setCountdown(selectedTimer);
    if (isAutoModeEnabled) {
      setIsAutoSequenceActive(true);
    }
  }, [isAutoModeEnabled, isMaxCaptureReached, selectedTimer]);

  const toggleAutoMode = useCallback(() => {
    setIsAutoModeEnabled((prev) => !prev);
    if (isAutoSequenceActive) {
      stopAutoSequence();
    }
  }, [isAutoSequenceActive, stopAutoSequence]);

  // Ref to ensure captureImage is only called once when countdown reaches 0
  const hasCapturedRef = useRef(false);

  // Countdown effect: reduce countdown every second and trigger capture when it hits 0
  useEffect(() => {
    if (countdown === null) {
      hasCapturedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (countdown > 0) {
      hasCapturedRef.current = false;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 0 && !hasCapturedRef.current) {
      hasCapturedRef.current = true;
      captureImage();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [countdown, captureImage]);

  // Handle filter change
  const handleFilterChange = (filter: FilterValues) => {
    // Apply the filter immediately
    setCurrentFilter(filter);

    // Add a subtle animation to indicate the filter has changed
    if (videoRef.current) {
      const video = videoRef.current;
      video.classList.add("filter-transition");
      setTimeout(() => {
        video.classList.remove("filter-transition");
      }, 300);
    }
  };

  // Toggle mirroring manually
  const toggleMirroring = useCallback(() => {
    setIsMirrored((prev) => !prev);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || ""))
        return;
      switch (e.key) {
        case " ":
        case "Enter": {
          if (canProceedToLayout) {
            goToLayoutScreen();
          } else {
            if (isAutoSequenceActive) {
              stopAutoSequence();
            } else {
              if (countdown === null) {
                startCapture();
              } else {
                setCountdown(null);
              }
            }
          }
          break;
        }
        case "Backspace":
        case "Delete":
          undoCapture();
          break;
          // case "a":
          //   toggleAutoMode();
          break;
        case "m":
          toggleMirroring();
          break;
        case "t":
          changeTimer();
          break;
        case "f":
          toggleFilters();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    capturedImages,
    isCameraStarted,
    isMirrored,
    isCapturing,
    isAutoSequenceActive,
    countdown,
    canProceedToLayout,
    goToLayoutScreen,
    stopAutoSequence,
    startCapture,
    undoCapture,
    toggleAutoMode,
    toggleMirroring,
    changeTimer,
    toggleFilters,
  ]);

  const selectCamera = useCallback(
    (index: number) => {
      if (index === currentCameraIndex) return;

      // Stop current stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      // Switch to selected camera
      setCurrentCameraIndex(index);
      setIsCameraStarted(false);
    },
    [currentCameraIndex],
  );

  // Get camera icon based on type
  const getCameraIcon = useCallback((type: CameraType) => {
    switch (type) {
      case CameraType.FRONT:
        return <Camera className="h-4 w-4" />;
      case CameraType.BACK:
      case CameraType.BACK_ULTRA_WIDE:
      case CameraType.BACK_TELEPHOTO:
        return <Smartphone className="h-4 w-4" />;
      case CameraType.EXTERNAL:
        return <Monitor className="h-4 w-4" />;
      default:
        return <Camera className="h-4 w-4" />;
    }
  }, []);

  // Get appropriate icon for the main capture button
  const getCaptureButtonIcon = useCallback(() => {
    if (canProceedToLayout) {
      return <ArrowRight className="h-7 w-7" />;
    } else if (isAutoSequenceActive || countdown !== null) {
      return <X className="h-7 w-7" />;
    } else if (!isCameraStarted) {
      return <CameraOff className="h-7 w-7" />;
    } else {
      return <Camera className="h-7 w-7" />;
    }
  }, [canProceedToLayout, countdown, isAutoSequenceActive, isCameraStarted]);

  const handleImageUpload = (
    imageDataArray: (string | ArrayBuffer | null)[],
  ) => {
    // Filter to include only strings (base64 data)
    const validImages = imageDataArray.filter(
      (data): data is string => typeof data === "string",
    );
    if (validImages.length > 0) {
      setCapturedImages((prev) => [...prev, ...validImages]);
    }
  };

  const cancelCountdown = useCallback(() => {
    setCountdown(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    hasCapturedRef.current = false;
  }, []);

  useEffect(() => {
    setShowFilters(!isMobile);
  }, [isMobile]);

  // Update the UI with the rose-teal color scheme
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center space-y-4 p-3 select-none">
      {/* Camera view with standard border */}
      {cameraError ? (
        <div className="rounded-lg bg-red-50 p-4 text-center font-bold text-red-500">
          {cameraError}
        </div>
      ) : (
        <div className="flex w-full flex-col gap-2">
          <motion.div
            ref={cameraContainerRef}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-gray-200 bg-black"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={cn(
                  "h-full w-full object-cover",
                  isMirrored ? "-scale-x-100" : "",
                )}
                style={{ filter: generateFilterStyle(currentFilter) }}
              />

              {/* Camera controls overlay */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                {/* Camera selection dropdown */}
                {cameras.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      disabled={selectCameraDisabled}
                    >
                      <Button
                        aria-label={
                          cameras[currentCameraIndex]
                            ? formatCameraLabel(cameras[currentCameraIndex])
                            : "Select Camera"
                        }
                        className="flex items-center gap-1 rounded-lg bg-black/50 p-2 text-white hover:bg-black/70"
                      >
                        {cameras[currentCameraIndex] &&
                          getCameraIcon(cameras[currentCameraIndex].type)}
                        <span className="hidden text-xs font-medium sm:inline">
                          {cameras[currentCameraIndex]
                            ? formatCameraLabel(cameras[currentCameraIndex])
                            : "Select Camera"}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {cameras.map((camera, index) => (
                        <DropdownMenuItem
                          key={camera.device.deviceId}
                          className={cn(
                            "flex items-center gap-2 text-sm",
                            currentCameraIndex === index &&
                              "bg-muted font-medium",
                          )}
                          onClick={() => selectCamera(index)}
                        >
                          {getCameraIcon(camera.type)}
                          <span className="truncate">
                            {formatCameraLabel(camera)}
                          </span>
                          {currentCameraIndex === index && (
                            <span className="text-muted-foreground ml-auto text-xs">
                              {t("active")}
                            </span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Guide overlay with animated border */}
              <div className="animate-pulse-gentle pointer-events-none absolute inset-4 rounded-lg border-2 border-white/30" />

              {/* Countdown overlay with default styling */}
              <AnimatePresence>
                {countdown !== null && countdown > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 1.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="text-primary-foreground absolute right-4 bottom-4 flex h-16 w-16 items-center justify-center rounded-full bg-black/50 shadow-lg hover:bg-black/70"
                  >
                    <span className="text-3xl font-bold">{countdown}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute top-4 right-4 flex items-center gap-1 rounded-lg bg-black/50 px-2 py-1 text-white">
                <ImageIcon className="h-4 w-4" />
                <span>
                  {capturedImages.length}/{MAX_CAPTURE}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Filter Gallery with Toggle Button */}
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  className="rounded-lg bg-white"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FilterGallery
                    onFilterChange={handleFilterChange}
                    currentFilter={currentFilter}
                    sampleImageUrl="/placeholder.jpg"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* Camera controls with reorganized layout */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="flex w-full items-center justify-center gap-6">
          {/* Upload Photo Button */}
          <UploadPhotoButton
            onImageUpload={handleImageUpload}
            disabled={uploadDisabled}
            maxFiles={MAX_CAPTURE - capturedImages.length}
          />

          {/* Center - Main capture button */}
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              onClick={
                canProceedToLayout
                  ? goToLayoutScreen
                  : isAutoSequenceActive
                    ? stopAutoSequence
                    : countdown === null
                      ? startCapture
                      : cancelCountdown
              }
              disabled={captureDisabled}
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full p-0",
                canProceedToLayout &&
                  "bg-green-400 text-white hover:bg-green-500",
                (isAutoSequenceActive || countdown !== null) &&
                  "bg-red-400 text-white hover:bg-red-500",
              )}
              size="icon"
            >
              {getCaptureButtonIcon()}
              <span className="sr-only">Capture</span>
            </Button>
          </motion.div>

          {/* Filter Toggle Button */}
          <Button
            onClick={toggleFilters}
            disabled={filtersDisabled}
            className="flex h-10 w-10 items-center justify-center rounded-full p-0 font-bold"
            // variant={showFilters ? "default" : "outline"}
            variant="ghost"
            size="icon"
          >
            {/* <Blend className="h-4 w-4" /> */}
            <Image
              className="dark:invert"
              src="/color-filters.png"
              alt="Filter"
              width={24}
              height={24}
            />
            <span className="sr-only">Toggle filters</span>
          </Button>
        </div>

        <div className="flex w-full items-center justify-center gap-2 border-t border-gray-100 pt-2">
          <Button
            onClick={undoCapture}
            disabled={undoDisabled}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent p-0"
            variant="outline"
            size="icon"
          >
            <Undo2 className="h-3 w-3" />
            <span className="sr-only">Undo capture</span>
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-transparent"
              onClick={changeTimer}
              disabled={timerDisabled}
            >
              <Clock className="h-3 w-3" />
              <span className="sr-only">Next timer</span>
            </Button>
            <div
              className={cn(
                "bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-medium",
                timerDisabled && "pointer-events-none opacity-50",
              )}
            >
              {selectedTimer}
            </div>
          </div>

          <Button
            onClick={toggleMirroring}
            disabled={mirrorDisabled}
            className="flex h-8 w-8 items-center justify-center rounded-full p-0"
            variant={isMirrored ? "default" : "outline"}
            size="icon"
          >
            <FlipHorizontal className="h-3 w-3" />
            <span className="sr-only">Mirror image</span>
          </Button>
        </div>

        {/* Keyboard shortcuts info */}
        <div className="mt-2 hidden text-xs text-gray-600 lg:block">
          <strong>Delete</strong>: {t("undo")} | <strong>T</strong>:{" "}
          {t("change_timer")} | <strong>Space</strong>: {t("capture")} |{" "}
          <strong>M</strong>: {t("toggle_mirror")} | <strong>F</strong>:{" "}
          {t("toggle_filters")}
        </div>
      </motion.div>

      {/* Captured images display with standard border */}
      <div
        ref={capturedImagesRef}
        className="custom-scrollbar hide-scrollbar flex w-full snap-x gap-1 overflow-x-auto scroll-smooth md:gap-2"
        style={{
          height: cameraContainerRef.current
            ? cameraContainerRef.current.clientHeight / 2.5
            : "auto",
        }}
      >
        <AnimatePresence>
          {capturedImages.map((img, index) => (
            <motion.div
              key={img}
              className="relative aspect-[4/3] flex-shrink-0 overflow-hidden rounded-lg border border-gray-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: { duration: 0.3, ease: "easeInOut" },
              }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 20,
                delay: index * 0.03,
              }}
              layout
            >
              {/* Image */}
              <motion.img
                src={img || "/placeholder.svg"}
                alt={`Captured ${index}`}
                className="h-full w-full object-cover"
                initial={{ filter: "blur(8px)" }}
                animate={{
                  filter: "blur(0px)",
                  transition: { duration: 0.3, delay: 0.1 },
                }}
              />

              {/* Delete button at top-right with better styling */}
              <Button
                onClick={() =>
                  setCapturedImages((prev) =>
                    prev.filter((_, i) => i !== index),
                  )
                }
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-80 hover:opacity-100"
                aria-label={`Delete image ${index + 1}`}
                disabled={captureDisabled}
              >
                <X className="h-3 w-3" />
              </Button>

              {/* Image number indicator */}
              <motion.div
                className="bg-primary absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white opacity-80"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 0.9,
                  transition: {
                    type: "spring",
                    stiffness: 500,
                    damping: 25,
                    delay: 0.2 + index * 0.05,
                  },
                }}
              >
                {index + 1}
              </motion.div>

              {/* Subtle overlay gradient */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-50" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
