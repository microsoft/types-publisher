"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const path = require("path");
const ts = require("typescript");
const util_1 = require("../util/util");
const definition_parser_1 = require("./definition-parser");
function getModuleInfo(packageName, all) {
    const dependencies = new Set();
    const declaredModules = [];
    const globals = new Set();
    function addDependency(ref) {
        if (ref.startsWith("."))
            return;
        const dependency = rootName(ref, all);
        if (dependency !== packageName) {
            dependencies.add(dependency);
        }
        // TODO: else throw new Error(`Package ${packageName} references itself. (via ${src.fileName})`);
    }
    for (const sourceFile of all.values()) {
        for (const ref of imports(sourceFile)) {
            addDependency(ref);
        }
        for (const ref of sourceFile.typeReferenceDirectives) {
            addDependency(ref.fileName);
        }
        if (ts.isExternalModule(sourceFile)) {
            if (sourceFileExportsSomething(sourceFile)) {
                declaredModules.push(properModuleName(packageName, sourceFile.fileName));
                const namespaceExport = sourceFile.statements.find(ts.isNamespaceExportDeclaration);
                if (namespaceExport) {
                    globals.add(namespaceExport.name.text);
                }
            }
        }
        else {
            for (const node of sourceFile.statements) {
                switch (node.kind) {
                    case ts.SyntaxKind.ModuleDeclaration: {
                        const decl = node;
                        const name = decl.name.text;
                        if (decl.name.kind === ts.SyntaxKind.StringLiteral) {
                            declaredModules.push(assertNoWindowsSlashes(packageName, name));
                        }
                        else if (isValueNamespace(decl)) {
                            globals.add(name);
                        }
                        break;
                    }
                    case ts.SyntaxKind.VariableStatement:
                        for (const decl of node.declarationList.declarations) {
                            if (decl.name.kind === ts.SyntaxKind.Identifier) {
                                globals.add(decl.name.text);
                            }
                        }
                        break;
                    case ts.SyntaxKind.EnumDeclaration:
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.FunctionDeclaration: {
                        // Deliberately not doing this for types, because those won't show up in JS code and can't be used for ATA
                        const nameNode = node.name;
                        if (nameNode) {
                            globals.add(nameNode.text);
                        }
                        break;
                    }
                    case ts.SyntaxKind.ImportEqualsDeclaration:
                    case ts.SyntaxKind.InterfaceDeclaration:
                    case ts.SyntaxKind.TypeAliasDeclaration:
                        break;
                    default:
                        throw new Error(`Unexpected node kind ${ts.SyntaxKind[node.kind]}`);
                }
            }
        }
    }
    return { dependencies, declaredModules, globals: util_1.sort(globals) };
}
exports.getModuleInfo = getModuleInfo;
/**
 * A file is a proper module if it is an external module *and* it has at least one export.
 * A module with only imports is not a proper module; it likely just augments some other module.
 */
function sourceFileExportsSomething({ statements }) {
    return statements.some(statement => {
        switch (statement.kind) {
            case ts.SyntaxKind.ImportEqualsDeclaration:
            case ts.SyntaxKind.ImportDeclaration:
                return false;
            case ts.SyntaxKind.ModuleDeclaration:
                return statement.name.kind === ts.SyntaxKind.Identifier;
            default:
                return true;
        }
    });
}
/**
 * Given a file name, get the name of the module it declares.
 * `foo/index.d.ts` declares "foo", `foo/bar.d.ts` declares "foo/bar", "foo/bar/index.d.ts" declares "foo/bar"
 */
function properModuleName(folderName, fileName) {
    const part = path.basename(fileName) === "index.d.ts" ? path.dirname(fileName) : withoutExtension(fileName, ".d.ts");
    return part === "." ? folderName : util_1.joinPaths(folderName, part);
}
/**
 * "foo/bar/baz" -> "foo"; "@foo/bar/baz" -> "@foo/bar"
 * Note: Throws an error for references like
 */
function rootName(importText, typeFiles) {
    let slash = importText.indexOf("/");
    // Root of `@foo/bar/baz` is `@foo/bar`
    if (importText.startsWith("@")) {
        // Use second "/"
        slash = importText.indexOf("/", slash + 1);
    }
    const root = importText.slice(0, slash);
    const postImport = importText.slice(slash + 1);
    if (slash > -1 && postImport.match(/v\d+$/) && !typeFiles.has(postImport + ".d.ts")) {
        throw new Error(`${importText}: do not directly import specific versions of another types package.
You should work with the latest version of ${root} instead.`);
    }
    return slash === -1 ? importText : root;
}
function withoutExtension(str, ext) {
    assert(str.endsWith(ext));
    return str.slice(0, str.length - ext.length);
}
/** Returns a map from filename (path relative to `directory`) to the SourceFile we parsed for it. */
function allReferencedFiles(entryFilenames, fs, packageName, baseDirectory) {
    const seenReferences = new Set();
    const types = new Map();
    const tests = new Map();
    entryFilenames.forEach(text => recur({ text, exact: true }));
    return { types, tests };
    function recur({ text, exact }) {
        if (seenReferences.has(text)) {
            return;
        }
        seenReferences.add(text);
        const resolvedFilename = exact ? text : resolveModule(text, fs);
        if (fs.exists(resolvedFilename)) {
            const src = createSourceFile(resolvedFilename, definition_parser_1.readFileAndThrowOnBOM(resolvedFilename, fs));
            if (resolvedFilename.endsWith(".d.ts")) {
                types.set(resolvedFilename, src);
            }
            else {
                tests.set(resolvedFilename, src);
            }
            const refs = findReferencedFiles(src, packageName, path.dirname(resolvedFilename), util_1.normalizeSlashes(path.relative(baseDirectory, fs.debugPath())));
            refs.forEach(recur);
        }
    }
}
exports.allReferencedFiles = allReferencedFiles;
function resolveModule(importSpecifier, fs) {
    importSpecifier = importSpecifier.endsWith("/") ? importSpecifier.slice(0, importSpecifier.length - 1) : importSpecifier;
    if (importSpecifier !== "." && importSpecifier !== "..") {
        if (fs.exists(importSpecifier + ".d.ts")) {
            return importSpecifier + ".d.ts";
        }
        else if (fs.exists(importSpecifier + ".ts")) {
            return importSpecifier + ".ts";
        }
        else if (fs.exists(importSpecifier + ".tsx")) {
            return importSpecifier + ".tsx";
        }
    }
    return importSpecifier === "." ? "index.d.ts" : util_1.joinPaths(importSpecifier, "index.d.ts");
}
/**
 * @param subDirectory The specific directory within the DefinitelyTyped directory we are in.
 * For example, `baseDirectory` may be `react-router` and `subDirectory` may be `react-router/lib`.
 * versionsBaseDirectory may be "" when not in typesVersions or ".." when inside `react-router/ts3.1`
 */
function findReferencedFiles(src, packageName, subDirectory, baseDirectory) {
    const refs = [];
    for (const ref of src.referencedFiles) {
        // Any <reference path="foo"> is assumed to be local
        addReference({ text: ref.fileName, exact: true });
    }
    for (const ref of src.typeReferenceDirectives) {
        // only <reference types="../packagename/x" /> references are local (or "packagename/x", though in 3.7 that doesn't work in DT).
        if (ref.fileName.startsWith("../" + packageName + "/")) {
            addReference({ text: ref.fileName, exact: false });
        }
        else if (ref.fileName.startsWith(packageName + "/")) {
            addReference({ text: convertToRelativeReference(ref.fileName), exact: false });
        }
    }
    for (const ref of imports(src)) {
        if (ref.startsWith(".")) {
            addReference({ text: ref, exact: false });
        }
        if (ref.startsWith(packageName + "/")) {
            addReference({ text: convertToRelativeReference(ref), exact: false });
        }
    }
    return refs;
    function addReference(ref) {
        // `path.normalize` may add windows slashes
        const full = util_1.normalizeSlashes(path.normalize(util_1.joinPaths(subDirectory, assertNoWindowsSlashes(src.fileName, ref.text))));
        // allow files in typesVersions directories (i.e. 'ts3.1') to reference files in parent directory
        if (full.startsWith("../" + packageName + "/")) {
            ref.text = full.slice(4 + packageName.length);
            refs.push(ref);
            return;
        }
        else if (full.startsWith("..")
            && (baseDirectory === "" || path.normalize(util_1.joinPaths(baseDirectory, full)).startsWith(".."))) {
            throw new Error(`${src.fileName}: ` +
                'Definitions must use global references to other packages, not parent ("../xxx") references.' +
                `(Based on reference '${ref.text}')`);
        }
        ref.text = full;
        refs.push(ref);
    }
    /** boring/foo -> ./foo when subDirectory === '.'; ../foo when it's === 'x'; ../../foo when it's 'x/y' */
    function convertToRelativeReference(name) {
        const relative = "." + "/..".repeat(subDirectory === "." ? 0 : subDirectory.split("/").length);
        return relative + name.slice(packageName.length);
    }
}
/**
 * All strings referenced in `import` statements.
 * Does *not* include <reference> directives.
 */
function* imports({ statements }) {
    for (const node of statements) {
        switch (node.kind) {
            case ts.SyntaxKind.ImportDeclaration:
            case ts.SyntaxKind.ExportDeclaration: {
                const { moduleSpecifier } = node;
                if (moduleSpecifier && moduleSpecifier.kind === ts.SyntaxKind.StringLiteral) {
                    yield moduleSpecifier.text;
                }
                break;
            }
            case ts.SyntaxKind.ImportEqualsDeclaration: {
                const { moduleReference } = node;
                if (moduleReference.kind === ts.SyntaxKind.ExternalModuleReference) {
                    yield parseRequire(moduleReference);
                }
                break;
            }
            case ts.SyntaxKind.ModuleDeclaration: {
                const { name, body } = node;
                if (name.kind === ts.SyntaxKind.StringLiteral && body) {
                    yield* imports(body);
                }
                break;
            }
            default:
        }
    }
}
function parseRequire(reference) {
    const { expression } = reference;
    if (!expression || !ts.isStringLiteral(expression)) {
        throw new Error(`Bad 'import =' reference: ${reference.getText()}`);
    }
    return expression.text;
}
function isValueNamespace(ns) {
    if (!ns.body) {
        throw new Error("@types should not use shorthand ambient modules");
    }
    return ns.body.kind === ts.SyntaxKind.ModuleDeclaration
        ? isValueNamespace(ns.body)
        : ns.body.statements.some(statementDeclaresValue);
}
function statementDeclaresValue(statement) {
    switch (statement.kind) {
        case ts.SyntaxKind.VariableStatement:
        case ts.SyntaxKind.ClassDeclaration:
        case ts.SyntaxKind.FunctionDeclaration:
        case ts.SyntaxKind.EnumDeclaration:
            return true;
        case ts.SyntaxKind.ModuleDeclaration:
            return isValueNamespace(statement);
        case ts.SyntaxKind.InterfaceDeclaration:
        case ts.SyntaxKind.TypeAliasDeclaration:
        case ts.SyntaxKind.ImportEqualsDeclaration:
            return false;
        default:
            throw new Error(`Forgot to implement ambient namespace statement ${ts.SyntaxKind[statement.kind]}`);
    }
}
function assertNoWindowsSlashes(packageName, fileName) {
    if (util_1.hasWindowsSlashes(fileName)) {
        throw new Error(`In ${packageName}: Use forward slash instead when referencing ${fileName}`);
    }
    return fileName;
}
function getTestDependencies(packageName, typeFiles, testFiles, dependencies, fs) {
    const testDependencies = new Set();
    for (const filename of testFiles) {
        const content = definition_parser_1.readFileAndThrowOnBOM(filename, fs);
        const sourceFile = createSourceFile(filename, content);
        const { fileName, referencedFiles, typeReferenceDirectives } = sourceFile;
        const filePath = () => path.join(packageName, fileName);
        for (const { fileName: ref } of referencedFiles) {
            throw new Error(`Test files should not use '<reference path="" />'. '${filePath()}' references '${ref}'.`);
        }
        for (const { fileName: referencedPackage } of typeReferenceDirectives) {
            if (dependencies.has(referencedPackage)) {
                throw new Error(`'${filePath()}' unnecessarily references '${referencedPackage}', which is already referenced in the type definition.`);
            }
            if (referencedPackage === packageName) {
                throw new Error(`'${filePath()}' unnecessarily references the package. This can be removed.`);
            }
            testDependencies.add(referencedPackage);
        }
        for (const imported of imports(sourceFile)) {
            if (!imported.startsWith(".")) {
                const dep = rootName(imported, typeFiles);
                if (!dependencies.has(dep) && dep !== packageName) {
                    testDependencies.add(dep);
                }
            }
        }
    }
    return testDependencies;
}
exports.getTestDependencies = getTestDependencies;
function createSourceFile(filename, content) {
    return ts.createSourceFile(filename, content, ts.ScriptTarget.Latest, /*setParentNodes*/ false);
}
exports.createSourceFile = createSourceFile;
//# sourceMappingURL=module-info.js.map