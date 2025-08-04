export const sortValueFirst = (a: string, b: string, value: string): number => {
  if (a === b)
    return 0
  if (a === value)
    return -1
  if (b === value)
    return 1
  
  return 0
}
