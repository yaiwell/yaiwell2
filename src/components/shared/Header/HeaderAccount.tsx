'use client';

import { useUser } from '@clerk/nextjs';
import { User } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/**
 * Acceso a la cuenta con la identidad de quien ha entrado. En cliente para que
 * cada página no pague una llamada más a Clerk en el servidor: mientras carga
 * se ve el texto genérico.
 */
export function HeaderAccount() {
  const t = useTranslations('nav');
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.firstName || email?.split('@')[0] || t('account');

  return (
    <Button asChild variant="outline" size="lg" data-component="header-account-identity">
      <Link href="/cuenta" title={email} className="inline-flex max-w-44 items-center gap-2">
        {user ? (
          <Image
            src={user.imageUrl}
            alt=""
            width={24}
            height={24}
            className="size-6 rounded-full object-cover"
          />
        ) : (
          <User className="size-4" aria-hidden="true" />
        )}
        <span className="truncate">{name}</span>
      </Link>
    </Button>
  );
}
