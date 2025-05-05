export function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

export function toPascalCase(str: string): string {
  return str
    .replace(/(\w)(\w*)/g, (_, first, rest) => first.toUpperCase() + rest.toLowerCase())
    .replace(/[-_\s]+(\w)/g, (_, char) => char.toUpperCase());
}

export function toCamelCase(str: string): string {
  return str
    .replace(/([-_ ]\w)/g, (group) => group[1].toUpperCase())
    .replace(/^./, (match) => match.toLowerCase());
}