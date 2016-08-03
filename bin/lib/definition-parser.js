"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const ts = require("typescript");
const fsp = require("fs-promise");
const path = require("path");
const common_1 = require("./common");
const util_1 = require("./util");
var DefinitionFileKind;
(function (DefinitionFileKind) {
    // Dunno
    DefinitionFileKind[DefinitionFileKind["Unknown"] = 0] = "Unknown";
    // UMD module file
    DefinitionFileKind[DefinitionFileKind["UMD"] = 1] = "UMD";
    // File has global variables or interfaces, but not any external modules
    DefinitionFileKind[DefinitionFileKind["Global"] = 2] = "Global";
    // File has top-level export declarations
    DefinitionFileKind[DefinitionFileKind["ProperModule"] = 3] = "ProperModule";
    // File has a single declare module "foo" but no global interfaces or variables
    DefinitionFileKind[DefinitionFileKind["DeclareModule"] = 4] = "DeclareModule";
    // Some combination of Global and DeclareModule
    DefinitionFileKind[DefinitionFileKind["Mixed"] = 5] = "Mixed";
    // More than one 'declare module "foo"'
    DefinitionFileKind[DefinitionFileKind["MultipleModules"] = 6] = "MultipleModules";
    // Augments an external module
    DefinitionFileKind[DefinitionFileKind["ModuleAugmentation"] = 7] = "ModuleAugmentation";
    // Old-style UMD
    DefinitionFileKind[DefinitionFileKind["OldUMD"] = 8] = "OldUMD";
})(DefinitionFileKind || (DefinitionFileKind = {}));
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
function getTypingInfo(folderName) {
    return __awaiter(this, void 0, void 0, function* () {
        const log = [];
        const warnings = [];
        const directory = common_1.definitelyTypedPath(folderName);
        log.push(`Reading contents of ${directory}`);
        const entryPointResult = yield entryPoint(directory, folderName, log);
        if (entryPointResult.kind === "failure") {
            log.push(entryPointResult.message);
            warnings.push(entryPointResult.message);
            return { log, warnings, rejectionReason: common_1.RejectionReason.TooManyFiles };
        }
        const entryPointFilename = entryPointResult.filename;
        const entryPointContent = yield readFile(directory, entryPointFilename);
        const mi = yield getModuleInfo(directory, entryPointFilename, log, warnings);
        let fileKind = getFileKind(mi, log);
        if (mi.declaredModules.length === 1 && fileKind !== DefinitionFileKind.ModuleAugmentation && mi.declaredModules[0].toLowerCase() !== folderName.toLowerCase()) {
            warnings.push(`Declared module \`${mi.declaredModules[0]}\` is in folder with incorrect name \`${folderName}\``);
        }
        if (mi.declaredModules.length === 0 && fileKind === DefinitionFileKind.ProperModule) {
            mi.declaredModules.push(folderName);
        }
        function regexMatch(rx, defaultValue) {
            const match = rx.exec(entryPointContent);
            return match ? match[1] : defaultValue;
        }
        const authors = regexMatch(/^\/\/ Definitions by: (.+)$/m, "Unknown");
        const libraryMajorVersion = regexMatch(/^\/\/ Type definitions for [^\d\n]+ v?(\d+)/m, "0");
        const libraryMinorVersion = regexMatch(/^\/\/ Type definitions for [^\d\n]+ v?\d+\.(\d+)/m, "0");
        const libraryName = regexMatch(/^\/\/ Type definitions for (.+)$/m, "Unknown").trim();
        const projectName = regexMatch(/^\/\/ Project: (.+)$/m, "");
        const packageName = path.basename(directory);
        const sourceRepoURL = "https://www.github.com/DefinitelyTyped/DefinitelyTyped";
        if (packageName !== packageName.toLowerCase()) {
            warnings.push(`Package name \`${packageName}\` should be strictly lowercase`);
        }
        if (mi.referencedLibraries.concat(mi.moduleDependencies).some(s => s === libraryName)) {
            throw new Error(`Package references itself: ${libraryName}`);
        }
        const hasPackageJson = yield fsp.exists(path.join(directory, "package.json"));
        const allFiles = hasPackageJson ? mi.declFiles.concat(["package.json"]) : mi.declFiles;
        return {
            log,
            warnings,
            data: {
                authors,
                definitionFilename: entryPointFilename,
                libraryDependencies: mi.referencedLibraries,
                moduleDependencies: mi.moduleDependencies,
                libraryMajorVersion,
                libraryMinorVersion,
                libraryName,
                typingsPackageName: folderName.toLowerCase(),
                projectName,
                sourceRepoURL,
                sourceBranch: common_1.settings.sourceBranch,
                kind: DefinitionFileKind[fileKind],
                globals: Object.keys(mi.globalSymbols).filter(k => !!(mi.globalSymbols[k] & DeclarationFlags.Value)).sort(),
                declaredModules: mi.declaredModules,
                root: path.resolve(directory),
                files: mi.declFiles,
                hasPackageJson,
                contentHash: yield hash(directory, allFiles)
            }
        };
    });
}
exports.getTypingInfo = getTypingInfo;
function entryPoint(directory, folderName, log) {
    return __awaiter(this, void 0, void 0, function* () {
        const declFiles = yield util_1.readdirRecursive(directory, (file, stats) => 
        // Only include type declaration files.
        stats.isDirectory() || file.endsWith(".d.ts"));
        declFiles.sort();
        log.push(`Found ${declFiles.length} '.d.ts' files (${declFiles.join(", ")})`);
        if (declFiles.length === 1) {
            return { kind: "success", filename: declFiles[0] };
        }
        else {
            // You can have [foldername].d.ts, or index.d.ts to rescue yourself from this situation
            const candidates = [folderName + ".d.ts", "index.d.ts"];
            const filename = candidates.find(c => declFiles.includes(c));
            if (filename === undefined) {
                return {
                    kind: "failure",
                    message: "Exiting, found either zero or more than one .d.ts file and none of " + candidates.map(c => "`" + c + "`").join(" or ")
                };
            }
            else {
                log.push(`Used ${filename} as entry point`);
                return { kind: "success", filename };
            }
        }
    });
}
// See GH#68 for why we don't just include every file
/** Returns a map from filename (path relative to `directory`) to the SourceFile we parsed for it. */
function allReferencedFiles(directory, entryPointFilename, log) {
    return __awaiter(this, void 0, void 0, function* () {
        const all = new Map();
        function recur(referencedFrom, filename) {
            return __awaiter(this, void 0, void 0, function* () {
                if (all.has(filename)) {
                    return;
                }
                log.push(`Parse ${filename}`);
                let content;
                try {
                    content = yield readFile(directory, filename);
                }
                catch (err) {
                    throw new Error(`In ${directory}, ${referencedFrom} references ${filename}, which does not exist.`);
                }
                const src = ts.createSourceFile(filename, content, ts.ScriptTarget.Latest, true);
                all.set(filename, src);
                const refs = referencedFiles(src, directory, path.dirname(filename));
                yield Promise.all(refs.map(ref => recur(filename, ref)));
            });
        }
        yield recur("", entryPointFilename);
        return all;
    });
}
/**
 * @param subDirectory The specific directory within the DefinitelyTyped directory we are in.
 * For example, `directory` may be `react-router` and `subDirectory` may be `react-router/lib`.
 */
function referencedFiles(src, directory, subDirectory) {
    const out = [];
    for (const ref of src.referencedFiles) {
        // Any <reference path="foo"> is assumed to be local
        maybeAdd(ref.fileName);
    }
    for (const ref of imports(src)) {
        if (ref.startsWith(".")) {
            maybeAdd(`${ref}.d.ts`);
        }
    }
    return out;
    // GH#69: We should just forbid all non-global references to the outside.
    function maybeAdd(ref) {
        const full = path.normalize(path.join(subDirectory, ref));
        // If the *normalized* path starts with "..", then it reaches outside of srcDirectory.
        if (!full.startsWith("..")) {
            out.push(full);
        }
    }
}
/**
 * All strings referenced in `import` statements.
 * Does *not* include <reference> directives.
 */
function imports(src) {
    const out = [];
    for (const node of src.statements) {
        switch (node.kind) {
            case ts.SyntaxKind.ImportDeclaration: {
                const decl = node;
                if (decl.moduleSpecifier.kind === ts.SyntaxKind.StringLiteral) {
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
            default:
        }
    }
    return out;
    function parseRequire(text) {
        const match = /require\(["'](.*)["']\)/.exec(text);
        if (match === null) {
            throw new Error(`Failed to parse import = declaration "${text}"`);
        }
        return match[1];
    }
}
function getModuleInfo(directory, entryPointFilename, log, warnings) {
    return __awaiter(this, void 0, void 0, function* () {
        let hasUmdDecl = false;
        let isProperModule = false;
        let hasGlobalDeclarations = false;
        let ambientModuleCount = 0;
        const moduleDependencies = new Set();
        const referencedLibraries = new Set();
        const declaredModules = [];
        let globalSymbols = {};
        function recordSymbol(name, flags) {
            globalSymbols[name] = (globalSymbols[name] || DeclarationFlags.None) | flags;
        }
        const all = yield allReferencedFiles(directory, entryPointFilename, log);
        for (const src of all.values()) {
            for (const ref of imports(src)) {
                if (!ref.startsWith(".")) {
                    moduleDependencies.add(ref);
                    log.push(`Found import declaration from \`"${ref}"\``);
                    isProperModule = true;
                }
            }
            src.typeReferenceDirectives.forEach(ref => referencedLibraries.add(ref.fileName));
            for (const node of src.statements) {
                switch (node.kind) {
                    case ts.SyntaxKind.NamespaceExportDeclaration:
                        const globalName = node.name.getText();
                        log.push(`Found UMD module declaration for global \`${globalName}\``);
                        // Don't set hasGlobalDeclarations = true even though we add a symbol here
                        // since this is still a legal module-only declaration
                        globalSymbols[globalName] = ts.SymbolFlags.Value;
                        isProperModule = true;
                        hasUmdDecl = true;
                        break;
                    case ts.SyntaxKind.ModuleDeclaration:
                        if (node.flags & ts.NodeFlags.Export) {
                            log.push(`Found exported namespace \`${node.name.getText()}\``);
                            isProperModule = true;
                        }
                        else {
                            const nameKind = node.name.kind;
                            if (nameKind === ts.SyntaxKind.StringLiteral) {
                                const name = util_1.stripQuotes(node.name.getText());
                                declaredModules.push(name);
                                log.push(`Found ambient external module \`"${name}"\``);
                                ambientModuleCount++;
                            }
                            else {
                                const moduleName = node.name.getText();
                                log.push(`Found global namespace declaration \`${moduleName}\``);
                                hasGlobalDeclarations = true;
                                recordSymbol(moduleName, getNamespaceFlags(node));
                            }
                        }
                        break;
                    case ts.SyntaxKind.VariableStatement:
                        if (node.flags & ts.NodeFlags.Export) {
                            log.push("Found exported variables");
                            isProperModule = true;
                        }
                        else {
                            node.declarationList.declarations.forEach(decl => {
                                const declName = decl.name.getText();
                                log.push(`Found global variable \`${declName}\``);
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
                        if (node.flags & ts.NodeFlags.Export) {
                            const declName = node.name;
                            if (declName) {
                                log.push(`Found exported declaration "${declName.getText()}"`);
                            }
                            isProperModule = true;
                        }
                        else {
                            const declName = node.name.getText();
                            const isType = node.kind === ts.SyntaxKind.InterfaceDeclaration || node.kind === ts.SyntaxKind.TypeAliasDeclaration;
                            log.push(`Found global ${isType ? "type" : "value"} declaration "${declName}"`);
                            recordSymbol(declName, isType ? DeclarationFlags.Type : DeclarationFlags.Value);
                            hasGlobalDeclarations = true;
                        }
                        break;
                    case ts.SyntaxKind.ExportDeclaration:
                    case ts.SyntaxKind.ExportAssignment:
                        // These nodes always indicate an external module
                        log.push(`Found export assignment or export declaration`);
                        isProperModule = true;
                        break;
                    case ts.SyntaxKind.ImportEqualsDeclaration:
                    case ts.SyntaxKind.ImportDeclaration:
                        // Already handled these in `imports`
                        break;
                    default:
                        throw new Error(`Bad node in ${path.join(directory, src.fileName)}: ts.SyntaxKind[node.kind])`);
                }
            }
        }
        return {
            declFiles: arrayOf(all.keys()),
            referencedLibraries: arrayOf(referencedLibraries),
            moduleDependencies: arrayOf(moduleDependencies),
            hasUmdDecl, isProperModule, hasGlobalDeclarations, ambientModuleCount, declaredModules, globalSymbols
        };
        function arrayOf(strings) {
            return Array.from(strings).sort();
        }
    });
}
function isNewGlobal(name) {
    // This is not a new global if it simply augments an existing one.
    const augmentedGlobals = ["Array", "Function", "String", "Number", "Window", "Date", "StringConstructor", "NumberConstructor", "Math", "HTMLElement"];
    return !augmentedGlobals.includes(name);
}
function getFileKind(mi, log) {
    const globals = Object.keys(mi.globalSymbols).filter(isNewGlobal);
    if (mi.isProperModule) {
        if (mi.hasUmdDecl) {
            log.push(`UMD module declaration detected`);
            return DefinitionFileKind.UMD;
        }
        else {
            if (mi.ambientModuleCount > 0) {
                log.push(`At least one import declaration and an ambient module declaration, this is a ModuleAugmentation file`);
                return DefinitionFileKind.ModuleAugmentation;
            }
            else {
                log.push(`At least one export declaration, this is a ProperModule file`);
                return DefinitionFileKind.ProperModule;
            }
        }
    }
    else {
        if (mi.hasGlobalDeclarations) {
            if (mi.ambientModuleCount === 1) {
                if (globals.length === 1) {
                    log.push(`One global declaration and one ambient module declaration, this is an OldUMD file`);
                    return DefinitionFileKind.OldUMD;
                }
                else {
                    log.push(`${globals.length} global declarations and one ambient module declaration, this is a Mixed file`);
                    return DefinitionFileKind.Mixed;
                }
            }
            else if (mi.ambientModuleCount > 1) {
                log.push(`Global declarations and multiple ambient module declaration, this is a MultipleModules file`);
                return DefinitionFileKind.MultipleModules;
            }
            else {
                log.push(`Global declarations and no ambient module declaration, this is a Global file`);
                return DefinitionFileKind.Global;
            }
        }
        else {
            if (mi.ambientModuleCount === 1) {
                log.push(`Exactly one ambient module declaration, this is a DeclareModule file`);
                return DefinitionFileKind.DeclareModule;
            }
            else if (mi.ambientModuleCount > 1) {
                log.push(`Multiple ambient module declaration, this is a MultipleModules file`);
                return DefinitionFileKind.MultipleModules;
            }
            else {
                return DefinitionFileKind.Unknown;
            }
        }
    }
}
function hash(directory, files) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileContents = yield util_1.mapAsyncOrdered(files, (f) => __awaiter(this, void 0, void 0, function* () { return f + "**" + (yield readFile(directory, f)); }));
        const allContent = fileContents.join("||");
        return common_1.computeHash(allContent);
    });
}
function readFile(directory, fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield util_1.readFile(path.join(directory, fileName));
        // Skip BOM
        return (result.charCodeAt(0) === 0xFEFF) ? result.substr(1) : result;
    });
}
//# sourceMappingURL=definition-parser.js.map