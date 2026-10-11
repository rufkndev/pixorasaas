import Link from 'next/link';
import type { ReactNode } from 'react';

// Мелкие кирпичи для текста статей: плагина typography нет, а таблицу и
// внутреннюю ссылку проще один раз описать, чем расставлять классы в каждой статье

export function A({ href, children }: { href: string; children: ReactNode }) {
  const isExternal = href.startsWith('http');
  return isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <Link href={href}>{children}</Link>
  );
}

export function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="my-6 overflow-x-auto">
      <table>
        <thead>
          <tr>
            {head.map((cell) => (
              <th key={cell}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td key={index}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <div className="my-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-800">{children}</div>;
}
