/**
 * Iniciales para el avatar de un profesional sin foto: primera letra
 * del primer y del último nombre («Ana María López» → «AL»). Con un solo
 * nombre, una letra; con el nombre vacío, `?`.
 *
 * Usa `Array.from` para no partir por la mitad letras fuera del plano
 * básico (emojis, algunas tildes compuestas).
 */
export function getProfessionalInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/u)
    .filter((part) => part.length > 0);
  if (parts.length === 0) return '?';
  const first = Array.from(parts[0]!)[0] ?? '';
  if (parts.length === 1) return first.toUpperCase();
  const last = Array.from(parts[parts.length - 1]!)[0] ?? '';
  return `${first}${last}`.toUpperCase();
}
