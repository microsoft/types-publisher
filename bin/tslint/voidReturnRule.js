"use strict";
const Lint = require("tslint");
const ts = require("typescript");
class Rule extends Lint.Rules.AbstractRule {
    apply(sourceFile) {
        return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
    }
}
Rule.metadata = {
    ruleName: "void-return",
    description: "`void` may only be used as a return type.",
    rationale: "style",
    optionsDescription: "Not configurable.",
    options: null,
    type: "style",
    typescriptOnly: true,
};
Rule.FAILURE_STRING = "Use the `void` type for return types only. Otherwise, use `undefined`.";
exports.Rule = Rule;
class Walker extends Lint.RuleWalker {
    visitNode(node) {
        if (node.kind === ts.SyntaxKind.VoidKeyword && !isPromiseType(node) && !isReturnType(node)) {
            this.fail(node, Rule.FAILURE_STRING);
        }
        super.visitNode(node);
    }
    fail(node, message) {
        this.addFailure(this.createFailure(node.getStart(), node.getWidth(), message));
    }
}
function isPromiseType(node) {
    const parent = node.parent;
    switch (parent.kind) {
        case ts.SyntaxKind.TypeReference: {
            const ref = parent;
            return isPromiseIdentifier(ref.typeName) && ref.typeArguments[0] === node;
        }
        case ts.SyntaxKind.NewExpression: {
            const ctr = parent;
            return isPromiseIdentifier(ctr.expression) && ctr.typeArguments[0] === node;
        }
        default:
            return false;
    }
}
function isPromiseIdentifier(node) {
    return node.kind === ts.SyntaxKind.Identifier && node.text === "Promise";
}
function isReturnType(node) {
    const parent = node.parent;
    return isSignatureDeclaration(parent) && parent.type === node;
}
function isSignatureDeclaration(node) {
    switch (node.kind) {
        case ts.SyntaxKind.ArrowFunction:
        case ts.SyntaxKind.FunctionDeclaration:
        case ts.SyntaxKind.FunctionType:
        case ts.SyntaxKind.MethodDeclaration:
        case ts.SyntaxKind.MethodSignature:
            return true;
        default:
            return false;
    }
}
//# sourceMappingURL=voidReturnRule.js.map