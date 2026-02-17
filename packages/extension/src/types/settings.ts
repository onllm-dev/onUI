/**
 * Output detail level for annotation export
 */
export type OutputLevel = 'compact' | 'standard' | 'detailed' | 'forensic';

/**
 * Extension settings
 */
export interface Settings {
  /** Output detail level */
  outputLevel: OutputLevel;
  /** Clear page annotations after a successful copy action */
  clearOnCopy: boolean;
  /** Whether to show annotation markers */
  showMarkers: boolean;
  /** Marker color (CSS color value) */
  markerColor: string;
  /** Marker size in pixels */
  markerSize: number;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  outputLevel: 'standard',
  clearOnCopy: false,
  showMarkers: true,
  markerColor: '#6366f1',
  markerSize: 24,
};
