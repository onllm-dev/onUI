export type AnnotationIntent = 'fix' | 'change' | 'question' | 'approve';
export type AnnotationSeverity = 'blocking' | 'important' | 'suggestion';
export type AnnotationStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';

export type OutputLevel = 'compact' | 'standard' | 'detailed' | 'forensic';

export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom?: number;
  right?: number;
  isFixed: boolean;
}

export interface Annotation {
  id: string;
  selector: string;
  elementPath: string;
  tagName: string;
  comment: string;
  selectedText?: string;
  boundingBox: BoundingBox;
  createdAt: number;
  updatedAt: number;
  pageUrl: string;
  pageTitle: string;
  attributes: Record<string, string>;
  role?: string;
  textContent?: string;
  reactComponents?: string;
  computedStyles?: string;
  viewportX?: number;
  documentY?: number;
  intent?: AnnotationIntent;
  severity?: AnnotationSeverity;
  status?: AnnotationStatus;
}

export interface ReportContext {
  url: string;
  title: string;
  timestamp: string;
  viewportWidth?: number;
  viewportHeight?: number;
  scrollX?: number;
  scrollY?: number;
  documentWidth?: number;
  documentHeight?: number;
}
