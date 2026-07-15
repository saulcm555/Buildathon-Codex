export type AstChangeNodeType =
  | 'function'
  | 'parameter'
  | 'variable'
  | 'validation'
  | 'return';

export interface AstChange {
  branch: 'ours' | 'theirs';
  nodeType: AstChangeNodeType;
  summary: string;
}
