"use strict";
const Lint = require("tslint/lib/lint");
class Rule extends Lint.Rules.AbstractRule {
    apply(sourceFile) {
        return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
    }
}
Rule.metadata = {
    ruleName: "no-empty-interface",
    description: "Forbids empty interfaces",
    rationale: "Empty interfaces as not useful.",
    options: {},
    type: "style"
};
Rule.FAILURE_STRING = "An empty interface is equivalent to `{}`.";
Rule.FAILURE_STRING_FOR_EXTENDS = "An interface declaring no members is equivalent to its supertype.";
exports.Rule = Rule;
class Walker extends Lint.RuleWalker {
    visitInterfaceDeclaration(node) {
        if (node.members.length === 0) {
            this.fail(node, node.heritageClauses ? Rule.FAILURE_STRING_FOR_EXTENDS : Rule.FAILURE_STRING);
        }
        super.visitInterfaceDeclaration(node);
    }
    fail(node, message) {
        this.addFailure(this.createFailure(node.getStart(), node.getWidth(), message));
    }
}
//# sourceMappingURL=noEmptyInterfaceRule.js.map