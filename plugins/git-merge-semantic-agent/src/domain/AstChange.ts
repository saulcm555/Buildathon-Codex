export type AstChangeNodeType =
  | 'function'
  | 'parameter'
  | 'variable'
  | 'rename'
  | 'validation'
  | 'return';

export interface AstChange {
  branch: 'ours' | 'theirs';
  kind: AstChangeNodeType;
  summary: string;
  location?: string;
}
