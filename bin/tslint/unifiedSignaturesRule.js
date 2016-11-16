"use strict";
const Lint = require("tslint/lib/lint");
const ts = require("typescript");
class Rule extends Lint.Rules.AbstractRule {
    static FAILURE_STRING_SINGLE_PARAMETER_DIFFERENCE(type1, type2) {
        return `These overloads can be combined into one signature taking \`${type1} | ${type2}\`.`;
    }
    apply(sourceFile) {
        return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
    }
}
Rule.metadata = {
    ruleName: "array-type-style",
    description: "Array types should be written with the `Foo[]` syntax",
    rationale: "For consistency",
    options: {},
    type: "style"
};
Rule.FAILURE_STRING_OMITTING_SINGLE_PARAMETER = `These overloads can be combined into one signature with an optional parameter.`;
exports.Rule = Rule;
class Walker extends Lint.RuleWalker {
    visitSourceFile(node) {
        this.visitStatements(node.statements);
        super.visitSourceFile(node);
    }
    visitModuleDeclaration(node) {
        const { body } = node;
        if (body && body.kind === ts.SyntaxKind.ModuleBlock) {
            this.visitStatements(body.statements);
        }
        super.visitModuleDeclaration(node);
    }
    visitInterfaceDeclaration(node) {
        const signatures = node.members.filter(m => m.kind === ts.SyntaxKind.CallSignature || m.kind === ts.SyntaxKind.MethodSignature);
        this.checkOverloads(signatures, node.typeParameters);
        super.visitInterfaceDeclaration(node);
    }
    visitClassDeclaration(node) {
        this.visitMembers(node.members, node.typeParameters);
        super.visitClassDeclaration(node);
    }
    visitTypeLiteral(node) {
        this.visitMembers(node.members);
        super.visitTypeLiteral(node);
    }
    visitStatements(statements) {
        this.checkOverloads(statements.filter(statement => statement.kind === ts.SyntaxKind.FunctionDeclaration));
    }
    visitMembers(members, typeParameters) {
        const signatures = members.filter(m => m.kind === ts.SyntaxKind.CallSignature || m.kind === ts.SyntaxKind.MethodSignature || m.kind === ts.SyntaxKind.MethodDeclaration);
        this.checkOverloads(signatures, typeParameters);
    }
    checkOverloads(signatures, typeParameters) {
        const typeParametersSet = new Set((typeParameters || []).map(t => t.getText()));
        for (const overloads of collectOverloads(signatures).values()) {
            for (const [a, b] of pairs(overloads)) {
                this.compareSignatures(a, b, type => typeParametersSet.has(type));
            }
        }
    }
    compareSignatures(a, b, isTypeParameter) {
        if (signatureReturnTypeToString(a) !== signatureReturnTypeToString(b)) {
            return;
        }
        const [sig1, sig2] = [a, b].map(signatureTypesAsStrings);
        // Overloading OK if one signature uses a type parameter and the other doesn't.
        if (sig1.some(isTypeParameter) !== sig2.some(isTypeParameter)) {
            return;
        }
        if (signaturesDifferByOptionalParameter(sig1, sig2)) {
            this.fail(b, Rule.FAILURE_STRING_OMITTING_SINGLE_PARAMETER);
        }
        else {
            const parameterTypes = signaturesDifferBySingleParameter(sig1, sig2);
            if (parameterTypes) {
                this.fail(b, Rule.FAILURE_STRING_SINGLE_PARAMETER_DIFFERENCE(parameterTypes[0], parameterTypes[1]));
            }
        }
    }
    fail(node, message) {
        this.addFailure(this.createFailure(node.getStart(), node.getWidth(), message));
    }
}
function signatureName(node) {
    if (node.kind === ts.SyntaxKind.CallSignature) {
        return "()";
    }
    else {
        return node.name && getTextOfPropertyName(node.name);
    }
}
function collectOverloads(signatures) {
    const map = new Map();
    for (const sig of signatures) {
        const name = signatureName(sig);
        if (name !== undefined) {
            const got = map.get(name);
            if (got) {
                got.push(sig);
            }
            else {
                map.set(name, [sig]);
            }
        }
    }
    return map;
}
/** Detect `a(x: number, y: number, z: number)` and `a(x: number, y: string, z: number)`. */
function signaturesDifferBySingleParameter(types1, types2) {
    if (types1.length !== types2.length) {
        return undefined;
    }
    const index = getIndexOfFirstDifference(types1, types2);
    if (index === undefined) {
        return undefined;
    }
    // If remaining arrays are equal, the signatures differ by just one parameter type
    if (!arraysEqual(types1.slice(index + 1), types2.slice(index + 1))) {
        return undefined;
    }
    const a = types1[index];
    const b = types2[index];
    // Must have equivalent optionality / rest-ness
    if (a.startsWith("?") !== b.startsWith("?") || a.startsWith("...") !== b.startsWith("...")) {
        return undefined;
    }
    return [a, b];
}
/** Detect `a(): void` and `a(x: number): void`. */
function signaturesDifferByOptionalParameter(types1, types2) {
    const minLength = Math.min(types1.length, types2.length);
    if (types1.length > minLength + 1 || types2.length > minLength + 1) {
        return false;
    }
    for (let i = 0; i < minLength; i++) {
        if (types1[i] !== types2[i]) {
            return false;
        }
    }
    return true;
}
function signatureTypesAsStrings(signature) {
    return signature.parameters.map(parameter => {
        if (!parameter.type) {
            return "";
        }
        const s = parameter.type.getText();
        return parameter.dotDotDotToken
            ? `...${s}`
            : parameter.questionToken
                ? `?${s}`
                : s;
    });
}
function signatureReturnTypeToString(signature) {
    return signature.type ? signature.type.getText() : "";
}
function arraysEqual(arr1, arr2) {
    return arr1.length === arr2.length && arr1.every((x, idx) => x === arr2[idx]);
}
function getIndexOfFirstDifference(types1, types2) {
    for (let index = 0; index < types1.length && index < types2.length; index++) {
        if (types1[index] !== types2[index]) {
            return index;
        }
    }
    return undefined;
}
function* pairs(values) {
    for (let i = 0; i < values.length; i++) {
        for (let j = i + 1; j < values.length; j++) {
            yield [values[i], values[j]];
        }
    }
}
function getTextOfPropertyName(name) {
    switch (name.kind) {
        case ts.SyntaxKind.Identifier:
            return name.text;
        case ts.SyntaxKind.StringLiteral:
        case ts.SyntaxKind.NumericLiteral:
            return name.text;
        case ts.SyntaxKind.ComputedPropertyName:
            if (isStringOrNumericLiteral(name.expression.kind)) {
                return name.expression.text;
            }
        default:
            return undefined;
    }
}
function isStringOrNumericLiteral(kind) {
    return kind === ts.SyntaxKind.StringLiteral || kind === ts.SyntaxKind.NumericLiteral;
}
/*
Test case:

type TT = {
    (): void;
    (x: number): void; // error
    x(): void;
    x(x: number): void; // error
    y(x: string): void;
    y(x: number): void; //error
}

interface II {
    (): void;
    (x: number): void; // error
    x(): void;
    x(x: number): void; // error
    y(x: string): void;
    y(x: number): void; //error
}

export class C {
    x(): void;
    x(x: number): void; // error
    y(x: string): void;
    y(x: number): void; //error
}

interface Generic<T> {
    x(): void;
    x(t: T): void; // OK
}
*/
//# sourceMappingURL=unifiedSignaturesRule.js.map