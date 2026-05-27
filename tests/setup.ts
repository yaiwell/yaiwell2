/**
 * Setup global de Vitest.
 *
 * Importa los matchers de jest-dom (`toBeInTheDocument`, `toHaveClass`,
 * etc.) y registra un `afterEach` que limpia el DOM entre tests para
 * evitar fugas de estado entre suites de componentes.
 */
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
