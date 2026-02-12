import { generateReport } from '@onui/core';
import type { Annotation, OutputLevel } from '@/types';

/**
 * Generate output for annotations in the specified format
 */
export function generateOutput(
  annotations: Annotation[],
  level: OutputLevel = 'standard'
): string {
  return generateReport(annotations, level, getPageContext());
}

/**
 * Get page context for output headers
 */
export function getPageContext(): {
  url: string;
  title: string;
  timestamp: string;
  viewportWidth: number;
  viewportHeight: number;
  scrollX: number;
  scrollY: number;
  documentWidth: number;
  documentHeight: number;
} {
  return {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
  };
}
