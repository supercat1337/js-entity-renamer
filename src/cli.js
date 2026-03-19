#!/usr/bin/env node
// @ts-check

import fs from 'fs/promises';
import path from 'path';
import minimist from 'minimist';
import { collectFiles } from './fileCollector.js';
import { renameIdentifiers } from './rename.js';

const HELP = `
Usage: js-entity-renamer [options] <patterns...>

Options:
  -m, --map <file>       JSON file with rename map (required)
  -o, --output-dir <dir> Output directory (if not specified, overwrites input files)
  -r, --recursive        Process directories recursively
  --exclude <pattern>    Exclude files/directories matching glob (can be repeated)
  --dry-run              Show what would be changed without writing files
  -h, --help             Show this help
`;

async function main() {
    const argv = minimist(process.argv.slice(2), {
        string: ['map', 'output-dir', 'exclude'],
        boolean: ['recursive', 'dry-run', 'help'],
        alias: { m: 'map', o: 'output-dir', r: 'recursive', h: 'help' },
        default: { exclude: [] },
    });

    if (argv.help || argv._.length === 0 || !argv.map) {
        console.log(HELP);
        process.exit(0);
    }

    // Load map
    const mapPath = path.resolve(argv.map);
    /** @type {Object.<string, string>} */
    const renameMap = JSON.parse(await fs.readFile(mapPath, 'utf8'));

    // Collect files
    const exclude = Array.isArray(argv.exclude) ? argv.exclude : [argv.exclude];
    const files = await collectFiles(argv._, argv.recursive, exclude);
    if (files.length === 0) {
        console.error('No JavaScript files found.');
        process.exit(0);
    }

    let hasErrors = false;
    for (const file of files) {
        try {
            const code = await fs.readFile(file, 'utf8');
            const newCode = renameIdentifiers(code, renameMap);

            if (argv['dry-run']) {
                console.log(`[DRY RUN] Would write ${file}`);
                continue;
            }

            const outputPath = argv['output-dir']
                ? path.join(argv['output-dir'], path.relative(process.cwd(), file))
                : file;

            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.writeFile(outputPath, newCode, 'utf8');
            console.log(`Updated ${outputPath}`);
        } catch (err) {
            console.error(`Error processing ${file}:`, err);
            hasErrors = true;
        }
    }

    process.exit(hasErrors ? 1 : 0);
}

/*
main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
*/

main();