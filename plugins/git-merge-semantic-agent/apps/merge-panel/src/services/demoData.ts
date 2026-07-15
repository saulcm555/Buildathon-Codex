import type { MergeAnalysis } from '../types';

export const demoAnalysis: MergeAnalysis = {
  sessionId: 'demo-session',
  repository: 'acme/checkout-web',
  filePath: 'src/services/payment.ts',
  fileHash: 'f6e9c8d',
  commits: [
    { label: 'base', hash: 'c1a8d2e', author: 'Ana Ruiz', date: '12 jul', message: 'feat: crear flujo de pago' },
    { label: 'ours', hash: '93fbea1', author: 'Tu rama', date: '14 jul', message: 'feat: validar monto antes de cobrar' },
    { label: 'theirs', hash: 'd72a4bf', author: 'Diego Vega', date: '14 jul', message: 'refactor: renombrar total a amount' }
  ],
  versions: {
    base: "export async function charge(total: number) {\n  return gateway.charge({ total });\n}",
    ours: "export async function charge(total: number) {\n  if (total <= 0) throw new Error('Invalid total');\n  return gateway.charge({ total });\n}",
    theirs: "export async function charge(amount: number) {\n  return gateway.charge({ amount });\n}"
  },
  astChanges: [
    { branch: 'ours', kind: 'added', title: 'Validación añadida', detail: 'Protege contra montos menores o iguales a cero.' },
    { branch: 'theirs', kind: 'renamed', title: 'Parámetro renombrado', detail: '`total` → `amount` para mayor claridad de dominio.' }
  ],
  proposal: "export async function charge(amount: number) {\n  if (amount <= 0) throw new Error('Invalid amount');\n\n  return gateway.charge({ amount });\n}",
  explanation: 'La propuesta conserva la validación de tu rama y adopta el nombre `amount` del refactor. Ambos cambios son compatibles.',
  confidence: 94,
  warnings: ['No se ejecutaron pruebas del repositorio.']
};
