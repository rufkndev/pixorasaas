"use client";

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { LEGAL_LINKS } from '../../lib/legal';

const checkboxClass =
  'mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-gray-900 focus:ring-gray-900';

const legalLinkClass = 'underline hover:no-underline';

// Согласие должно быть осознанным: галочка не проставлена заранее,
// рядом ссылки на текст согласия и на политику.
export function PdnConsentCheckbox({
  checked,
  onChange,
  id = 'consent-pdn',
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 text-sm text-gray-600 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={checkboxClass}
      />
      <span>
        Я даю{' '}
        <Link href={LEGAL_LINKS.consent} target="_blank" className={legalLinkClass}>
          согласие на обработку персональных данных
        </Link>{' '}
        и ознакомлен с{' '}
        <Link href={LEGAL_LINKS.personalData} target="_blank" className={legalLinkClass}>
          политикой их обработки
        </Link>
        .
      </span>
    </label>
  );
}

// Отдельная и необязательная: согласия нужно разделять,
// а отказ от рассылки не должен закрывать доступ к сервису.
export function MarketingConsentCheckbox({
  checked,
  onChange,
  id = 'consent-marketing',
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 text-sm text-gray-600 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={checkboxClass}
      />
      <span>
        Хочу получать письма о новых возможностях и акциях.{' '}
        <span className="text-gray-400">Необязательно, можно отключить в любой момент.</span>
      </span>
    </label>
  );
}

// Акцепт оферты на странице оплаты
export function OfferConsentCheckbox({
  checked,
  onChange,
  id = 'consent-offer',
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  id?: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 text-sm text-gray-600 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={checkboxClass}
      />
      <span>
        {children || (
          <>
            Я принимаю условия{' '}
            <Link href={LEGAL_LINKS.offer} target="_blank" className={legalLinkClass}>
              публичной оферты
            </Link>
            ,{' '}
            <Link href={LEGAL_LINKS.terms} target="_blank" className={legalLinkClass}>
              пользовательского соглашения
            </Link>{' '}
            и{' '}
            <Link href={LEGAL_LINKS.privacy} target="_blank" className={legalLinkClass}>
              политики конфиденциальности
            </Link>
            .
          </>
        )}
      </span>
    </label>
  );
}
