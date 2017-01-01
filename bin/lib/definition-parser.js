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
const ts = require("typescript");
const fsp = require("fs-promise");
const path = require("path");
const io_1 = require("../util/io");
const logging_1 = require("../util/logging");
const ts_1 = require("../util/ts");
const util_1 = require("../util/util");
const common_1 = require("./common");
const packages_1 = require("./packages");
const header_1 = require("./header");
var DeclarationFlags;
(function (DeclarationFlags) {
    DeclarationFlags[DeclarationFlags["None"] = 0] = "None";
    DeclarationFlags[DeclarationFlags["Value"] = 1] = "Value";
    DeclarationFlags[DeclarationFlags["Type"] = 2] = "Type";
    DeclarationFlags[DeclarationFlags["Namespace"] = 4] = "Namespace";
    DeclarationFlags[DeclarationFlags["Augmentation"] = 8] = "Augmentation";
})(DeclarationFlags || (DeclarationFlags = {}));
function getNamespaceFlags(ns) {
    let result = DeclarationFlags.None;
    if (!ns.body) {
        throw new Error("@types should not use shorthand ambient modules");
    }
    if (ns.body.kind === ts.SyntaxKind.ModuleDeclaration) {
        return getNamespaceFlags(ns.body);
    }
    ns.body.statements.forEach(child => {
        switch (child.kind) {
            case ts.SyntaxKind.VariableStatement:
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.EnumDeclaration:
                result |= DeclarationFlags.Value;
                break;
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.TypeAliasDeclaration:
            case ts.SyntaxKind.ImportEqualsDeclaration:
                result |= DeclarationFlags.Type;
                break;
            case ts.SyntaxKind.ModuleDeclaration:
                result |= getNamespaceFlags(child);
                break;
            default:
                console.log(`Forgot to implement ambient namespace statement ${ts.SyntaxKind[child.kind]}`);
        }
    });
    return result;
}
function getTypingInfo(folderName, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLogger();
        const directory = packages_1.definitelyTypedPath(folderName, options);
        if (folderName !== folderName.toLowerCase()) {
            throw new Error(`Package name \`${folderName}\` should be strictly lowercase`);
        }
        log(`Reading contents of ${directory}`);
        // There is a *single* main file, containing metadata comments.
        // But there may be many entryFilenames, which are the starting points of inferring all files to be included.
        const mainFilename = "index.d.ts";
        const mainFileContent = yield readFile(directory, mainFilename);
        const { authors, libraryMajorVersion, libraryMinorVersion, typeScriptVersion, libraryName, projects } = header_1.parseHeaderOrFail(mainFileContent, folderName);
        const allEntryFilenames = (yield entryFilesFromTsConfig(directory, log)) || [mainFilename];
        const { referencedLibraries, moduleDependencies, globalSymbols, declaredModules, declFiles } = yield getModuleInfo(directory, folderName, allEntryFilenames, log);
        const hasPackageJson = yield fsp.exists(path.join(directory, "package.json"));
        const allFiles = hasPackageJson ? declFiles.concat(["package.json"]) : declFiles;
        const sourceRepoURL = "https://www.github.com/DefinitelyTyped/DefinitelyTyped";
        const data = {
            authors: authors.map(a => `${a.name} <${a.url}>`).join(", "),
            libraryDependencies: referencedLibraries,
            moduleDependencies,
            libraryMajorVersion,
            libraryMinorVersion,
            typeScriptVersion,
            libraryName,
            typingsPackageName: folderName,
            projectName: projects[0],
            sourceRepoURL,
            sourceBranch: common_1.settings.sourceBranch,
            globals: Object.keys(globalSymbols).filter(k => !!(globalSymbols[k] & DeclarationFlags.Value)).sort(),
            declaredModules,
            files: declFiles,
            hasPackageJson,
            contentHash: yield hash(directory, allFiles)
        };
        return { data, logs: logResult() };
    });
}
exports.getTypingInfo = getTypingInfo;
function entryFilesFromTsConfig(directory, log) {
    return __awaiter(this, void 0, void 0, function* () {
        // If there is a tsconfig.json with a "files" property use this as the entry point
        if (yield fsp.exists(path.join(directory, "tsconfig.json"))) {
            const files = JSON.parse(yield readFile(directory, "tsconfig.json")).files;
            if (files) {
                const filenames = files.filter(file => file.endsWith(".d.ts"));
                log(`Found ${filenames.length} '.d.ts' files listed in tsconfig.json (${filenames.join(", ")})`);
                return filenames;
            }
        }
        return undefined;
    });
}
// See GH#68 for why we don't just include every file
/** Returns a map from filename (path relative to `directory`) to the SourceFile we parsed for it. */
function allReferencedFiles(directory, entryFilenames, log) {
    return __awaiter(this, void 0, void 0, function* () {
        const all = new Map();
        function recur(referencedFrom, filename) {
            return __awaiter(this, void 0, void 0, function* () {
                if (all.has(filename)) {
                    return;
                }
                // Placeholder so no other thread will pick up this filename
                all.set(filename, undefined);
                log(`Parse ${filename}`);
                let content;
                try {
                    content = yield readFile(directory, filename);
                }
                catch (err) {
                    throw new Error(`In ${directory}, ${referencedFrom} references ${filename}, which does not exist.`);
                }
                const src = ts.createSourceFile(filename, content, ts.ScriptTarget.Latest, true);
                all.set(filename, src);
                const refs = referencedFiles(src, path.dirname(filename), directory);
                yield Promise.all(refs.map(ref => recur(filename, ref)));
            });
        }
        yield Promise.all(entryFilenames.map(filename => recur("", filename)));
        return all;
    });
}
/**
 * @param subDirectory The specific directory within the DefinitelyTyped directory we are in.
 * For example, `directory` may be `react-router` and `subDirectory` may be `react-router/lib`.
 */
function referencedFiles(src, subDirectory, directory) {
    const out = [];
    for (const ref of src.referencedFiles) {
        // Any <reference path="foo"> is assumed to be local
        addReference(ref.fileName);
    }
    for (const ref of imports(src)) {
        if (ref.startsWith(".")) {
            addReference(`${ref}.d.ts`);
        }
    }
    return out;
    function addReference(ref) {
        const full = path.normalize(path.join(subDirectory, ref));
        // If the *normalized* path starts with "..", then it reaches outside of srcDirectory.
        if (full.startsWith("..")) {
            throw new Error(`In ${directory} ${src.fileName}: Definitions must use global references rather than reaching outside of their directory.`);
        }
        out.push(full);
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
                        out.push(parseRequire(decl.moduleReference.getText()));
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
    function parseRequire(text) {
        const match = /require\(["'](.*)["']\)/.exec(text);
        if (match === null) {
            throw new Error(`Failed to parse import = declaration "${text}"`);
        }
        return match[1];
    }
}
function getModuleInfo(directory, folderName, allEntryFilenames, log) {
    return __awaiter(this, void 0, void 0, function* () {
        let hasUmdDecl = false;
        let hasGlobalDeclarations = false;
        let ambientModuleCount = 0;
        const moduleDependencies = new Set();
        const referencedLibraries = new Set();
        const declaredModules = [];
        let globalSymbols = {};
        function recordSymbol(name, flags) {
            globalSymbols[name] = (globalSymbols[name] || DeclarationFlags.None) | flags;
        }
        const all = yield allReferencedFiles(directory, allEntryFilenames, log);
        for (const src of all.values()) {
            const isExternal = ts_1.isExternalModule(src);
            // A file is a proper module if it is an external module *and* it has at least one export.
            // A module with only imports is not a proper module; it likely just augments some other module.
            let hasAnyExport = false;
            for (const ref of imports(src)) {
                if (!ref.startsWith(".")) {
                    const importedModule = rootName(ref);
                    moduleDependencies.add(importedModule);
                    log(`Found import declaration from \`"${importedModule}"\``);
                }
            }
            src.typeReferenceDirectives.forEach(ref => referencedLibraries.add(ref.fileName));
            for (const node of src.statements) {
                switch (node.kind) {
                    case ts.SyntaxKind.NamespaceExportDeclaration:
                        const globalName = node.name.getText();
                        log(`Found UMD module declaration for global \`${globalName}\``);
                        // Don't set hasGlobalDeclarations = true even though we add a symbol here
                        // since this is still a legal module-only declaration
                        globalSymbols[globalName] = ts.SymbolFlags.Value;
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
                                    declaredModules.push(name);
                                    log(`Found ambient external module \`"${name}"\``);
                                    ambientModuleCount++;
                                }
                            }
                            else {
                                const moduleName = node.name.getText();
                                log(`Found global namespace declaration \`${moduleName}\``);
                                hasGlobalDeclarations = true;
                                recordSymbol(moduleName, getNamespaceFlags(node));
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
                                recordSymbol(declName, DeclarationFlags.Value);
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
                            recordSymbol(declName, isType ? DeclarationFlags.Type : DeclarationFlags.Value);
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
                        throw new Error(`Bad node in ${path.join(directory, src.fileName)}: '${node.getText()}' is of kind ${ts.SyntaxKind[node.kind]}`);
                }
            }
            const isProperModule = isExternal && hasAnyExport;
            if (isProperModule) {
                declaredModules.push(properModuleName(folderName, src.fileName));
            }
        }
        // Some files may reference the main module, but don't include that as a real dependency.
        referencedLibraries.delete(folderName);
        moduleDependencies.delete(folderName);
        return {
            declFiles: arrayOf(all.keys()),
            referencedLibraries: arrayOf(referencedLibraries),
            moduleDependencies: arrayOf(moduleDependencies),
            declaredModules, globalSymbols
        };
        function arrayOf(strings) {
            return Array.from(strings).sort();
        }
    });
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
/**
 * Given a file name, get the name of the module it declares.
 * `foo/index.d.ts` declares "foo", `foo/bar.d.ts` declares "foo/bar", "foo/bar/index.d.ts" declares "foo/bar"
 */
function properModuleName(folderName, fileName) {
    const part = path.basename(fileName) === "index.d.ts" ? path.dirname(fileName) : withoutExtension(fileName, ".d.ts");
    return path.join(folderName, part);
}
function withoutExtension(str, ext) {
    assert(str.endsWith(ext));
    return str.slice(0, str.length - ext.length);
}
function hash(directory, files) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileContents = yield util_1.mapAsyncOrdered(files, (f) => __awaiter(this, void 0, void 0, function* () { return f + "**" + (yield readFile(directory, f)); }));
        const allContent = fileContents.join("||");
        return util_1.computeHash(allContent);
    });
}
function readFile(directory, fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const full = path.join(directory, fileName);
        const text = yield io_1.readFile(full);
        if (text.charCodeAt(0) === 0xFEFF) {
            const commands = [
                "npm install -g strip-bom-cli",
                `strip-bom ${fileName} > fix`,
                `mv fix ${fileName}`
            ];
            throw new Error(`File '${full}' has a BOM. Try using:\n${commands.join("\n")}`);
        }
        return text;
    });
}
//# sourceMappingURL=definition-parser.js.map