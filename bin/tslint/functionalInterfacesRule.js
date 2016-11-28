"use strict";
const Lint = require("tslint");
const ts = require("typescript");
class Rule extends Lint.Rules.AbstractRule {
    static failureString(name, { parameters, returnType }) {
        return `Interface has only a call signature -- use \`type ${name} = (${parameters}) => ${returnType}\` instead.`;
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
        if (!node.heritageClauses && node.members.length === 1 && node.members[0].kind === ts.SyntaxKind.CallSignature) {
            const sig = signatureString(node.members[0]);
            if (sig) {
                this.fail(node, Rule.failureString(node.name.getText(), sig));
            }
        }
        super.visitInterfaceDeclaration(node);
    }
    fail(node, message) {
        this.addFailure(this.createFailure(node.getStart(), node.getWidth(), message));
    }
}
function signatureString(node) {
    return node.type && {
        parameters: node.parameters.map(p => p.getText()).join(", "),
        returnType: node.type.getText()
    };
}
//# sourceMappingURL=functionalInterfacesRule.js.map