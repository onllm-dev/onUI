/**
 * React/Preact component detection utility
 * Traverses fiber/vnode trees to find component names
 */

/**
 * Get React Fiber node from DOM element
 * Works with React 16+ (Fiber architecture)
 */
function getReactFiber(element: Element): unknown | null {
  // React 16+ stores fiber in keys starting with __reactFiber$ or __reactInternalInstance$
  let keys: string[];
  try {
    keys = Object.keys(element);
  } catch {
    return null;
  }

  const fiberKey = keys.find(
    (key) =>
      key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
  );

  if (fiberKey) {
    return (element as unknown as Record<string, unknown>)[fiberKey];
  }

  return null;
}

/**
 * Get Preact vnode from DOM element
 * Works with Preact 10+
 */
function getPreactVNode(element: Element): unknown | null {
  // Preact stores vnode in __v or _prevVNode
  const el = element as unknown as Record<string, unknown>;

  if (el.__v) {
    return el.__v;
  }

  if (el._prevVNode) {
    return el._prevVNode;
  }

  return null;
}

/**
 * Extract component name from React Fiber node
 */
function getComponentNameFromFiber(fiber: unknown): string | null {
  if (!fiber || typeof fiber !== 'object') return null;

  const fiberNode = fiber as Record<string, unknown>;

  // Get the type (function component or class)
  const type = fiberNode.type;

  if (!type) return null;

  // Function/Class component
  if (typeof type === 'function') {
    return (type as { displayName?: string; name?: string }).displayName ||
      (type as { name?: string }).name ||
      null;
  }

  // Memo wrapped component
  if (typeof type === 'object' && type !== null) {
    const typeObj = type as Record<string, unknown>;

    // React.memo
    if (typeObj.$$typeof?.toString?.() === 'Symbol(react.memo)') {
      const innerType = typeObj.type;
      if (typeof innerType === 'function') {
        return (innerType as { displayName?: string; name?: string }).displayName ||
          (innerType as { name?: string }).name ||
          null;
      }
    }

    // React.forwardRef
    if (typeObj.$$typeof?.toString?.() === 'Symbol(react.forward_ref)') {
      const render = typeObj.render;
      if (typeof render === 'function') {
        return (render as { displayName?: string; name?: string }).displayName ||
          (render as { name?: string }).name ||
          null;
      }
    }
  }

  return null;
}

/**
 * Extract component name from Preact vnode
 */
function getComponentNameFromVNode(vnode: unknown): string | null {
  if (!vnode || typeof vnode !== 'object') return null;

  const node = vnode as Record<string, unknown>;

  // Get the type (function component)
  const type = node.type;

  if (typeof type === 'function') {
    return (type as { displayName?: string; name?: string }).displayName ||
      (type as { name?: string }).name ||
      null;
  }

  return null;
}

/**
 * Traverse up the React Fiber tree to collect component names
 */
function traverseReactFiberTree(fiber: unknown, maxDepth = 10): string[] {
  const components: string[] = [];
  let current = fiber;
  let depth = 0;

  while (current && depth < maxDepth) {
    const fiberNode = current as Record<string, unknown>;
    const name = getComponentNameFromFiber(current);

    if (name && !name.startsWith('_') && name !== 'Fragment') {
      components.unshift(name);
    }

    // Move to parent fiber (return pointer in React Fiber)
    current = fiberNode.return;
    depth++;
  }

  return components;
}

/**
 * Traverse up the Preact vnode tree to collect component names
 */
function traversePreactTree(vnode: unknown, maxDepth = 10): string[] {
  const components: string[] = [];
  let current = vnode;
  let depth = 0;

  while (current && depth < maxDepth) {
    const node = current as Record<string, unknown>;
    const name = getComponentNameFromVNode(current);

    if (name && !name.startsWith('_') && name !== 'Fragment') {
      components.unshift(name);
    }

    // Move to parent (__ is parent reference in Preact)
    current = node.__;
    depth++;
  }

  return components;
}

/**
 * Detect React/Preact components for a DOM element
 * Returns component hierarchy string like "App > Dashboard > Button"
 */
export function getReactComponents(element: Element): string | null {
  // Try React first
  const fiber = getReactFiber(element);
  if (fiber) {
    const components = traverseReactFiberTree(fiber);
    if (components.length > 0) {
      return components.join(' > ');
    }
  }

  // Try Preact
  const vnode = getPreactVNode(element);
  if (vnode) {
    const components = traversePreactTree(vnode);
    if (components.length > 0) {
      return components.join(' > ');
    }
  }

  // Walk up DOM tree and check each element
  let current: Element | null = element;
  const allComponents: string[] = [];
  let iterations = 0;
  const maxIterations = 50; // Safety limit

  while (current && current !== document.body && iterations < maxIterations) {
    iterations++;

    try {
      const reactFiber = getReactFiber(current);
      if (reactFiber) {
        const name = getComponentNameFromFiber(reactFiber);
        if (name && !name.startsWith('_') && name !== 'Fragment') {
          if (!allComponents.includes(name)) {
            allComponents.unshift(name);
          }
        }
      }

      const preactVNode = getPreactVNode(current);
      if (preactVNode) {
        const name = getComponentNameFromVNode(preactVNode);
        if (name && !name.startsWith('_') && name !== 'Fragment') {
          if (!allComponents.includes(name)) {
            allComponents.unshift(name);
          }
        }
      }
    } catch {
      // Skip elements that cause errors
      break;
    }

    current = current.parentElement;
  }

  if (allComponents.length > 0) {
    return allComponents.join(' > ');
  }

  return null;
}

/**
 * Check if page uses React
 */
export function hasReact(): boolean {
  return !!(
    (window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
    document.querySelector('[data-reactroot]') ||
    document.querySelector('[data-react-helmet]')
  );
}

/**
 * Check if page uses Preact
 */
export function hasPreact(): boolean {
  return !!(window as unknown as Record<string, unknown>).__PREACT_DEVTOOLS__;
}
