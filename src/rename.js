// @ts-check
import * as parser from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default;
import _generate from '@babel/generator';
const generate = _generate.default;

/**
 * Renames identifiers according to renameMap.
 * @param {string} code - Original source code
 * @param {Object.<string, string>} renameMap - Map of old names to new names
 * @returns {string} - Transformed code
 */
export function renameIdentifiers(code, renameMap) {
    // Filter out identity mappings
    const effectiveMap = {};
    for (const [oldName, newName] of Object.entries(renameMap)) {
        if (oldName !== newName) {
            effectiveMap[oldName] = newName;
        }
    }

    console.log('🔍 Effective map keys:', Object.keys(effectiveMap));

    if (Object.keys(effectiveMap).length === 0) {
        console.log('ℹ️ No effective mappings, skipping file.');
        return code;
    }

    const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: [
            'jsx',
            'typescript',
            'classProperties',
            'classPrivateProperties',
            'classPrivateMethods',
            'dynamicImport',
        ],
        ranges: true,
        tokens: true,
        errorRecovery: true,
    });

    let renameCount = 0;

    traverse(ast, {
        enter(path) {
            const node = path.node;

            // Check any node that has a name field
            if (node.name !== undefined) {
                const name = node.name;
                const withHash = name.startsWith('#') ? name : '#' + name;

                // First look for exact match (for regular identifiers)
                if (effectiveMap.hasOwnProperty(name)) {
                    const newName = effectiveMap[name];
                    console.log(
                        `✏️  Renaming "${name}" -> "${newName}" (${node.type}) at line ${node.loc?.start.line}`
                    );
                    node.name = newName;
                    renameCount++;
                }
                // Then look for match with # (for private fields where the map key includes #)
                else if (effectiveMap.hasOwnProperty(withHash)) {
                    const newNameWithHash = effectiveMap[withHash];
                    console.log(
                        `🔄 Renaming private "${withHash}" -> "${newNameWithHash}" (${node.type}) at line ${node.loc?.start.line}`
                    );

                    // Determine whether to keep the # in the node name
                    if (node.type === 'Identifier' && name.startsWith('#')) {
                        // Older Babel version: name already includes #
                        if (newNameWithHash.startsWith('#')) {
                            node.name = newNameWithHash;
                        } else {
                            node.name = '#' + newNameWithHash; // add # back
                        }
                    } else {
                        // Modern Babel: name without #
                        if (newNameWithHash.startsWith('#')) {
                            node.name = newNameWithHash.slice(1);
                        } else {
                            node.name = newNameWithHash;
                        }
                    }
                    renameCount++;
                }
            }
        },
    });

    console.log(`📊 Total renames in file: ${renameCount}`);

    const output = generate(ast, {
        retainLines: true,
        comments: true,
        compact: false,
        minified: false,
    });

    return output.code;
}
