import * as Lint from "tslint";
import * as ts from "typescript";

export class Rule extends Lint.Rules.TypedRule {
	/* tslint:disable:object-literal-sort-keys */
	static metadata: Lint.IRuleMetadata = {
		ruleName: "expect-type",
		description: "!",
		optionsDescription: "Not configurable.",
		options: null,
		type: "functionality",
		typescriptOnly: true,
		requiresTypeInfo: true,
	};
	/* tslint:enable:object-literal-sort-keys */

	static FAILURE_STRING(expectedType: string, actualType: string): string {
		return `Expected type to be '${expectedType}'; got '${actualType}'.`;
	}

	static FAILURE_STRING_DUPLICATE_ASSERTION = "This line has 2 $ExpectType assertions.";
	static FAILURE_STRING_ASSERTION_MISSING_NODE = "Can not match a node to this assertion.";

	applyWithProgram(sourceFile: ts.SourceFile, langSvc: ts.LanguageService): Lint.RuleFailure[] {
		// Perf: skip this file if it has no assertions. Definition files cannot have assertions.
		if (sourceFile.isDeclarationFile || !sourceFile.text.includes("$ExpectType")) {
			return [];
		}
		return this.applyWithWalker(new Walker(sourceFile, this.getOptions(), langSvc.getProgram()));
	}
}

class Walker extends Lint.ProgramAwareRuleWalker {
	visitSourceFile(sourceFile: ts.SourceFile) {
		this.addFailures(sourceFile, this.parseExpectedTypes(sourceFile));
	}

	// Returns a map from a line number to the expected type at that line.
	private parseExpectedTypes(source: ts.SourceFile): Map<number, string> {
		const scanner = ts.createScanner(ts.ScriptTarget.Latest, /*skipTrivia*/false, ts.LanguageVariant.Standard, source.text);
		const assertions = new Map<number, string>();

		let prevTokenPos = -1;
		const lineStarts = source.getLineStarts();
		let curLine = 0;

		const addAssertion = (expectedType: string, pos: number): void => {
			//advance curLine to be the line preceding 'pos'
			while (lineStarts[curLine + 1] <= pos) {
				curLine++;
			}

			const isFirstTokenOnLine = lineStarts[curLine] > prevTokenPos;
			// If this is the first token on the line, it applies to the next line. Otherwise, it applies to the text to the left of it.
			const line = isFirstTokenOnLine ? curLine + 1 : curLine;
			//assertions.push({ expectedType, line });
			if (assertions.has(line)) {
				this.addFailureAtLine(line, Rule.FAILURE_STRING_DUPLICATE_ASSERTION);
			}
			assertions.set(line, expectedType);
		}

		loop: while (true) {
			const token = scanner.scan();
			const pos = scanner.getTokenPos();
			switch (token) {
				case ts.SyntaxKind.EndOfFileToken:
					break loop;

				case ts.SyntaxKind.WhitespaceTrivia:
					continue loop;

				case ts.SyntaxKind.SingleLineCommentTrivia:
					const commentText = scanner.getTokenText();
					const match = commentText.match(/^\/\/ \$ExpectType (.*)/);
					if (match) {
						addAssertion(match[1], pos);
					}
					break;

				default:
					prevTokenPos = pos;
					break;
			}
		}

		return assertions;
	}

	private addFailures(source: ts.SourceFile, assertions: Map<number, string>): void {
		const checker = this.getTypeChecker();

		// Match assertions to the first node that appears on the line they apply to.
		const iterate = (node: ts.Node): void => {
			const pos = node.getStart();
			const { line } = source.getLineAndCharacterOfPosition(pos);
			const expectedType = assertions.get(line);
			if (expectedType !== undefined) {
				// https://github.com/Microsoft/TypeScript/issues/14077
				if (node.kind === ts.SyntaxKind.ExpressionStatement) {
					node = (node as ts.ExpressionStatement).expression;
				}

				const actualType = checker.typeToString(checker.getTypeAtLocation(node));
				if (actualType !== expectedType) {
					this.addFailureAtNode(node, Rule.FAILURE_STRING(expectedType, actualType));
				}

				assertions.delete(line);
			}

			ts.forEachChild(node, iterate);
		}

		iterate(source);

		for (const line of assertions.keys()) {
			this.addFailureAtLine(line, Rule.FAILURE_STRING_ASSERTION_MISSING_NODE);
		}
	}

	private addFailureAtLine(line: number, failure: string) {
		const source = this.getSourceFile();
		const start = source.getPositionOfLineAndCharacter(line, 0);
		const end = source.getPositionOfLineAndCharacter(line + 1, 0);
		this.addFailureFromStartToEnd(start, end, failure);
	}
}
