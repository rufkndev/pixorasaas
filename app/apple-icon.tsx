import { ImageResponse } from 'next/og';

// iOS не берёт SVG для значка на домашнем экране — нужен PNG 180 × 180.
// Рисуется при сборке, как и og.png: PNG-файлы в репозиторий не коммитятся
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <svg width="132" height="132" viewBox="0 0 100 100">
          <path d="M50 0L87.5 25V75L50 100L12.5 75V25L50 0Z" fill="#111827" />
          <path d="M50 20L70 32.5V57.5L50 70L30 57.5V32.5L50 20Z" fill="#ffffff" />
          <path d="M50 30L60 36.25V48.75L50 55L40 48.75V36.25L50 30Z" fill="#111827" />
        </svg>
      </div>
    ),
    size,
  );
}
