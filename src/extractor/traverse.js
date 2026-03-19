// @ts-check

/**
 * Recursively traverses AST and renames identifiers according to renameMap.
 * @param {any} node - Current AST node
 * @param {Object.<string, string>} renameMap - Map of old names to new names
 */
export function traverseAndRename(node, renameMap) {
  if (!node || typeof node !== 'object') return;

  // If it's an identifier, check if it needs renaming
  if (node.type === 'Identifier' && renameMap.hasOwnProperty(node.name)) {
    node.name = renameMap[node.name];
  }

  // Recurse into all enumerable properties
  for (const key in node) {
    if (Object.prototype.hasOwnProperty.call(node, key)) {
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          traverseAndRename(item, renameMap);
        }
      } else {
        traverseAndRename(child, renameMap);
      }
    }
  }
}