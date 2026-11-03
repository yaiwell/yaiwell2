/**
 * Reglas puras del equipo: corte por plan, estado y servicios que se
 * quedarían sin nadie.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { selectBookableIds } from './team.bookable';
import {
  findNewlyUnstaffed,
  findUnstaffed,
  isOwnProfessionalPhoto,
  memberStatus,
  withAssignment,
} from './team.rules';

const SVC = (id: string, professionalIds: string[]) => ({
  id,
  name: { es: id },
  professionalIds,
});

describe('selectBookableIds', () => {
  it('se queda con los N más antiguos; null = todos', () => {
    expect(selectBookableIds(['a', 'b', 'c', 'd'], 3)).toEqual(['a', 'b', 'c']);
    expect(selectBookableIds(['a', 'b'], 3)).toEqual(['a', 'b']);
    expect(selectBookableIds(['a', 'b'], null)).toEqual(['a', 'b']);
  });
});

describe('memberStatus', () => {
  it('distingue activo, fuera de plan y de baja', () => {
    const bookable = new Set(['a']);
    expect(memberStatus('a', true, bookable)).toBe('active');
    expect(memberStatus('b', true, bookable)).toBe('outOfPlan');
    expect(memberStatus('a', false, bookable)).toBe('inactive');
  });
});

describe('findUnstaffed', () => {
  it('marca los servicios cuyo personal está todo fuera de plan', () => {
    const services = [SVC('corte', ['a', 'd']), SVC('tinte', ['d'])];
    expect(findUnstaffed(services, new Set(['a', 'b', 'c']))).toEqual([
      { id: 'tinte', name: { es: 'tinte' } },
    ]);
  });
});

describe('findNewlyUnstaffed', () => {
  it('solo cuenta los que este cambio deja sin nadie', () => {
    const bookable = new Set(['a', 'b']);
    const before = [SVC('corte', ['a']), SVC('tinte', ['x']), SVC('peinado', ['a', 'b'])];
    const after = withAssignment(before, 'a', new Set());

    expect(
      findNewlyUnstaffed({ services: before, bookable }, { services: after, bookable }),
    ).toEqual([{ id: 'corte', name: { es: 'corte' } }]);
  });
});

describe('withAssignment', () => {
  it('añade y quita al profesional según los servicios elegidos', () => {
    const result = withAssignment([SVC('s1', ['a']), SVC('s2', ['b'])], 'b', new Set(['s1']));
    expect(result.map((s) => s.professionalIds)).toEqual([['a', 'b'], []]);
  });
});

describe('isOwnProfessionalPhoto', () => {
  const origin = 'https://x.supabase.co';
  const base = `${origin}/storage/v1/object/public/provider-photos`;

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', origin);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('acepta una subida del propio negocio en la carpeta del equipo', () => {
    expect(isOwnProfessionalPhoto(`${base}/prov-1/professionals/u.jpg`, 'prov-1')).toBe(true);
  });

  it('rechaza otro negocio, otra carpeta, http o URLs externas', () => {
    expect(isOwnProfessionalPhoto(`${base}/prov-2/professionals/u.jpg`, 'prov-1')).toBe(false);
    expect(isOwnProfessionalPhoto(`${base}/prov-1/u.jpg`, 'prov-1')).toBe(false);
    expect(
      isOwnProfessionalPhoto(`http://x/provider-photos/prov-1/professionals/u.jpg`, 'prov-1'),
    ).toBe(false);
    expect(isOwnProfessionalPhoto('https://evil.example/cat.jpg', 'prov-1')).toBe(false);
    expect(isOwnProfessionalPhoto('no es url', 'prov-1')).toBe(false);
  });

  it('rechaza un host externo aunque copie la ruta de Supabase', () => {
    const path = '/storage/v1/object/public/provider-photos/prov-1/professionals/u.jpg';
    expect(isOwnProfessionalPhoto(`https://evil.example${path}`, 'prov-1')).toBe(false);
    expect(isOwnProfessionalPhoto(`https://x.supabase.co.evil.example${path}`, 'prov-1')).toBe(
      false,
    );
    // La ruta tiene que empezar por el prefijo, no solo contenerlo.
    expect(isOwnProfessionalPhoto(`${origin}/proxy${path}`, 'prov-1')).toBe(false);
  });

  it('rechaza rutas con saltos codificados y la carpeta sin fichero', () => {
    expect(
      isOwnProfessionalPhoto(`${base}/prov-1/professionals/%2e%2e/%2e%2e/prov-2/u.jpg`, 'prov-1'),
    ).toBe(false);
    expect(isOwnProfessionalPhoto(`${base}/prov-1/professionals/`, 'prov-1')).toBe(false);
  });

  it('sin NEXT_PUBLIC_SUPABASE_URL no acepta ninguna foto', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect(isOwnProfessionalPhoto(`${base}/prov-1/professionals/u.jpg`, 'prov-1')).toBe(false);
  });
});
