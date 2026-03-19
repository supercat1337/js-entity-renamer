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

            // Проверяем любой узел, у которого есть поле name
            if (node.name !== undefined) {
                const name = node.name;
                const withHash = name.startsWith('#') ? name : '#' + name;

                // Сначала ищем точное совпадение (для обычных идентификаторов)
                if (effectiveMap.hasOwnProperty(name)) {
                    const newName = effectiveMap[name];
                    console.log(
                        `✏️  Renaming "${name}" -> "${newName}" (${node.type}) at line ${node.loc?.start.line}`
                    );
                    node.name = newName;
                    renameCount++;
                }
                // Затем ищем с # (для приватных полей, где в карте ключ с #)
                else if (effectiveMap.hasOwnProperty(withHash)) {
                    const newNameWithHash = effectiveMap[withHash];
                    console.log(
                        `🔄 Renaming private "${withHash}" -> "${newNameWithHash}" (${node.type}) at line ${node.loc?.start.line}`
                    );

                    // Определяем, нужно ли оставить # в имени узла
                    if (node.type === 'Identifier' && name.startsWith('#')) {
                        // Старая версия Babel: имя уже содержит #
                        if (newNameWithHash.startsWith('#')) {
                            node.name = newNameWithHash;
                        } else {
                            node.name = '#' + newNameWithHash; // добавляем # обратно
                        }
                    } else {
                        // Современный Babel: имя без #
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
