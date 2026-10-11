import JsonLd from '../seo/JsonLd';

export interface FaqItem {
  q: string;
  a: string;
}

// Ответы — простой текст, а не разметка: тот же текст уходит в FAQPage,
// и ИИ-поисковики сверяют разметку с тем, что видно на странице
export default function Faq({ items, title = 'Частые вопросы' }: { items: FaqItem[]; title?: string }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h2>
      <div className="mt-6 divide-y divide-gray-200 border-y border-gray-200">
        {items.map((item) => (
          <details key={item.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold text-gray-900">
              <span>{item.q}</span>
              <span className="text-gray-400 transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-gray-700 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
      <JsonLd data={structuredData} />
    </section>
  );
}
