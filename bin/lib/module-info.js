"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const path = require("path");
const ts = require("typescript");
const util_1 = require("../util/util");
const definition_parser_1 = require("./definition-parser");
function getModuleInfo(packageName, directory, allEntryFilenames) {
    return __awaiter(this, void 0, void 0, function* () {
        const all = yield allReferencedFiles(directory, allEntryFilenames);
        const dependencies = new Set();
        const declaredModules = [];
        const globals = new Set();
        function addDependency(dependency) {
            if (dependency !== packageName) {
                dependencies.add(dependency);
            }
            // TODO: else throw new Error(`Package ${packageName} references itself. (via ${src.fileName})`);
        }
        for (const sourceFile of all.values()) {
            for (const ref of imports(sourceFile)) {
                if (!ref.startsWith(".")) {
                    addDependency(rootName(ref));
                }
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
                        }
                    }
                }
            }
        }
        return { declFiles: util_1.sort(all.keys()), dependencies, declaredModules, globals: util_1.sort(globals) };
    });
}
exports.default = getModuleInfo;
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
/** Given "foo/bar/baz", return "foo". */
function rootName(importText) {
    let slash = importText.indexOf("/");
    // Root of `@foo/bar/baz` is `@foo/bar`
    if (importText.startsWith("@")) {
        // Use second "/"
        slash = importText.indexOf("/", slash + 1);
    }
    return slash === -1 ? importText : importText.slice(0, slash);
}
function withoutExtension(str, ext) {
    assert(str.endsWith(ext));
    return str.slice(0, str.length - ext.length);
}
/** Returns a map from filename (path relative to `directory`) to the SourceFile we parsed for it. */
function allReferencedFiles(directory, entryFilenames) {
    return __awaiter(this, void 0, void 0, function* () {
        const seenReferences = new Set();
        const all = new Map();
        function recur(referencedFrom, { text, exact }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (seenReferences.has(text)) {
                    return;
                }
                seenReferences.add(text);
                const { resolvedFilename, content } = exact
                    ? { resolvedFilename: text, content: yield readFileAndReportErrors(referencedFrom, directory, text, text) }
                    : yield resolveModule(referencedFrom, directory, text);
                const src = createSourceFile(resolvedFilename, content);
                all.set(resolvedFilename, src);
                const refs = referencedFiles(src, path.dirname(resolvedFilename), directory);
                yield Promise.all(Array.from(refs).map(ref => recur(resolvedFilename, ref)));
            });
        }
        yield Promise.all(entryFilenames.map(filename => recur("tsconfig.json", { text: filename, exact: true })));
        return all;
    });
}
function resolveModule(referencedFrom, directory, filename) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const dts = `${filename}.d.ts`;
            return { resolvedFilename: dts, content: yield definition_parser_1.readFileAndThrowOnBOM(directory, dts) };
        }
        catch (_) {
            const index = util_1.joinPaths(filename.endsWith("/") ? filename.slice(0, filename.length - 1) : filename, "index.d.ts");
            const resolvedFilename = index === "./index.d.ts" ? "index.d.ts" : index;
            return { resolvedFilename, content: yield readFileAndReportErrors(referencedFrom, directory, filename, index) };
        }
    });
}
function readFileAndReportErrors(referencedFrom, directory, referenceText, filename) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield definition_parser_1.readFileAndThrowOnBOM(directory, filename);
        }
        catch (err) {
            console.error(`In ${directory}, ${referencedFrom} references ${referenceText}, which can't be read.`);
            throw err;
        }
    });
}
/**
 * @param subDirectory The specific directory within the DefinitelyTyped directory we are in.
 * For example, `directory` may be `react-router` and `subDirectory` may be `react-router/lib`.
 */
function* referencedFiles(src, subDirectory, directory) {
    for (const ref of src.referencedFiles) {
        // Any <reference path="foo"> is assumed to be local
        yield addReference({ text: ref.fileName, exact: true });
    }
    for (const ref of imports(src)) {
        if (ref.startsWith(".")) {
            yield addReference({ text: ref, exact: false });
        }
    }
    function addReference({ exact, text }) {
        // `path.normalize` may add windows slashes
        const full = util_1.normalizeSlashes(path.normalize(util_1.joinPaths(subDirectory, assertNoWindowsSlashes(src.fileName, text))));
        if (full.startsWith("..")) {
            throw new Error(`In ${directory} ${src.fileName}: ` +
                'Definitions must use global references to other packages, not parent ("../xxx") references.' +
                `(Based on reference '${text}')`);
        }
        return { exact, text: full };
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
                if (name.kind === ts.SyntaxKind.StringLiteral) {
                    yield* imports(body);
                }
            }
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
function getTestDependencies(pkgName, directory, testFiles, dependencies) {
    return __awaiter(this, void 0, void 0, function* () {
        const testDependencies = new Set();
        for (const filename of testFiles) {
            const content = yield definition_parser_1.readFileAndThrowOnBOM(directory, filename);
            const sourceFile = createSourceFile(filename, content);
            const { fileName, referencedFiles, typeReferenceDirectives } = sourceFile;
            const filePath = () => path.join(pkgName, fileName);
            for (const { fileName: ref } of referencedFiles) {
                throw new Error(`Test files should not use '<reference path="" />'. '${filePath()}' references '${ref}'.`);
            }
            for (const { fileName: referencedPackage } of typeReferenceDirectives) {
                if (dependencies.has(referencedPackage)) {
                    throw new Error(`'${filePath()}' unnecessarily references '${referencedPackage}', which is already referenced in the type definition.`);
                }
                if (referencedPackage === pkgName) {
                    throw new Error(`'${filePath()}' unnecessarily references the package. This can be removed.`);
                }
                testDependencies.add(referencedPackage);
            }
            for (const imported of imports(sourceFile)) {
                if (!imported.startsWith(".") && !dependencies.has(imported) && imported !== pkgName) {
                    testDependencies.add(imported);
                }
            }
        }
        return testDependencies;
    });
}
exports.getTestDependencies = getTestDependencies;
function createSourceFile(filename, content) {
    return ts.createSourceFile(filename, content, ts.ScriptTarget.Latest, /*setParentNodes*/ false);
}
//# sourceMappingURL=module-info.js.map