export function sortValueFirst(a: string, b: string, value: string): number;
export function sortValueFirst(a: number, b: number, value: number): number;
export function sortValueFirst(a: string | number, b: string | number, value: string | number): number {
  if (a === b)
    return 0;
  if (a === value)
    return -1;
  if (b === value)
    return 1;
  
  return 0;
}

export function undefinedIfEmpty(value: string | null | undefined): string | undefined;
export function undefinedIfEmpty(value: string[] | null | undefined): string[] | undefined;
export function undefinedIfEmpty(value: string | string[] | null | undefined) {
  if (value === undefined || value !== null && value.length > 0)
    return value;

  return undefined;
}

export function capitalize(value: string) {
  if (value.length === 0)
    return value;

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function getArraySubset(arr: any[], indices: number[]) {
  return arr.filter((_, index) => indices.includes(index));
}
