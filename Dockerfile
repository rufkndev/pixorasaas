# Общий образ для фронта и бэкенда. Нужная стадия выбирается через target в compose.
# База bookworm, а не alpine: у sharp и argon2 есть готовые бинарники под glibc.
FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# В slim-образе нет ни шрифтов, ни конфига fontconfig, и sharp рисовал водяной
# знак пустым — превью уходили клиенту без защиты. Нужны обоим приложениям.
# Остальные семейства — для надписи в логотипе: картинные модели кириллицу
# рисуют с ошибками, поэтому название набирается шрифтом на сервере.
# Все пять покрывают кириллицу (Lobster, например, не покрывает — потому его и нет).
# Пакеты apt не убирать даже после перехода брендбука на свои шрифты: логотипы,
# сделанные раньше, набраны именно ими и должны рендериться так же.
#
# librsvg2-bin даёт rsvg-convert — им собирается PDF брендбука: libvips внутри
# sharp собран без PDF ни на вход, ни на выход. poppler-utils нужен для проверки
# готового файла (pdfinfo) и как запасной путь склейки полос (pdfunite).
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      fontconfig fonts-dejavu-core \
      fonts-inter fonts-open-sans fonts-liberation2 fonts-comfortaa fonts-play \
      librsvg2-bin poppler-utils \
 && fc-cache -f \
 && rm -rf /var/lib/apt/lists/*

# Шрифты брендбука лежат в репозитории, а не тянутся при сборке: next/font/google
# убран по той же причине — загрузка с российского сервера падает. Ставим их
# системно, иначе rsvg-convert наберёт полосы подстановочным шрифтом.
COPY public/fonts /usr/local/share/fonts/pixora
RUN fc-cache -f

# Все зависимости, включая dev — для сборки и режима разработки
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Только те зависимости, что нужны в рантайме
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# В деве /app приходит с хоста и перекрыл бы node_modules контейнера, поэтому
# зависимости переезжают в /node_modules — Node найдёт их, поднимаясь вверх от /app.
FROM deps AS dev-base
RUN mv /app/node_modules /node_modules
ENV NODE_PATH=/node_modules
ENV PATH=/node_modules/.bin:$PATH

FROM dev-base AS web-dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM dev-base AS api-dev
ENV NODE_ENV=development
EXPOSE 3001
CMD ["npm", "run", "server"]

FROM deps AS web-build
ENV NODE_ENV=production
COPY . .
RUN npm run build

# Рантайм фронта: standalone-сборка Next тянет только нужные зависимости
FROM base AS web
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=web-build /app/public ./public
COPY --from=web-build /app/.next/standalone ./
COPY --from=web-build /app/.next/static ./.next/static

RUN mkdir -p ./public/generated-logos && chown -R node:node ./public/generated-logos

USER node
EXPOSE 3000
CMD ["node", "server.js"]

FROM deps AS api-build
COPY tsconfig.json ./
COPY backend ./backend
RUN npx tsc -p backend/tsconfig.json

FROM base AS api
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=api-build /app/backend/dist ./dist
COPY package.json ./
# Миграции нужны сервису migrate — он собирается из этой же стадии
COPY db ./db
# Те же файлы, что и в /usr/local/share/fonts: отсюда бэкенд читает метрики
# и кладёт шрифты с лицензией в архив покупателю
COPY public/fonts ./public/fonts

RUN mkdir -p ./public/generated-logos && chown -R node:node ./public

USER node
EXPOSE 3001
CMD ["node", "dist/index.js"]
