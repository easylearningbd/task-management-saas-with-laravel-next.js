/** `#RRGGBB`, either case — the same pattern the API validates (`/^#[0-9A-Fa-f]{6}$/`). */
export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value.trim())
}
