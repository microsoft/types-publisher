import * as Lint from "tslint";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
	static metadata: Lint.IRuleMetadata = {
		ruleName: "unused-type-parameter",
		description: "A type parameter should be used in one of the parameter types, not just in the return type.",
		rationale: "Avoid `getMeAT<T>(): T`. If a type parameter does not appear in the types of any parameters, " +
			"you don't really have a generic function, just a disguised type assertion. " +
			"Prefer to use a real type assertion, e.g. `getMeAT() as number`. " +
			"Use `// tslint:disable-next-line:unused-type-parameter` for collections, like `new Map<string, number>()`.",
		optionsDescription: "Not configurable.",
		options: null,
		type: "functionality",
		typescriptOnly: true,
	};

	static FAILURE_STRING(typeParameterName: string): string {
		return `Type parameter ${typeParameterName} is not used in the type of any parameter.`;
	}

	apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
		return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
	}
}

class Walker extends Lint.RuleWalker {
	visitFunctionDeclaration(node: ts.FunctionDeclaration) {
		this.visitSignature(node);
		super.visitFunctionDeclaration(node);
	}

	visitConstructSignature(node: ts.ConstructSignatureDeclaration) {
		this.visitSignature(node);
		super.visitConstructSignature(node);
	}

	visitCallSignature(node: ts.CallSignatureDeclaration) {
		this.visitSignature(node);
		super.visitCallSignature(node);
	}

	visitMethodDeclaration(node: ts.MethodDeclaration) {
		this.visitSignature(node);
		super.visitMethodDeclaration(node);
	}

	visitMethodSignature(node: ts.MethodSignature) {
		this.visitSignature(node);
		super.visitMethodSignature(node);
	}

	visitSignature(node: ts.SignatureDeclaration): void {
		if (!node.typeParameters) {
			return;
		}

		for (const typeParameter of node.typeParameters) {
			const typeParameterName = typeParameter.name.text;
			if (!node.parameters.some(p => parameterUsesType(typeParameterName, p))) {
				this.fail(typeParameter, Rule.FAILURE_STRING(typeParameterName));
			}
		}
	}

	private fail(node: ts.Node, message: string) {
		this.addFailure(this.createFailure(node.getStart(), node.getWidth(), message));
	}
}

function parameterUsesType(typeParameterName: string, { type }: ts.ParameterDeclaration): boolean {
	return !!type && typeContainsParameter(typeParameterName, type);
}

function typeContainsParameter(typeParameterName: string, type: ts.TypeNode): boolean {
	if (type.kind === ts.SyntaxKind.TypeReference) {
		const name = (type as ts.TypeReferenceNode).typeName;
		if (name.kind === ts.SyntaxKind.Identifier && (name as ts.Identifier).text === typeParameterName) {
			return true;
		}
	}
	return !!ts.forEachChild(type, (sub: ts.TypeNode) => typeContainsParameter(typeParameterName, sub));
}
