"use strict";
const Lint = require("tslint");
const ts = require("typescript");
class Rule extends Lint.Rules.AbstractRule {
    apply(sourceFile) {
        return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
    }
}
Rule.metadata = {
    ruleName: "interface-over-type-literal",
    description: "Prefer an interface declaration over `type T = { ... }`",
    rationale: "For consistency",
    optionsDescription: "Not configurable.",
    options: null,
    type: "style",
    typescriptOnly: true,
};
Rule.FAILURE_STRING = "Use an interface instead.";
exports.Rule = Rule;
class Walker extends Lint.RuleWalker {
    visitTypeAliasDeclaration(node) {
        if (node.type.kind === ts.SyntaxKind.TypeLiteral) {
            this.fail(node);
        }
        super.visitTypeAliasDeclaration(node);
    }
    fail(node) {
        this.addFailure(this.createFailure(node.getStart(), node.getWidth(), Rule.FAILURE_STRING));
    }
}
//# sourceMappingURL=interfaceOverTypeLiteralRule.js.map