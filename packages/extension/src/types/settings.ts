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
  showMarkers: true,
  markerColor: '#6366f1',
  markerSize: 24,
};
