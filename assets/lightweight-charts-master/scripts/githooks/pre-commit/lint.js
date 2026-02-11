#!/usr/bin/env node

import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const redColor = '\x1b[1;31m';
const noColor = '\x1b[0m';

const gitConflictRegex = /^(<{7}|={7}|>{7})(?:\s|$)/m;

function getStagedFiles() {
	return childProcess.execSync(
		'git diff --cached --name-only --diff-filter=ACM',
		{ encoding: 'utf-8' }
	).split('\n').map(str => str.trim()).filter(str => str.length !== 0);
}

function checkGitConflicts(files) {
	let hasErrors = false;
	for (const file of files) {
		const fileContent = fs.readFileSync(file, { encoding: 'utf-8' });
		if (gitConflictRegex.test(fileContent)) {
			console.error(`${file}: Unresolved git conflict found`);
			hasErrors = true;
			break;
		}
	}

	return hasErrors;
}

function run(cmd) {
	try {
		childProcess.execSync(cmd, { stdio: 'inherit' });
		return false;
	} catch (e) {
		return true;
	}
}

function shellEscape(arg) {
	if (!/[\s"$`]/.test(arg)) {
		return arg;
	}

	return `"${arg
		.replace(/"/g, '\\"')
		.replace(/\$/g, '\\$')
		.replace(/`/g, '\\`')
	}"`;
}

function runForFiles(cmd, files) {
	if (files.length === 0) {
		return false;
	}

	cmd += ' ';
	for (const file of files) {
		cmd += `${shellEscape(file)} `;
	}

	return run(cmd);
}

function runESLintForFiles(files) {
	if (files.length === 0) {
		return false;
	}
	const eslintPath = path.join(process.cwd(), 'node_modules/eslint/bin/eslint.js');
	if (!fs.existsSync(eslintPath) && !fs.existsSync(path.join(process.cwd(), 'node_modules/eslint/bin/eslint'))) {
		return false;
	}
	return runForFiles('node ./node_modules/eslint/bin/eslint --quiet --format=unix', files);
}

function runMarkdownLintForFiles(mdFiles) {
	const mdPath = path.join(process.cwd(), 'node_modules/markdownlint-cli/markdownlint.js');
	if (!fs.existsSync(mdPath)) {
		return false;
	}
	return runForFiles('node ./node_modules/markdownlint-cli/markdownlint.js', mdFiles);
}

function filterByExt(files, ext) {
	return files.filter(file => path.extname(file) === ext);
}

// eslint-disable-next-line complexity
function lintFiles(files) {
	let hasErrors = false;

	// eslint for js and jsxd
	hasErrors = runESLintForFiles(filterByExt(files, '.js')) || hasErrors;
	hasErrors = runESLintForFiles(filterByExt(files, '.jsx')) || hasErrors;

	// tsc & eslint for ts files
	const tsFiles = filterByExt(files, '.ts');
	const tsxFiles = filterByExt(files, '.tsx');
	if (tsFiles.length !== 0 || tsxFiles.length !== 0) {
		const pkgPath = path.join(process.cwd(), 'package.json');
		if (fs.existsSync(pkgPath)) {
			const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
			if (pkg.scripts && pkg.scripts['tsc-verify']) {
				hasErrors = run('npm run tsc-verify') || hasErrors;
			}
		}
		hasErrors = runESLintForFiles(tsFiles) || hasErrors;
		hasErrors = runESLintForFiles(tsxFiles) || hasErrors;
	}

	// markdown
	const mdFiles = filterByExt(files, '.md');
	if (mdFiles.length !== 0) {
		// yeah, eslint might check code inside markdown files
		hasErrors = runESLintForFiles(mdFiles) || hasErrors;
		hasErrors = runMarkdownLintForFiles(mdFiles) || hasErrors;
		const checkLinksPath = path.join(process.cwd(), 'scripts/check-markdown-links.js');
		if (fs.existsSync(checkLinksPath)) {
			hasErrors = run('node scripts/check-markdown-links.js') || hasErrors;
		}
	}

	// markdown react
	const mdxFiles = filterByExt(files, '.mdx');
	if (mdxFiles.length !== 0) {
		hasErrors = runESLintForFiles(mdxFiles) || hasErrors;
	}

	return hasErrors;
}

function main() {
	const stagedFiles = getStagedFiles();
	const errorsPresent = checkGitConflicts(stagedFiles) || lintFiles(stagedFiles);

	if (errorsPresent) {
		console.error(`${redColor}
Errors encountered when running pre-commit script. Won't commit.
Review your changes and try again.
${noColor}`);
		process.exit(1);
	}
}

main();
