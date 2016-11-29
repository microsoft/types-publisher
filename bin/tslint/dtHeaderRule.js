"use strict";
const Lint = require("tslint");
const header_1 = require("../lib/header");
class Rule extends Lint.Rules.AbstractRule {
    apply(sourceFile) {
        return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
    }
}
Rule.metadata = {
    ruleName: "dt-header",
    description: "Ensure consistency of DefinitelyTyped headers.",
    rationale: "Consistency is a good.",
    optionsDescription: "Not configurable.",
    options: null,
    type: "functionality",
    typescriptOnly: true,
};
exports.Rule = Rule;
class Walker extends Lint.RuleWalker {
    visitSourceFile(node) {
        const text = node.getFullText();
        if (!isMainFile(node.fileName)) {
            if (text.startsWith("// Type definitions for")) {
                this.addFailure(this.createFailure(0, 1, "Header should only be in `index.d.ts`."));
            }
            return;
        }
        const error = header_1.validate(text);
        if (error) {
            this.addFailure(this.createFailure(error.index, error.index + 1, `Error parsing header. Expected: ${header_1.renderExpected(error.expected)}`));
        }
        // Don't recurse, we're done.
    }
}
function isMainFile(fileName) {
    // Linter must be run with cwd of the package. We want `index.d.ts` but not `submodule/index.d.ts` to match.
    return fileName === "index.d.ts";
}
//# sourceMappingURL=dtHeaderRule.js.map