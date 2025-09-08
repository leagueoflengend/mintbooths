// Constants
export const MAX_CAPTURE = 8;

export const DEFAULT_FILTERS = {
  brightness: 100,
  contrast: 100,
  grayscale: 0,
  sepia: 0,
  saturate: 100,
  blur: 0,
};

// Timer options
export const TIMER_OPTIONS = [1, 3, 5, 10] as const;
export const DEFAULT_TIMER_INDEX =
  process.env.NODE_ENV === "development" ? 0 : 1; // Default to 3 seconds (index 1)
