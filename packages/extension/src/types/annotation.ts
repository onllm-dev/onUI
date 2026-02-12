/**
 * Intent for annotation - what the user wants to communicate
 */
export type AnnotationIntent = 'fix' | 'change' | 'question' | 'approve';

/**
 * Severity level for annotation
 */
export type AnnotationSeverity = 'blocking' | 'important' | 'suggestion';

/**
 * Status of annotation in workflow
 */
export type AnnotationStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';

/**
 * Annotation type - AFS (Annotation Format Standard) v1
 */
export interface Annotation {
  /** Unique identifier */
  id: string;
  /** Element XPath or CSS selector */
  selector: string;
  /** Human-readable element path (e.g., "button#submit > span") */
  elementPath: string;
  /** Element tag name */
  tagName: string;
  /** User comment describing the element */
  comment: string;
  /** Selected text content (if any) */
  selectedText?: string;
  /** Element bounding box */
  boundingBox: BoundingBox;
  /** Timestamp of annotation creation */
  createdAt: number;
  /** Timestamp of last update */
  updatedAt: number;
  /** Page URL where annotation was created */
  pageUrl: string;
  /** Page title */
  pageTitle: string;
  /** Element attributes */
  attributes: Record<string, string>;
  /** Element computed role (accessibility) */
  role?: string;
  /** Element text content (truncated) */
  textContent?: string;

  // OnUI-specific fields (AFS v1.1)
  /** React/Preact component hierarchy (e.g., "App > Dashboard > Button") */
  reactComponents?: string;
  /** Key computed styles as formatted string */
  computedStyles?: string;
  /** X position as percentage of viewport width */
  viewportX?: number;
  /** Y position in pixels from document top */
  documentY?: number;
  /** User intent for this annotation */
  intent?: AnnotationIntent;
  /** Severity level */
  severity?: AnnotationSeverity;
  /** Workflow status */
  status?: AnnotationStatus;
}

/**
 * Bounding box for element positioning
 */
export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom?: number;
  right?: number;
  /** Whether element has fixed/sticky positioning */
  isFixed: boolean;
}

/**
 * Annotation creation input (partial annotation)
 */
export type AnnotationInput = Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Annotation update input
 */
export type AnnotationUpdate = Partial<Omit<Annotation, 'id' | 'createdAt'>>;
