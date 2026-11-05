'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react';

/** Desenlace visible de la última acción sobre el perfil. */
export type ProfileFeedback = 'saved' | 'error' | 'photoError' | null;

/**
 * Estado de la tarjeta de perfil. Los datos viven en Clerk; el webhook
 * `user.updated` los copia a `users`, igual que cualquier otro cambio.
 *
 * El borrador se guarda como `null` hasta que se edita, para no copiar a un
 * estado local lo que Clerk todavía está cargando.
 */
export function useAccountProfile() {
  const { isLoaded, user } = useUser();
  const { openUserProfile } = useClerk();
  const [firstNameDraft, setFirstName] = useState<string | null>(null);
  const [lastNameDraft, setLastName] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<ProfileFeedback>(null);

  const saveName = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!user) return;
      setIsBusy(true);
      setFeedback(null);
      try {
        await user.update({
          firstName: (firstNameDraft ?? user.firstName ?? '').trim(),
          lastName: (lastNameDraft ?? user.lastName ?? '').trim(),
        });
        setFeedback('saved');
      } catch {
        setFeedback('error');
      } finally {
        setIsBusy(false);
      }
    },
    [user, firstNameDraft, lastNameDraft],
  );

  const changePhoto = useCallback(
    async (file: File | null) => {
      if (!user) return;
      setIsBusy(true);
      setFeedback(null);
      try {
        await user.setProfileImage({ file });
        setFeedback('saved');
      } catch {
        setFeedback('photoError');
      } finally {
        setIsBusy(false);
      }
    },
    [user],
  );

  const onPhotoSelected = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Permite volver a elegir el mismo fichero si algo falla.
      event.target.value = '';
      if (file) void changePhoto(file);
    },
    [changePhoto],
  );

  // Se oculta la baja de Clerk: saltaría las reglas de `deleteOwnAccount`
  // (negocio, reservas y reembolsos abiertos). La baja va por «Tus datos».
  const openSecurity = useCallback(() => {
    openUserProfile({ appearance: { elements: { profileSection__danger: { display: 'none' } } } });
  }, [openUserProfile]);

  return {
    isLoaded,
    user,
    firstName: firstNameDraft ?? user?.firstName ?? '',
    lastName: lastNameDraft ?? user?.lastName ?? '',
    setFirstName,
    setLastName,
    isBusy,
    feedback,
    saveName,
    onPhotoSelected,
    removePhoto: () => void changePhoto(null),
    openSecurity,
  };
}
