import * as Lint from "tslint";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
	static metadata: Lint.IRuleMetadata = {
		ruleName: "no-empty-namespace",
		description: "Forbids empty namespaces",
		rationale: "Empty namespaces as not useful.",
		optionsDescription: "Not configurable.",
		options: null,
		type: "style",
		typescriptOnly: true,
	};

	static FAILURE_STRING =
		"Do not add an empty namespace to allow namespace imports. Use `import =` instead. " +
		"See https://stackoverflow.com/questions/39415661/why-cant-i-import-a-class-or-function-with-import-as-x-from-y";

	apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
		return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
	}
}

class Walker extends Lint.RuleWalker {
	visitModuleDeclaration(node: ts.ModuleDeclaration) {
		if (node.body && node.body.kind === ts.SyntaxKind.ModuleBlock && (node.body as ts.ModuleBlock).statements.length === 0) {
			this.addFailureAtNode(node, Rule.FAILURE_STRING);
		}
		super.visitModuleDeclaration(node);
	}
}
