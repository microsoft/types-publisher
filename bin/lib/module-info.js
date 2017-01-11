"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const assert = require("assert");
const path = require("path");
const ts = require("typescript");
const ts_1 = require("../util/ts");
const util_1 = require("../util/util");
const definition_parser_1 = require("./definition-parser");
function getModuleInfo(packageName, directory, allEntryFilenames, log) {
    return __awaiter(this, void 0, void 0, function* () {
        let hasUmdDecl = false;
        let hasGlobalDeclarations = false;
        let ambientModuleCount = 0;
        const dependencies = new Set();
        const declaredModules = [];
        const globals = new Set();
        const all = yield allReferencedFiles(directory, allEntryFilenames, log);
        for (const src of all.values()) {
            const isExternal = ts_1.isExternalModule(src);
            // A file is a proper module if it is an external module *and* it has at least one export.
            // A module with only imports is not a proper module; it likely just augments some other module.
            let hasAnyExport = false;
            function addDependency(dependency) {
                if (dependency !== packageName) {
                    dependencies.add(dependency);
                }
                // TODO: else throw new Error(`Package ${packageName} references itself. (via ${src.fileName})`);
            }
            for (const ref of imports(src)) {
                if (!ref.startsWith(".")) {
                    const importedModule = rootName(ref);
                    addDependency(importedModule);
                    log(`Found import declaration from \`"${importedModule}"\``);
                }
            }
            for (const ref of src.typeReferenceDirectives) {
                addDependency(ref.fileName);
            }
            for (const node of src.statements) {
                switch (node.kind) {
                    case ts.SyntaxKind.NamespaceExportDeclaration:
                        const globalName = node.name.getText();
                        log(`Found UMD module declaration for global \`${globalName}\``);
                        // Don't set hasGlobalDeclarations = true even though we add a symbol here
                        // since this is still a legal module-only declaration
                        globals.add(globalName);
                        hasAnyExport = true;
                        hasUmdDecl = true;
                        break;
                    case ts.SyntaxKind.ModuleDeclaration:
                        if (isExternal) {
                            log(`Found exported namespace \`${node.name.getText()}\``);
                            hasAnyExport = true;
                        }
                        else {
                            const nameKind = node.name.kind;
                            if (nameKind === ts.SyntaxKind.StringLiteral) {
                                // If we're in an external module, this is an augmentation, not a declaration.
                                if (!ts_1.isExternalModule(src)) {
                                    const name = util_1.stripQuotes(node.name.getText());
                                    noWindowsSlashes(packageName, name);
                                    declaredModules.push(name);
                                    log(`Found ambient external module \`"${name}"\``);
                                    ambientModuleCount++;
                                }
                            }
                            else {
                                const moduleName = node.name.getText();
                                log(`Found global namespace declaration \`${moduleName}\``);
                                hasGlobalDeclarations = true;
                                if (isValueNamespace(node)) {
                                    globals.add(moduleName);
                                }
                            }
                        }
                        break;
                    case ts.SyntaxKind.VariableStatement:
                        if (isExternal) {
                            log("Found exported variables");
                            hasAnyExport = true;
                        }
                        else {
                            node.declarationList.declarations.forEach(decl => {
                                const declName = decl.name.getText();
                                log(`Found global variable \`${declName}\``);
                                globals.add(declName);
                            });
                            hasGlobalDeclarations = true;
                        }
                        break;
                    case ts.SyntaxKind.InterfaceDeclaration:
                    case ts.SyntaxKind.TypeAliasDeclaration:
                    case ts.SyntaxKind.EnumDeclaration:
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.FunctionDeclaration:
                        // If these nodes have an 'export' modifier, the file is an external module
                        if (isExternal) {
                            const declName = node.name;
                            if (declName) {
                                log(`Found exported declaration "${declName.getText()}"`);
                            }
                            hasAnyExport = true;
                        }
                        else {
                            const declName = node.name.getText();
                            const isType = node.kind === ts.SyntaxKind.InterfaceDeclaration || node.kind === ts.SyntaxKind.TypeAliasDeclaration;
                            log(`Found global ${isType ? "type" : "value"} declaration "${declName}"`);
                            if (!isType) {
                                globals.add(declName);
                            }
                            hasGlobalDeclarations = true;
                        }
                        break;
                    case ts.SyntaxKind.ExportDeclaration:
                    case ts.SyntaxKind.ExportAssignment:
                        // These nodes always indicate an external module
                        log(`Found export assignment or export declaration`);
                        hasAnyExport = true;
                        break;
                    case ts.SyntaxKind.ImportEqualsDeclaration:
                    case ts.SyntaxKind.ImportDeclaration:
                        // Already handled these in `imports`
                        break;
                    default:
                        throw new Error(`Bad node in ${util_1.joinPaths(directory, src.fileName)}: '${node.getText()}' is of kind ${ts.SyntaxKind[node.kind]}`);
                }
            }
            const isProperModule = isExternal && hasAnyExport;
            if (isProperModule) {
                declaredModules.push(properModuleName(packageName, src.fileName));
            }
        }
        return {
            declFiles: util_1.sort(all.keys()),
            dependencies,
            declaredModules,
            globals: util_1.sort(globals)
        };
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getModuleInfo;
/**
 * Given a file name, get the name of the module it declares.
 * `foo/index.d.ts` declares "foo", `foo/bar.d.ts` declares "foo/bar", "foo/bar/index.d.ts" declares "foo/bar"
 */
function properModuleName(folderName, fileName) {
    const part = path.basename(fileName) === "index.d.ts" ? path.dirname(fileName) : withoutExtension(fileName, ".d.ts");
    return util_1.joinPaths(folderName, part);
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
function allReferencedFiles(directory, entryFilenames, log) {
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
                log(`Parse ${resolvedFilename}`);
                const src = ts.createSourceFile(resolvedFilename, content, ts.ScriptTarget.Latest, true);
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
            const dts = filename + ".d.ts";
            return { resolvedFilename: dts, content: yield definition_parser_1.readFile(directory, dts) };
        }
        catch (_) {
            const index = util_1.joinPaths(filename, "index.d.ts");
            return { resolvedFilename: index, content: yield readFileAndReportErrors(referencedFrom, directory, filename, index) };
        }
    });
}
function readFileAndReportErrors(referencedFrom, directory, referenceText, filename) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield definition_parser_1.readFile(directory, filename);
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
    const out = [];
    for (const ref of src.referencedFiles) {
        // Any <reference path="foo"> is assumed to be local
        yield addReference({ text: ref.fileName, exact: true });
    }
    for (const ref of imports(src)) {
        if (ref.startsWith(".")) {
            yield addReference({ text: ref, exact: false });
        }
    }
    return out;
    function addReference({ exact, text }) {
        noWindowsSlashes(src.fileName, text);
        let full = path.normalize(util_1.joinPaths(subDirectory, text));
        // `path.normalize` may add windows slashes
        full = util_1.normalizeSlashes(full);
        if (full.startsWith(".")) {
            throw new Error(`In ${directory} ${src.fileName}: Definitions must use global references, not parent references. (Based on reference '${text}')`);
        }
        return { exact, text: full };
    }
}
/**
 * All strings referenced in `import` statements.
 * Does *not* include <reference> directives.
 */
function imports(src) {
    const out = [];
    findImports(src.statements);
    return out;
    function findImports(statements) {
        for (const node of statements) {
            switch (node.kind) {
                case ts.SyntaxKind.ImportDeclaration:
                case ts.SyntaxKind.ExportDeclaration: {
                    const decl = node;
                    if (decl.moduleSpecifier && decl.moduleSpecifier.kind === ts.SyntaxKind.StringLiteral) {
                        out.push(util_1.stripQuotes(decl.moduleSpecifier.getText()));
                    }
                    break;
                }
                case ts.SyntaxKind.ImportEqualsDeclaration: {
                    const decl = node;
                    if (decl.moduleReference.kind === ts.SyntaxKind.ExternalModuleReference) {
                        out.push(parseRequire(decl.moduleReference));
                    }
                    break;
                }
                case ts.SyntaxKind.ModuleDeclaration: {
                    const decl = node;
                    if (decl.name.kind === ts.SyntaxKind.StringLiteral) {
                        findImports(decl.body.statements);
                    }
                    break;
                }
                default:
            }
        }
    }
    function parseRequire(reference) {
        const expr = reference.expression;
        if (!expr || expr.kind !== ts.SyntaxKind.StringLiteral) {
            throw new Error(`Bad 'import =' reference: ${reference.getText()}`);
        }
        return expr.text;
    }
}
function isValueNamespace(ns) {
    if (!ns.body) {
        throw new Error("@types should not use shorthand ambient modules");
    }
    if (ns.body.kind === ts.SyntaxKind.ModuleDeclaration) {
        return isValueNamespace(ns.body);
    }
    return ns.body.statements.some(statementDeclaresValue);
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
function noWindowsSlashes(packageName, fileName) {
    if (util_1.hasWindowsSlashes(fileName)) {
        throw new Error(`In ${packageName}: Use forward slash instead when referencing ${fileName}`);
    }
}
//# sourceMappingURL=module-info.js.map