"use strict";
const Lint = require("tslint");
class Rule extends Lint.Rules.AbstractRule {
    apply(sourceFile) {
        return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
    }
}
Rule.metadata = {
    ruleName: "no-parent-references",
    description: 'Forbid <reference path="../etc"/>',
    rationale: "Parent references are not inferred as dependencies by types-publisher.",
    optionsDescription: "Not configurable.",
    options: null,
    type: "functionality",
    typescriptOnly: true,
};
Rule.FAILURE_STRING = "Don't use <reference path> to reference another package. Use an import or <reference types> instead.";
exports.Rule = Rule;
class Walker extends Lint.RuleWalker {
    visitSourceFile(node) {
        for (const ref of node.referencedFiles) {
            if (ref.fileName.startsWith("..")) {
                this.addFailureAt(ref.pos, ref.end, Rule.FAILURE_STRING);
            }
        }
    }
}
//# sourceMappingURL=noParentReferencesRule.js.map