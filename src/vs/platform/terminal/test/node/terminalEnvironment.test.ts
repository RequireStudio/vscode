/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { deepStrictEqual, ok, strictEqual } from 'assert';
import { homedir, userInfo } from 'os';
import { NullLogService } from 'vs/platform/log/common/log';
import { ITerminalProcessOptions } from 'vs/platform/terminal/common/terminal';
import { getShellIntegrationInjection, IShellIntegrationConfigInjection } from 'vs/platform/terminal/node/terminalEnvironment';

const enabledProcessOptions: ITerminalProcessOptions['shellIntegration'] = { enabled: true };
const disabledProcessOptions: ITerminalProcessOptions['shellIntegration'] = { enabled: false };
const pwshExe = process.platform === 'win32' ? 'pwsh.exe' : 'pwsh';
const repoRoot = process.platform === 'win32' ? process.cwd()[0].toLowerCase() + process.cwd().substring(1) : process.cwd();
const logService = new NullLogService();
const defaultEnvironment = {};

suite('platform - terminalEnvironment', () => {
	suite('getShellIntegrationInjection', () => {
		suite('should not enable', () => {
			test('when isFeatureTerminal or when no executable is provided', () => {
				ok(!getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo'], isFeatureTerminal: true }, enabledProcessOptions, defaultEnvironment, logService));
				ok(getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo'], isFeatureTerminal: false }, enabledProcessOptions, defaultEnvironment, logService));
			});
		});

		suite('pwsh', () => {
			const expectedPs1 = process.platform === 'win32'
				? `try { . "${repoRoot}\\out\\vs\\workbench\\contrib\\terminal\\browser\\media\\shellIntegration.ps1" } catch {}`
				: `. "${repoRoot}/out/vs/workbench/contrib/terminal/browser/media/shellIntegration.ps1"`;
			suite('should override args', () => {
				const enabledExpectedResult = Object.freeze<IShellIntegrationConfigInjection>({
					newArgs: [
						'-noexit',
						'-command',
						expectedPs1
					],
					envMixin: {
						VSCODE_INJECTION: '1'
					}
				});
				test('when undefined, []', () => {
					deepStrictEqual(getShellIntegrationInjection({ executable: pwshExe, args: [] }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
					deepStrictEqual(getShellIntegrationInjection({ executable: pwshExe, args: undefined }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
				});
				suite('when no logo', () => {
					test('array - case insensitive', () => {
						deepStrictEqual(getShellIntegrationInjection({ executable: pwshExe, args: ['-NoLogo'] }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
						deepStrictEqual(getShellIntegrationInjection({ executable: pwshExe, args: ['-NOLOGO'] }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
						deepStrictEqual(getShellIntegrationInjection({ executable: pwshExe, args: ['-nol'] }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
						deepStrictEqual(getShellIntegrationInjection({ executable: pwshExe, args: ['-NOL'] }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
					});
					test('string - case insensitive', () => {
						deepStrictEqual(getShellIntegrationInjection({ executable: pwshExe, args: '-NoLogo' }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
						deepStrictEqual(getShellIntegrationInjection({ executable: pwshExe, args: '-NOLOGO' }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
						deepStrictEqual(getShellIntegrationInjection({ executable: pwshExe, args: '-nol' }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
						deepStrictEqual(getShellIntegrationInjection({ executable: pwshExe, args: '-NOL' }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
					});
				});
			});
			suite('should incorporate login arg', () => {
				const enabledExpectedResult = Object.freeze<IShellIntegrationConfigInjection>({
					newArgs: [
						'-l',
						'-noexit',
						'-command',
						expectedPs1
					],
					envMixin: {
						VSCODE_INJECTION: '1'
					}
				});
				test('when array contains no logo and login', () => {
					deepStrictEqual(getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo'] }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
				});
				test('when string', () => {
					deepStrictEqual(getShellIntegrationInjection({ executable: pwshExe, args: '-l' }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
				});
			});
			suite('should not modify args', () => {
				test('when shell integration is disabled', () => {
					strictEqual(getShellIntegrationInjection({ executable: pwshExe, args: ['-l'] }, disabledProcessOptions, defaultEnvironment, logService), undefined);
					strictEqual(getShellIntegrationInjection({ executable: pwshExe, args: '-l' }, disabledProcessOptions, defaultEnvironment, logService), undefined);
					strictEqual(getShellIntegrationInjection({ executable: pwshExe, args: undefined }, disabledProcessOptions, defaultEnvironment, logService), undefined);
				});
				test('when using unrecognized arg', () => {
					strictEqual(getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo', '-i'] }, disabledProcessOptions, defaultEnvironment, logService), undefined);
				});
				test('when using unrecognized arg (string)', () => {
					strictEqual(getShellIntegrationInjection({ executable: pwshExe, args: '-i' }, disabledProcessOptions, defaultEnvironment, logService), undefined);
				});
			});
		});

		if (process.platform !== 'win32') {
			suite('zsh', () => {
				suite('should override args', () => {
					const username = userInfo().username;
					const expectedDir = new RegExp(`.+\/${username}-vscode-zsh`);
					const customZdotdir = '/custom/zsh/dotdir';
					const customUserZdotdir = '/custom/zsh/user_dotdir';
					const expectedDests = [
						new RegExp(`.+\/${username}-vscode-zsh\/\.zshrc`),
						new RegExp(`.+\/${username}-vscode-zsh\/\.zprofile`),
						new RegExp(`.+\/${username}-vscode-zsh\/\.zshenv`),
						new RegExp(`.+\/${username}-vscode-zsh\/\.zlogin`)
					];
					const expectedSources = [
						/.+\/out\/vs\/workbench\/contrib\/terminal\/browser\/media\/shellIntegration-rc.zsh/,
						/.+\/out\/vs\/workbench\/contrib\/terminal\/browser\/media\/shellIntegration-profile.zsh/,
						/.+\/out\/vs\/workbench\/contrib\/terminal\/browser\/media\/shellIntegration-env.zsh/,
						/.+\/out\/vs\/workbench\/contrib\/terminal\/browser\/media\/shellIntegration-login.zsh/
					];
					function assertIsEnabled(result: IShellIntegrationConfigInjection, globalZdotdir = homedir()) {
						strictEqual(Object.keys(result.envMixin!).length, 3);
						ok(result.envMixin!['ZDOTDIR']?.match(expectedDir));
						strictEqual(result.envMixin!['USER_ZDOTDIR'], globalZdotdir);
						ok(result.envMixin!['VSCODE_INJECTION']?.match('1'));
						strictEqual(result.filesToCopy?.length, 4);
						ok(result.filesToCopy[0].dest.match(expectedDests[0]));
						ok(result.filesToCopy[1].dest.match(expectedDests[1]));
						ok(result.filesToCopy[2].dest.match(expectedDests[2]));
						ok(result.filesToCopy[3].dest.match(expectedDests[3]));
						ok(result.filesToCopy[0].source.match(expectedSources[0]));
						ok(result.filesToCopy[1].source.match(expectedSources[1]));
						ok(result.filesToCopy[2].source.match(expectedSources[2]));
						ok(result.filesToCopy[3].source.match(expectedSources[3]));
					}
					test('when undefined, []', () => {
						const result1 = getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, defaultEnvironment, logService);
						deepStrictEqual(result1?.newArgs, ['-i']);
						assertIsEnabled(result1);
						const result2 = getShellIntegrationInjection({ executable: 'zsh', args: undefined }, enabledProcessOptions, defaultEnvironment, logService);
						deepStrictEqual(result2?.newArgs, ['-i']);
						assertIsEnabled(result2);
					});
					suite('should incorporate login arg', () => {
						test('when array', () => {
							const result = getShellIntegrationInjection({ executable: 'zsh', args: ['-l'] }, enabledProcessOptions, defaultEnvironment, logService);
							deepStrictEqual(result?.newArgs, ['-il']);
							assertIsEnabled(result);
						});
					});
					suite('should not modify args', () => {
						test('when shell integration is disabled', () => {
							strictEqual(getShellIntegrationInjection({ executable: 'zsh', args: ['-l'] }, disabledProcessOptions, defaultEnvironment, logService), undefined);
							strictEqual(getShellIntegrationInjection({ executable: 'zsh', args: undefined }, disabledProcessOptions, defaultEnvironment, logService), undefined);
						});
						test('when using unrecognized arg', () => {
							strictEqual(getShellIntegrationInjection({ executable: 'zsh', args: ['-l', '-fake'] }, disabledProcessOptions, defaultEnvironment, logService), undefined);
						});
					});
					suite('should incorporate global ZDOTDIR env variable', () => {
						test('when custom ZDOTDIR', () => {
							const result1 = getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, { ...defaultEnvironment, ZDOTDIR: customZdotdir }, logService);
							deepStrictEqual(result1?.newArgs, ['-i']);
							assertIsEnabled(result1, customZdotdir);
						});
						test('when undefined', () => {
							const result1 = getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, undefined, logService);
							deepStrictEqual(result1?.newArgs, ['-i']);
							assertIsEnabled(result1);
						});
					});
					suite('should incorporate global USER_ZDOTDIR env variable', () => {
						test('when custom ZDOTDIR and USER_ZDOTDIR is undefined', () => {
							const result1 = getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, { ...defaultEnvironment, ZDOTDIR: customZdotdir }, logService);
							deepStrictEqual(result1?.newArgs, ['-i']);
							assertIsEnabled(result1, customZdotdir);
						});
						test('when custom ZDOTDIR and USER_ZDOTDIR', () => {
							const result1 = getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, { ...defaultEnvironment, ZDOTDIR: customZdotdir, USER_ZDOTDIR: customUserZdotdir }, logService);
							deepStrictEqual(result1?.newArgs, ['-i']);
							assertIsEnabled(result1, customUserZdotdir);
						});
						test('when undefined', () => {
							const result1 = getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, undefined, logService);
							deepStrictEqual(result1?.newArgs, ['-i']);
							assertIsEnabled(result1, homedir());
						});
					});
				});
			});
			suite('bash', () => {
				suite('should override args', () => {
					test('when undefined, [], empty string', () => {
						const enabledExpectedResult = Object.freeze<IShellIntegrationConfigInjection>({
							newArgs: [
								'--init-file',
								`${repoRoot}/out/vs/workbench/contrib/terminal/browser/media/shellIntegration-bash.sh`
							],
							envMixin: {
								VSCODE_INJECTION: '1'
							}
						});
						deepStrictEqual(getShellIntegrationInjection({ executable: 'bash', args: [] }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
						deepStrictEqual(getShellIntegrationInjection({ executable: 'bash', args: '' }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
						deepStrictEqual(getShellIntegrationInjection({ executable: 'bash', args: undefined }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
					});
					suite('should set login env variable and not modify args', () => {
						const enabledExpectedResult = Object.freeze<IShellIntegrationConfigInjection>({
							newArgs: [
								'--init-file',
								`${repoRoot}/out/vs/workbench/contrib/terminal/browser/media/shellIntegration-bash.sh`
							],
							envMixin: {
								VSCODE_INJECTION: '1',
								VSCODE_SHELL_LOGIN: '1'
							}
						});
						test('when array', () => {
							deepStrictEqual(getShellIntegrationInjection({ executable: 'bash', args: ['-l'] }, enabledProcessOptions, defaultEnvironment, logService), enabledExpectedResult);
						});
					});
					suite('should not modify args', () => {
						test('when shell integration is disabled', () => {
							strictEqual(getShellIntegrationInjection({ executable: 'bash', args: ['-l'] }, disabledProcessOptions, defaultEnvironment, logService), undefined);
							strictEqual(getShellIntegrationInjection({ executable: 'bash', args: undefined }, disabledProcessOptions, defaultEnvironment, logService), undefined);
						});
						test('when custom array entry', () => {
							strictEqual(getShellIntegrationInjection({ executable: 'bash', args: ['-l', '-i'] }, disabledProcessOptions, defaultEnvironment, logService), undefined);
						});
					});
				});
			});
		}
	});
});
