/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { execSync } from 'child_process';
import { join, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const rootPath = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..');
const vscodePath = join(rootPath, 'vscode');
const editorPath = join(vscodePath, 'out-monaco-editor-core');
const commit = execSync('git rev-parse HEAD', { cwd: vscodePath, encoding: 'utf8' }).trim();
const packageJsonPath = join(editorPath, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

packageJson.distro = commit;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

