"use strict";
const Lint = require("tslint/lib/lint");
/** Rule wrapper. */
class Rule extends Lint.Rules.AbstractRule {
    static failureString(arg) {
        return `Prefer ${arg}[] over Array<${arg}>`;
    }
    apply(sourceFile) {
        return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
    }
}
Rule.metadata = {
    ruleName: "no-array",
    description: "Array types should be written with the `Foo[]` syntax",
    rationale: "For consistency",
    options: {},
    type: "style"
};
exports.Rule = Rule;
/** Visitor that checks an individual node for documentation. */
class Walker extends Lint.RuleWalker {
    visitTypeReference(node) {
        const name = node.typeName.getText();
        if (name === "Array" && node.typeArguments) {
            const arg = node.typeArguments[0];
            this.addFailure(this.createFailure(node.getStart(), node.getWidth(), Rule.failureString(arg.getText())));
        }
    }
}
//# sourceMappingURL=noArrayRule.js.map