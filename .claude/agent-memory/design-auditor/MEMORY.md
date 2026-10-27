# Memoria del design-auditor

- **Paleta confirmada**: crema cálida + plum (hue 350); modo oscuro como pieza editorial propia, nunca negro puro. Fraunces en títulos (h1–h3), Inter en texto. `components.json` dice `style: radix-nova` (la memoria antigua decía new-york).
- **Mapa**: OSM con inversión CSS en oscuro (`.yaiwell-map-tiles`).
- **Disponibilidad**: sage = ahora, butter = pronto, muted = sin hueco. En 2026-10-27 los badges suaves no llegaban a AA en claro (1,55:1 y 2,04:1); pendiente pasarlos a tokens semánticos `--status-*`.
- **Política de reservas desde 2026-10-27**: antelación mínima de 30 min; menos de 2 h = pago online sin reembolso; más de 2 h = pago en el local (futuro). Vocabulario: «Última hora» / «Con margen».
- **Tendencias ya evaluadas (no repetir la investigación hasta 2027)**: Liquid Glass/glassmorphism (no), chat con IA para buscar (no), gamificación y prueba social en tiempo real (no, VISION §8), tokens semánticos, EAA/WCAG 2.2 y movimiento funcional (sí, duradero).
- **Medición**: el navegador integrado mide 800 px; 1440 px es una emulación reducida donde algunos clics no responden. Calcular los contrastes con los tokens OKLCH reales en el navegador.
- Informe completo: `docs/design-audit-2026-10-27.md`.
