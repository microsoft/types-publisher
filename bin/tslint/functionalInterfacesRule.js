"use strict";
const Lint = require("tslint");
const ts = require("typescript");
class Rule extends Lint.Rules.AbstractRule {
    static failureStringForInterface(name, { parameters, returnType }) {
        const suggestion = `type ${name} = (${parameters}) => ${returnType}`;
        const disable = "Use `// tslint:disable-next-line:functional-interfaces` if you will extend this interface.";
        return `Interface has only a call signature — use \`${suggestion}\` instead.\n${disable}`;
    }
    static failureStringForTypeLiteral({ parameters, returnType }) {
        return `Type literal has only a call signature — use \`(${parameters}) => ${returnType}\` instead.`;
    }
    apply(sourceFile) {
        return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
    }
}
Rule.metadata = {
    ruleName: "functional-interface",
    description: "An interface with just a call signature can be written as a function type.",
    rationale: "For simplicity",
    optionsDescription: "Not configurable.",
    options: null,
    type: "style",
    typescriptOnly: true,
};
exports.Rule = Rule;
class Walker extends Lint.RuleWalker {
    visitInterfaceDeclaration(node) {
        if (noSupertype(node.heritageClauses)) {
            this.check(node);
        }
        super.visitInterfaceDeclaration(node);
    }
    visitTypeLiteral(node) {
        this.check(node);
        super.visitTypeLiteral(node);
    }
    check(node) {
        if (node.members.length === 1 && node.members[0].kind === ts.SyntaxKind.CallSignature) {
            const sig = signatureString(node.members[0]);
            if (sig) {
                this.fail(node, node.name ? Rule.failureStringForInterface(node.name.getText(), sig) : Rule.failureStringForTypeLiteral(sig));
            }
        }
    }
    fail(node, message) {
        this.addFailure(this.createFailure(node.getStart(), node.getWidth(), message));
    }
}
/** True if there is no supertype or if the supertype is `Function`. */
function noSupertype(heritageClauses) {
    if (!heritageClauses) {
        return true;
    }
    if (heritageClauses.length === 1) {
        const expr = heritageClauses[0].types[0].expression;
        if (expr.kind === ts.SyntaxKind.Identifier && expr.text === "Function") {
            return true;
        }
    }
    return false;
}
function signatureString(node) {
    return node.type && {
        parameters: node.parameters.map(p => p.getText()).join(", "),
        returnType: node.type.getText()
    };
}
//# sourceMappingURL=functionalInterfacesRule.js.map