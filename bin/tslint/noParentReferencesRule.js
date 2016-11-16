"use strict";
const Lint = require("tslint/lib/lint");
class Rule extends Lint.Rules.AbstractRule {
    apply(sourceFile) {
        return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
    }
}
Rule.metadata = {
    ruleName: "no-parent-references",
    description: 'Forbid <reference path="../etc"/>',
    rationale: "Parent references are not inferred as dependencies by types-publisher.",
    options: {},
    type: "functionality"
};
Rule.FAILURE_STRING = "Don't use <reference path> to reference another package. Use an import or <reference types> instead.";
exports.Rule = Rule;
class Walker extends Lint.RuleWalker {
    visitSourceFile(node) {
        for (const ref of node.referencedFiles) {
            if (ref.fileName.startsWith("..")) {
                this.addFailure(this.createFailure(ref.pos, ref.end, Rule.FAILURE_STRING));
            }
        }
    }
}
//# sourceMappingURL=noParentReferencesRule.js.map