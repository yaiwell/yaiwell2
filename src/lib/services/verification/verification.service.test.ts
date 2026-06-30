/**
 * Tests del service `verification`.
 *
 * Mockeamos el repository para validar en aislamiento:
 *  - `listPendingVerifications`: mapea filas crudas al shape UI.
 *  - `getVerificationDetail`: null si no existe; mapea si existe.
 *  - `approveProvider`: rechaza si no existe; persiste si OK.
 *  - `rejectProvider`: rechaza si no existe; rechaza si notas <5 chars.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./verification.repository', () => ({
  verificationRepository: {
    findPendingProviders: vi.fn(),
    findProviderForVerification: vi.fn(),
    setVerificationDecision: vi.fn(),
    countByVerificationStatus: vi.fn(),
  },
}));

import { verificationRepository } from './verification.repository';
import {
  approveProvider,
  getVerificationDetail,
  listPendingVerifications,
  rejectProvider,
} from './verification.service';
import {
  ProviderNotFoundForVerificationError,
  RejectionNotesRequiredError,
  InvalidVerificationStatusError,
} from './verification.errors';

const mockRepo = vi.mocked(verificationRepository, true);

const SAMPLE_PROVIDER_ID = '70a8dc5a-2fed-4aa4-907c-ad93a49eb879';
const SAMPLE_REVIEWER_ID = '01234567-89ab-4cde-8f01-234567890abc';

function buildPendingRow(
  overrides: Partial<Parameters<typeof mockRepo.findPendingProviders>[0]> = {},
) {
  return {
    id: SAMPLE_PROVIDER_ID,
    businessName: 'Studio Aura',
    type: 'centro' as const,
    vatNumber: 'B-12345678',
    description: { es: 'Centro de bienestar', ca: 'Centre de benestar' },
    address: 'Carrer Major 10, Barcelona',
    createdAt: new Date('2026-06-30T10:00:00Z'),
    ownerEmail: 'aura@example.com',
    categoryName: { es: 'Bienestar', ca: 'Benestar' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listPendingVerifications', () => {
  it('mapea filas crudas al shape AdminVerificationRequest', async () => {
    mockRepo.findPendingProviders.mockResolvedValue([buildPendingRow()]);

    const result = await listPendingVerifications('es');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: SAMPLE_PROVIDER_ID,
      status: 'pending',
      providerName: 'Studio Aura',
      providerType: 'centro',
      providerCity: 'Carrer Major 10, Barcelona',
      providerCategory: 'Bienestar',
      contactEmail: 'aura@example.com',
      contactPhone: '',
      vatNumber: 'B-12345678',
      description: 'Centro de bienestar',
      documents: [],
    });
  });

  it('respeta el locale al resolver descripción y categoría', async () => {
    mockRepo.findPendingProviders.mockResolvedValue([buildPendingRow()]);

    const result = await listPendingVerifications('ca');

    expect(result[0].description).toBe('Centre de benestar');
    expect(result[0].providerCategory).toBe('Benestar');
  });

  it('tolera providers sin categoría asignada', async () => {
    mockRepo.findPendingProviders.mockResolvedValue([buildPendingRow({ categoryName: null })]);

    const result = await listPendingVerifications('es');

    expect(result[0].providerCategory).toBe('');
  });

  it('normaliza vatNumber null a cadena vacía', async () => {
    mockRepo.findPendingProviders.mockResolvedValue([buildPendingRow({ vatNumber: null })]);

    const result = await listPendingVerifications('es');

    expect(result[0].vatNumber).toBe('');
  });
});

describe('getVerificationDetail', () => {
  it('devuelve null cuando el provider no existe', async () => {
    mockRepo.findProviderForVerification.mockResolvedValue(null);

    const result = await getVerificationDetail(SAMPLE_PROVIDER_ID, 'es');

    expect(result).toBeNull();
  });

  it('mapea el provider cuando existe', async () => {
    mockRepo.findProviderForVerification.mockResolvedValue(buildPendingRow());

    const result = await getVerificationDetail(SAMPLE_PROVIDER_ID, 'es');

    expect(result?.providerName).toBe('Studio Aura');
  });
});

describe('approveProvider', () => {
  it('rechaza con ProviderNotFoundForVerificationError si no existe', async () => {
    mockRepo.findProviderForVerification.mockResolvedValue(null);

    await expect(
      approveProvider({ providerId: SAMPLE_PROVIDER_ID }, SAMPLE_REVIEWER_ID),
    ).rejects.toBeInstanceOf(ProviderNotFoundForVerificationError);
    expect(mockRepo.setVerificationDecision).not.toHaveBeenCalled();
  });

  it('persiste la decisión approved cuando el provider existe', async () => {
    mockRepo.findProviderForVerification.mockResolvedValue(buildPendingRow());
    mockRepo.setVerificationDecision.mockResolvedValue();

    await approveProvider({ providerId: SAMPLE_PROVIDER_ID }, SAMPLE_REVIEWER_ID);

    expect(mockRepo.setVerificationDecision).toHaveBeenCalledWith({
      providerId: SAMPLE_PROVIDER_ID,
      status: 'approved',
      reviewedBy: SAMPLE_REVIEWER_ID,
      notes: null,
    });
  });

  it('rechaza con InvalidVerificationStatusError si providerId no es UUID', async () => {
    await expect(
      approveProvider({ providerId: 'not-a-uuid' }, SAMPLE_REVIEWER_ID),
    ).rejects.toBeInstanceOf(InvalidVerificationStatusError);
  });
});

describe('rejectProvider', () => {
  it('rechaza con RejectionNotesRequiredError si notes <5 chars', async () => {
    await expect(
      rejectProvider({ providerId: SAMPLE_PROVIDER_ID, notes: 'ok' }, SAMPLE_REVIEWER_ID),
    ).rejects.toBeInstanceOf(RejectionNotesRequiredError);
    expect(mockRepo.findProviderForVerification).not.toHaveBeenCalled();
  });

  it('rechaza con ProviderNotFoundForVerificationError si no existe', async () => {
    mockRepo.findProviderForVerification.mockResolvedValue(null);

    await expect(
      rejectProvider(
        { providerId: SAMPLE_PROVIDER_ID, notes: 'Documentación incompleta' },
        SAMPLE_REVIEWER_ID,
      ),
    ).rejects.toBeInstanceOf(ProviderNotFoundForVerificationError);
    expect(mockRepo.setVerificationDecision).not.toHaveBeenCalled();
  });

  it('persiste la decisión rejected con notas cuando todo OK', async () => {
    mockRepo.findProviderForVerification.mockResolvedValue(buildPendingRow());
    mockRepo.setVerificationDecision.mockResolvedValue();

    await rejectProvider(
      { providerId: SAMPLE_PROVIDER_ID, notes: 'Documentación incompleta tras dos avisos' },
      SAMPLE_REVIEWER_ID,
    );

    expect(mockRepo.setVerificationDecision).toHaveBeenCalledWith({
      providerId: SAMPLE_PROVIDER_ID,
      status: 'rejected',
      reviewedBy: SAMPLE_REVIEWER_ID,
      notes: 'Documentación incompleta tras dos avisos',
    });
  });
});
