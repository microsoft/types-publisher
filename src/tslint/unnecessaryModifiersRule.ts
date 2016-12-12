import * as Lint from "tslint";
import * as ts from "typescript";

import { isExternalModule } from "../util/ts";

/*
NOTES

In an external module:
    * `export` is necessary
    * `declare` is necessary for non-export
    * `declare` is not necessary if `export` is present.

In ambient context:
    * `declare` is necessary
    * (`export` N/A, or this wouldn't be ambient.)

Inside `declare module "m" { }`:
    * `export` not necessary
    * (`declare` illegal)
*/

export class Rule extends Lint.Rules.AbstractRule {
	static metadata: Lint.IRuleMetadata = {
		ruleName: "no-public",
		description: "Forbids the 'public' keyword.",
		rationale: "For simplicity",
		optionsDescription: "Not configurable.",
		options: null,
		type: "style",
		typescriptOnly: true,
	};

	static FAILURE_STRING(kind: "export" | "declare"): string {
        return `'${kind}' modifier is unnecessary here.`;
    }

	apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
		return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
	}
}

class Walker extends Lint.RuleWalker {
    //todo: const, interface, class, enum...
    visitFunctionDeclaration(node: ts.FunctionDeclaration) {
        this.check(node);
        super.visitFunctionDeclaration(node);
    }

	private check(node: ts.Declaration) {
        const context = getContext(node);
        const { modifiers } = node;
        const failure = getUnnecessaryModifier();
        if (failure) {
            this.fail(node, Rule.FAILURE_STRING(failure));
        }

        function getUnnecessaryModifier(): "declare" | "export" | undefined {
            switch (context) {
                case DeclarationContext.ExternalModule:
                    return hasExport() && hasDeclare() ? "declare" : undefined;

                case DeclarationContext.Ambient:
                    // Impossible to have unnecessary modifier without a compile error.
                    return undefined;

                case DeclarationContext.ModuleDeclaration:
                    return hasExport() ? "export" : undefined;
            }
        }

        function hasExport() {
            return hasModifier(ts.SyntaxKind.ExportKeyword);
        }
        function hasDeclare() {
            return hasModifier(ts.SyntaxKind.DeclareKeyword);
        }
        function hasModifier(kind: ts.SyntaxKind) {
            return modifiers && Lint.hasModifier(modifiers, kind);
        }
	}

	private fail(node: ts.Node, message: string) {
		this.addFailure(this.createFailure(node.getStart(), node.getWidth(), message));
	}
}

function getContext({ parent }: ts.Declaration): DeclarationContext {
    switch (parent!.kind) {
        case ts.SyntaxKind.ModuleBlock:
            return DeclarationContext.ModuleDeclaration;
        case ts.SyntaxKind.SourceFile:
            return isExternalModule(parent as ts.SourceFile) ? DeclarationContext.ExternalModule : DeclarationContext.Ambient;
        default:
            throw new Error(`Unexpected parent kind: ${ts.SyntaxKind[parent!.kind]}`);
    }
}

const enum DeclarationContext {
    ExternalModule,
    Ambient,
    ModuleDeclaration
}
