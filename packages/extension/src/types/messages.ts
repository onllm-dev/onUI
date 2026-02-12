import type { Annotation, AnnotationInput, AnnotationUpdate } from './annotation';
import type { Settings } from './settings';

/**
 * Message types for content script <-> background communication
 */
export type MessageType =
  | 'GET_ANNOTATIONS'
  | 'CREATE_ANNOTATION'
  | 'UPDATE_ANNOTATION'
  | 'DELETE_ANNOTATION'
  | 'CLEAR_ANNOTATIONS'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'GET_TAB_RUNTIME_STATE'
  | 'SET_TAB_ENABLED'
  | 'SET_ANNOTATE_MODE'
  | 'TAB_RUNTIME_STATE_CHANGED'
  | 'GET_STATE'
  | 'SET_STATE';

/**
 * Runtime state for a single tab
 */
export interface TabRuntimeState {
  enabled: boolean;
  annotateMode: boolean;
}

/**
 * Base message structure
 */
export interface BaseMessage {
  type: MessageType;
  meta?: {
    requestId?: string;
    sentAt?: number;
    source?: 'content' | 'popup' | 'background';
  };
}

/**
 * Get annotations for current page
 */
export interface GetAnnotationsMessage extends BaseMessage {
  type: 'GET_ANNOTATIONS';
  payload: {
    url: string;
  };
}

/**
 * Create a new annotation
 */
export interface CreateAnnotationMessage extends BaseMessage {
  type: 'CREATE_ANNOTATION';
  payload: AnnotationInput;
}

/**
 * Update an existing annotation
 */
export interface UpdateAnnotationMessage extends BaseMessage {
  type: 'UPDATE_ANNOTATION';
  payload: {
    id: string;
    update: AnnotationUpdate;
  };
}

/**
 * Delete an annotation
 */
export interface DeleteAnnotationMessage extends BaseMessage {
  type: 'DELETE_ANNOTATION';
  payload: {
    id: string;
  };
}

/**
 * Clear all annotations for a URL
 */
export interface ClearAnnotationsMessage extends BaseMessage {
  type: 'CLEAR_ANNOTATIONS';
  payload: {
    url: string;
  };
}

/**
 * Get settings
 */
export interface GetSettingsMessage extends BaseMessage {
  type: 'GET_SETTINGS';
}

/**
 * Update settings
 */
export interface UpdateSettingsMessage extends BaseMessage {
  type: 'UPDATE_SETTINGS';
  payload: Partial<Settings>;
}

/**
 * Get extension state for a tab
 */
export interface GetStateMessage extends BaseMessage {
  type: 'GET_STATE';
  payload: {
    tabId?: number;
  };
}

/**
 * Set extension state for a tab
 */
export interface SetStateMessage extends BaseMessage {
  type: 'SET_STATE';
  payload: {
    tabId?: number;
    isActive: boolean;
  };
}

/**
 * Get runtime state for a tab
 */
export interface GetTabRuntimeStateMessage extends BaseMessage {
  type: 'GET_TAB_RUNTIME_STATE';
  payload?: {
    tabId?: number;
  };
}

/**
 * Enable/disable onUI for a tab
 */
export interface SetTabEnabledMessage extends BaseMessage {
  type: 'SET_TAB_ENABLED';
  payload: {
    tabId?: number;
    enabled: boolean;
  };
}

/**
 * Enable/disable annotate mode for a tab
 */
export interface SetAnnotateModeMessage extends BaseMessage {
  type: 'SET_ANNOTATE_MODE';
  payload: {
    tabId?: number;
    annotateMode: boolean;
  };
}

/**
 * Runtime state changed event (background -> content/popup)
 */
export interface TabRuntimeStateChangedMessage extends BaseMessage {
  type: 'TAB_RUNTIME_STATE_CHANGED';
  payload: {
    tabId: number;
    state: TabRuntimeState;
  };
}

/**
 * Union of all message types
 */
export type Message =
  | GetAnnotationsMessage
  | CreateAnnotationMessage
  | UpdateAnnotationMessage
  | DeleteAnnotationMessage
  | ClearAnnotationsMessage
  | GetSettingsMessage
  | UpdateSettingsMessage
  | GetTabRuntimeStateMessage
  | SetTabEnabledMessage
  | SetAnnotateModeMessage
  | TabRuntimeStateChangedMessage
  | GetStateMessage
  | SetStateMessage;

/**
 * Message response wrapper
 */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Typed response types for each message
 */
export type GetAnnotationsResponse = MessageResponse<Annotation[]>;
export type CreateAnnotationResponse = MessageResponse<Annotation>;
export type UpdateAnnotationResponse = MessageResponse<Annotation>;
export type DeleteAnnotationResponse = MessageResponse<void>;
export type ClearAnnotationsResponse = MessageResponse<void>;
export type GetSettingsResponse = MessageResponse<Settings>;
export type UpdateSettingsResponse = MessageResponse<Settings>;
export type GetStateResponse = MessageResponse<{ isActive: boolean }>;
export type SetStateResponse = MessageResponse<void>;
export type GetTabRuntimeStateResponse = MessageResponse<TabRuntimeState>;
export type SetTabEnabledResponse = MessageResponse<TabRuntimeState>;
export type SetAnnotateModeResponse = MessageResponse<TabRuntimeState>;
