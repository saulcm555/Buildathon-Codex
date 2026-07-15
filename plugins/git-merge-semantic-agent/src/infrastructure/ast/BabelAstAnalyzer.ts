import { parse } from '@babel/parser';
import traverseModule, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';

import type { AstChange } from '../../domain/AstChange.js';
import type { AstAnalyzer } from '../../domain/ConflictAnalysis.js';

type FunctionSnapshot = {
  key: string;
  parameters: string[];
  variables: Map<string, string>;
  validations: Set<string>;
  returns: Set<string>;
};

type FunctionPath = NodePath<t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression>;

// @babel/traverse publishes CommonJS runtime code while its DefinitelyTyped
// declaration is namespace-shaped. This preserves the callable runtime export.
const traverse = traverseModule as unknown as (
  parent: t.Node,
  visitor: Record<string, unknown>,
) => void;

/** Extracts a small, explainable semantic diff from JavaScript or TypeScript code. */
export class BabelAstAnalyzer implements AstAnalyzer {
  analyze(input: {
    baseCode: string;
    oursCode: string;
    theirsCode: string;
    filePath?: string;
  }): AstChange[] {
    const base = this.extractFunctions(input.baseCode, input.filePath);
    const ours = this.extractFunctions(input.oursCode, input.filePath);
    const theirs = this.extractFunctions(input.theirsCode, input.filePath);

    return [
      ...this.compareBranch(base, ours, 'ours'),
      ...this.compareBranch(base, theirs, 'theirs'),
    ];
  }

  private extractFunctions(code: string, filePath?: string): Map<string, FunctionSnapshot> {
    const ast = parse(code, {
      sourceType: 'unambiguous',
      sourceFilename: filePath,
      plugins: this.parserPlugins(filePath),
    });
    const snapshots = new Map<string, FunctionSnapshot>();

    traverse(ast, {
      FunctionDeclaration: (functionPath: NodePath<t.FunctionDeclaration>) => {
        if (!functionPath.node.id) return;
        snapshots.set(
          `function:${functionPath.node.id.name}`,
          this.snapshot(functionPath, `function:${functionPath.node.id.name}`, code),
        );
      },
      VariableDeclarator: (variablePath: NodePath<t.VariableDeclarator>) => {
        const { id, init } = variablePath.node;
        if (!t.isIdentifier(id) || !init || (!t.isArrowFunctionExpression(init) && !t.isFunctionExpression(init))) {
          return;
        }

        const functionPath = variablePath.get('init') as FunctionPath;
        snapshots.set(
          `function:${id.name}`,
          this.snapshot(functionPath, `function:${id.name}`, code),
        );
      },
    });

    return snapshots;
  }

  private snapshot(functionPath: FunctionPath, key: string, source: string): FunctionSnapshot {
    const parameters = functionPath.node.params.map((parameter) => this.parameterName(parameter));
    const variables = new Map<string, string>();
    const validations = new Set<string>();
    const returns = new Set<string>();

    functionPath.get('body').traverse({
      VariableDeclarator: (variablePath) => {
        const { id, init } = variablePath.node;
        if (t.isIdentifier(id) && init) {
          variables.set(id.name, this.normalise(this.sourceFor(source, init)));
        }
      },
      IfStatement: (ifPath) => {
        validations.add(this.normalise(this.sourceFor(source, ifPath.node.test)));
      },
      ReturnStatement: (returnPath) => {
        if (returnPath.node.argument) {
          returns.add(this.normalise(this.sourceFor(source, returnPath.node.argument)));
        }
      },
    });

    return { key, parameters, variables, validations, returns };
  }

  private compareBranch(
    base: Map<string, FunctionSnapshot>,
    candidate: Map<string, FunctionSnapshot>,
    branch: 'ours' | 'theirs',
  ): AstChange[] {
    const changes: AstChange[] = [];

    for (const [key, current] of candidate) {
      const original = base.get(key);
      const functionName = key.replace('function:', '');

      if (!original) {
        changes.push({ branch, kind: 'function', location: functionName, summary: `Function "${functionName}" was added.` });
        continue;
      }

      current.parameters.forEach((parameter, index) => {
        const previous = original.parameters[index];
        if (previous && previous !== parameter) {
          changes.push({
            branch,
            kind: 'parameter',
            location: functionName,
            summary: `Parameter "${previous}" was renamed to "${parameter}" in ${functionName}.`,
          });
        }
      });

      for (const [name, initializer] of current.variables) {
        if (original.variables.has(name)) continue;
        const previous = [...original.variables.entries()].find(([, value]) => value === initializer)?.[0];
        if (previous) {
          changes.push({
            branch,
            kind: 'variable',
            location: functionName,
            summary: `Variable "${previous}" was renamed to "${name}" in ${functionName}.`,
          });
        }
      }

      for (const validation of current.validations) {
        if (!original.validations.has(validation)) {
          changes.push({
            branch,
            kind: 'validation',
            location: functionName,
            summary: `Validation "${validation}" was added in ${functionName}.`,
          });
        }
      }

      if (!this.setsEqual(original.returns, current.returns)) {
        changes.push({
          branch,
          kind: 'return',
          location: functionName,
          summary: `Return expression was modified in ${functionName}.`,
        });
      }
    }

    return changes;
  }

  private parserPlugins(filePath?: string): ('typescript' | 'jsx')[] {
    const extension = filePath?.split('.').pop()?.toLowerCase();
    const plugins: ('typescript' | 'jsx')[] = [];
    if (extension === 'ts' || extension === 'tsx') plugins.push('typescript');
    if (extension === 'jsx' || extension === 'tsx') plugins.push('jsx');
    return plugins;
  }

  private parameterName(parameter: t.FunctionParameter): string {
    if (t.isIdentifier(parameter)) return parameter.name;
    if (t.isAssignmentPattern(parameter) && t.isIdentifier(parameter.left)) return parameter.left.name;
    if (t.isRestElement(parameter) && t.isIdentifier(parameter.argument)) return parameter.argument.name;
    return 'destructured';
  }

  private sourceFor(source: string, node: t.Node): string {
    return source.slice(node.start ?? 0, node.end ?? 0);
  }

  private normalise(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private setsEqual(left: Set<string>, right: Set<string>): boolean {
    return left.size === right.size && [...left].every((value) => right.has(value));
  }
}
