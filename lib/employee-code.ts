// Employee codes run EMP001, EMP002, … The next code is one more than the
// highest existing EMP number (gaps from deleted employees are not reused).

export const EMPLOYEE_CODE_PREFIX = "EMP";
const PATTERN = /^EMP(\d+)$/i;

export function nextEmployeeCode(existing: (string | null | undefined)[]): string {
  let max = 0;
  for (const code of existing) {
    const m = code ? PATTERN.exec(code.trim()) : null;
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${EMPLOYEE_CODE_PREFIX}${String(max + 1).padStart(3, "0")}`;
}
