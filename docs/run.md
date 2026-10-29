# Запуск и ежедневная работа

Что за сервисы и переменные окружения — в [tech-stack.md](tech-stack.md), цены и лимиты —
в [economics.md](economics.md).

## Первый запуск (дев)

```bash
cp .env.local.example .env.local
```

Заполнить в `.env.local`:

- `POSTGRES_PASSWORD` и тот же пароль внутри `DATABASE_URL`
- `JWT_SECRET` — сгенерировать: `openssl rand -hex 32`
- `GENAPI_KEY`, `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` — старые значения.
Уведомления ЮKassa в деве не нужны, см. [ниже](#юkassa-уведомления-о-платежах)
- `POSTBOX_SMTP_USER`, `POSTBOX_SMTP_PASSWORD`, `MAIL_FROM` — из Яндекс Cloud Postbox
- `CONTACT_EMAIL` — куда падают письма из формы обратной связи

Строка `ENV_FILE=.env.local` должна остаться — по ней compose понимает, какой
файл пробрасывать в контейнеры.

Затем:

```bash
npm run docker:dev
```

Поднимется четыре контейнера: `db`, `migrate` (отработает и завершится),
`api-dev`, `web-dev`. Сайт — [http://localhost:3000](http://localhost:3000), API — [http://localhost:3001](http://localhost:3001).

## Ежедневно (дев)

```bash
npm run docker:dev            # запустить
docker compose --env-file .env.local --profile dev down   # остановить
docker compose --env-file .env.local logs -f api-dev      # логи бэкенда
docker compose --env-file .env.local logs -f web-dev      # логи фронта
```

Логи бэкенда — JSON-строки (pino). Читать глазами:
`docker compose --env-file .env.local logs -f api-dev | npx pino-pretty`.

### Список одноразовой почты

Регистрация с одноразовых адресов отклоняется по списку
`backend/data/disposableDomains.json`. Скрипта обновления нет: раз в несколько месяцев
можно заменить файл свежим списком из репозитория `disposable-email-domains`
(`disposable_email_blocklist.conf`, переведённый в JSON-массив).

### База данных

```bash
# консоль psql
docker compose --env-file .env.local exec db psql -U pixora -d pixora

# список таблиц
docker compose --env-file .env.local exec db psql -U pixora -d pixora -c '\dt'
```

Новая миграция — просто новый файл в `db/migrations/` с номером по порядку
(сейчас последняя `010`, значит следующая — `011_что_меняем.sql`). Применится сама при следующем запуске; уже применённые
файлы повторно не выполняются. **Применённые миграции не редактируем** — только
новым файлом.

Полный сброс базы (все данные пропадут):

```bash
docker compose --env-file .env.local --profile dev down
docker volume rm pixora_pgdata
npm run docker:dev
```



## Прод



### Что нужно на сервере

Российский VPS, установлены `docker` и `docker compose`, домен направлен
A-записью на IP сервера, открыты порты 80 и 443.

### Первый деплой

```bash
git clone <репозиторий> && cd pixorasaas
cp .env.local.example .env.production
```

Заполнить `.env.production` так же, как `.env.local`, плюс:

- `ENV_FILE=.env.production` — обязательно поменять
- `APP_URL=https://ваш-домен.ру`
- `DOMAIN=ваш-домен.ру` — под него Caddy выпустит сертификат
- `ACME_EMAIL` — почта для уведомлений Let's Encrypt. Можно оставить пустой,
но **нельзя писать адрес без точки в домене** (`admin@localhost` и подобные):
Let's Encrypt отвечает `invalidContact`, и сертификат не выпускается совсем
- `POSTGRES_PASSWORD` и `JWT_SECRET` — **новые**, не те же, что в деве

**Прод не поднимется, если не хватает обязательных переменных** (`DATABASE_URL`,
`JWT_SECRET` от 32 символов, `APP_URL`, `GENAPI_KEY`, ключи ЮKassa, логин и пароль
Postbox, `MAIL_FROM`, `CONTACT_EMAIL`). Список недостающего — первой строкой в
`logs api`. Лимиты против фарма (`IP_DAILY_*`, `GENAPI_DAILY_BUDGET_RUB`,
`LOGO_*`) и `ALERT_EMAIL` необязательны, у них есть умолчания.

`NODE_ENV` в env-файле не указываем: он задан в `docker-compose.yml` для каждого
профиля. От него зависит флаг `Secure` у кук сессии, и случайное `development`
в проде его бы отключило.

Запуск:

```bash
npm run docker:prod
# то же самое без npm:
# docker compose --env-file .env.production --profile prod up -d --build
```

Поднимется `db`, `migrate`, `api`, `web`, `caddy`. Сертификат выпустится сам за  
несколько секунд.

Если браузер пишет, что не может безопасно подключиться, смотрите
`logs -f caddy`: строка `could not get certificate from issuer` говорит, что
сертификата нет. Дальше по тексту ошибки — `invalidContact` значит неверный
`ACME_EMAIL`, отказ на этапе проверки домена — что до сервера не доходит порт 80
(его требует HTTP-проверка Let's Encrypt) или что A-запись смотрит не туда.

### Ежедневно (прод)

```bash
# выкатить новую версию
git pull
npm run docker:prod

# статус и логи
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f api
docker compose --env-file .env.production logs -f caddy

# остановить
docker compose --env-file .env.production --profile prod down
```

При остановке и выкатке бэкенд до 50 секунд доделывает идущие сборки брендбуков
(`stop_grace_period: 60s`). Что не успело — подберёт досборщик после старта.



## Поисковики и IndexNow

Карта сайта — `https://pixora-ai.ru/sitemap.xml`, собирается из `app/sitemap.ts` при сборке.
Новые статьи блога и ниши лендинга попадают в неё сами. Что настроить в Яндекс Вебмастере, Google
Search Console и Bing — по шагам в [seo.md](seo.md).

После выкатки новых страниц или правки статей сообщите о них поисковикам. Один запрос на
`api.indexnow.org` расходится по всем участникам протокола, включая Яндекс и Bing; Google
IndexNow не поддерживает, ему хватает sitemap.

```bash
KEY=494e5d69dedf07a0019fce178e64e1bc
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://api.indexnow.org/indexnow \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d "{\"host\":\"pixora-ai.ru\",\"key\":\"$KEY\",\"keyLocation\":\"https://pixora-ai.ru/$KEY.txt\",\"urlList\":[
    \"https://pixora-ai.ru/\",
    \"https://pixora-ai.ru/logo-generator\",
    \"https://pixora-ai.ru/name-generator\",
    \"https://pixora-ai.ru/brandbook-generator\",
    \"https://pixora-ai.ru/logo-generator/dlya-marketpleysa\",
    \"https://pixora-ai.ru/logo-generator/dlya-ip\",
    \"https://pixora-ai.ru/logo-generator/dlya-kofeyni\",
    \"https://pixora-ai.ru/logo-generator/dlya-salona-krasoty\",
    \"https://pixora-ai.ru/logo-generator/dlya-stroitelnoy-kompanii\",
    \"https://pixora-ai.ru/blog\",
    \"https://pixora-ai.ru/blog/kak-zaregistrirovat-tovarnyy-znak-samomu\",
    \"https://pixora-ai.ru/blog/logotip-dlya-magazina-na-wildberries\",
    \"https://pixora-ai.ru/blog/logotip-dlya-ip\",
    \"https://pixora-ai.ru/blog/skolko-stoit-logotip\",
    \"https://pixora-ai.ru/blog/kak-pridumat-nazvanie-dlya-ooo\",
    \"https://pixora-ai.ru/blog/chto-vhodit-v-brendbuk\",
    \"https://pixora-ai.ru/blog/logotip-iz-neyroseti-tovarnyy-znak\",
    \"https://pixora-ai.ru/blog/kak-proverit-nazvanie-biznesa\"
  ]}"
```

`200` или `202` — принято. `403` — поисковик не нашёл файл ключа: проверьте, что
`https://pixora-ai.ru/<ключ>.txt` открывается и содержит сам ключ. В `urlList` перечисляйте
только изменившиеся адреса, до 10 000 за раз.

Если ключ поменяли — переименуйте файл в `public/`, поправьте `KEY` здесь и перешлите адреса.
