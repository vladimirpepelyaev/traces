import { Complaint, DialogComplaint, WikiArticle } from '../../types';

export interface KnowledgeRuleMeta {
  code: string;
  articleId: string;
  articleTitle: string;
  category: string;
  ruleTitle: string;
  criteria: string[];
  sanctions: {
    first: string;
    repeat: string;
    critical: string;
  };
  moderatorAction: string;
}

export const KNOWLEDGE_BASE_RULES_MAP: Record<string, KnowledgeRuleMeta> = {
  'MOD-01': {
    code: 'MOD-01',
    articleId: 'wiki-1',
    articleTitle: 'Основы модерации контента',
    category: 'Модератор',
    ruleTitle: 'Пункт 1: Оскорбления личности и буллинг',
    criteria: [
      'Прямое унижение чести и достоинства пользователя',
      'Организованная травля, призывы к преследованию',
      'Использование дискриминационных и оскорбительных ярлыков'
    ],
    sanctions: {
      first: 'Удаление контента + официальное предупреждение',
      repeat: 'Временная блокировка профиля на 24–72 часа',
      critical: 'Блокировка аккаунта на 30 дней'
    },
    moderatorAction: 'Удалить публикацию (AGREE), при повторении выдать ограничение доступа'
  },
  'SPAM-01': {
    code: 'SPAM-01',
    articleId: 'wiki-2',
    articleTitle: 'Работа с жалобами на спам',
    category: 'Модератор',
    ruleTitle: 'Пункт 2: Несанкционированная реклама и ссылки на сомнительные ресурсы',
    criteria: [
      'Массовая рассылка шаблонных рекламных текстов',
      'Использование сокращенных ссылок (clck, bit.ly) для сокрытия редиректов',
      'Предложения быстрого заработка, казино, нелицензированных финансовых пирамид'
    ],
    sanctions: {
      first: 'Удаление всех публикаций автора + блокировка постинга на 7 дней',
      repeat: 'Перманентный бан учетной записи',
      critical: 'Блокировка по IP и аппаратным идентификаторам'
    },
    moderatorAction: 'Удалить спам (AGREE), внести домены в спам-фильтр'
  },
  'MOD-02': {
    code: 'MOD-02',
    articleId: 'wiki-3',
    articleTitle: 'Модерация нецензурных выражений',
    category: 'Модератор',
    ruleTitle: 'Пункт 3: Прямые нецензурные оскорбления собеседников',
    criteria: [
      'Адресное употребление обсценной лексики в адрес участников дискуссии',
      'Грубая нецензурная брань с целью задеть или запугать оппонента',
      'Агрессивные матерные выпады в публичных комментариях'
    ],
    sanctions: {
      first: 'Удаление комментария / поста',
      repeat: 'Блокировка комментирования на 24 часа',
      critical: 'Блокировка профиля на 7 дней'
    },
    moderatorAction: 'Удалить комментарий (AGREE), при рецидиве применить mute'
  },
  'MOD-03': {
    code: 'MOD-03',
    articleId: 'wiki-4',
    articleTitle: 'Борьба с флудом и оффтопом',
    category: 'Модератор',
    ruleTitle: 'Пункт 4: Массовое дублирование сообщений и накрутка оценок',
    criteria: [
      'Публикация трех и более идентичных сообщений подряд',
      'Массовое выпрашивание лайков, подписок и оценок («+ в лс», «лайк на аву»)',
      'Засорение обсуждений бессмысленным набором символов'
    ],
    sanctions: {
      first: 'Скрытие дубликатов из ленты + системное уведомление',
      repeat: 'Ограничение комментирования на 12 часов',
      critical: 'Запрет создания тем на 3 дня'
    },
    moderatorAction: 'Скрыть дубликаты (AGREE), уведомить пользователя'
  },
  'SEC-01': {
    code: 'SEC-01',
    articleId: 'wiki-11',
    articleTitle: 'Предотвращение фишинга и кражи сессий',
    category: 'Безопасность',
    ruleTitle: 'Пункт 1: Фишинговые ссылки, поддельные шлюзы и кража сессий',
    criteria: [
      'Распространение ссылок на поддельные страницы авторизации ИТД / банков',
      'Маскировка под официальные службы безопасности и техподдержку',
      'Попытки выманивания SMS-кодов, токенов сессий и паролей'
    ],
    sanctions: {
      first: 'Немедленная перманентная блокировка аккаунта',
      repeat: 'Блокировка связанных подсетей и аппаратных отпечатков',
      critical: 'Занесение доменов в общесистемный черный список DNS'
    },
    moderatorAction: 'Экстренная блокировка нарушителя (AGREE + BAN), отзыв всех сессий'
  },
  'SEC-02': {
    code: 'SEC-02',
    articleId: 'wiki-12',
    articleTitle: 'Защита конфиденциальных данных (GDPR)',
    category: 'Безопасность',
    ruleTitle: 'Пункт 2: Несанкционированное разглашение персональных данных (доксинг)',
    criteria: [
      'Публикация паспортных данных, номеров телефонов третьих лиц без их согласия',
      'Разглашение домашних адресов, номеров банковских карт и счетов',
      'Публикация приватных переписок и закрытых медицинских сведений'
    ],
    sanctions: {
      first: 'Удаление материалов + блокировка аккаунта на 14 дней',
      repeat: 'Перманентный бан учетной записи',
      critical: 'Уведомление пострадавшей стороны о факте утечки'
    },
    moderatorAction: 'Немедленное удаление персональных данных (AGREE), фиксация в журнале безопасности'
  }
};

/**
 * Enhanced Knowledge Base articles with structured guidelines, criteria, and sanctions.
 */
export const OFFICIAL_KNOWLEDGE_BASE_ARTICLES: WikiArticle[] = [
  {
    id: 'wiki-1',
    code: 'MOD-01',
    title: 'Основы модерации контента',
    cat: 'Модератор',
    count: 19,
    readTime: '4 мин.',
    criteria: [
      'Оскорбления личности и буллинг (MOD-01)',
      'Несанкционированная реклама и спам (SPAM-01)',
      'Эротическое содержимое и NSFW',
      'Пропаганда вражды и дискриминация'
    ],
    sanctions: [
      'Первичное нарушение: Предупреждение и удаление публикации',
      'Повторное нарушение: Ограничение постинга на 24-72 часа',
      'Злостное нарушение: Блокировка аккаунта на 30 дней'
    ],
    workflow: [
      '1. Оценить контекст жалобы и подтвердить наличие нарушения',
      '2. При соответствии регламенту нажать AGREE (удалить публикацию)',
      '3. Проверить историю нарушений автора и при необходимости применить блокировку'
    ],
    violationExamples: [
      '«Ты совершенно бездарный верстальщик, уходи из профессии и не позорься...»',
      'Публичные призывы к массовой травле конкретного пользователя платформы'
    ],
    linkedComplaintTypes: ['Оскорбление личности', 'Буллинг', 'Травля'],
    content: `Базовые правила модерации контента включают в себя регулярную проверку публикуемых материалов на соответствие Пользовательскому соглашению платформы «ИТД».

Ключевые категории нарушений, подлежащих обязательному разбору:
1. Оскорбления личности, клевета и организованный буллинг (MOD-01);
2. Несанкционированная реклама, навязчивый спам и реферальные схемы (SPAM-01);
3. Материалы сексуального характера и откровенный контент NSFW;
4. Разжигание социальной, национальной и иной вражды.

Каждый модератор обязан соблюдать строгий нейтралитет и руководствоваться только утвержденными регламентами базы знаний.`
  },
  {
    id: 'wiki-2',
    code: 'SPAM-01',
    title: 'Работа с жалобами на спам',
    cat: 'Модератор',
    count: 24,
    readTime: '3 мин.',
    criteria: [
      'Использование сокращателей ссылок (clck, bit.ly, tinyurl) для обхода фильтров',
      'Обещания мгновенного обогащения без вложений',
      'Автоматизированная рассылка одинаковых сообщений бот-аккаунтами'
    ],
    sanctions: [
      'Удаление всех публикаций нарушителя',
      'Временный бан на 7 суток для спам-профилей',
      'Перманентная блокировка при подтверждении ботнета'
    ],
    workflow: [
      '1. Проверить целевой URL на предмет мошеннических редиректов',
      '2. Выбрать действие AGREE для мгновенного удаления',
      '3. Добавить домен в список автофильтрации антиспама'
    ],
    violationExamples: [
      '«🔥 Зарабатывай от 15 000 рублей в день прямо со смартфона! Ссылка: clck.ru/...»',
      'Массовая рассылка ссылок на сомнительные телеграм-каналы с инвестициями'
    ],
    linkedComplaintTypes: ['Спам', 'Реклама', 'Ботнет'],
    content: `Как отличить спам от обычных сообщений?
Всегда обращайте внимание на частоту отправки, наличие подозрительных сокращенных ссылок, предложений о мгновенном легком заработке без вложений, а также признаков шаблонного текста.

В случае выявления массовой спам-атаки от ботнетов, незамедлительно используйте инструмент AGREE и блокировку профиля для полной зачистки материалов.`
  },
  {
    id: 'wiki-3',
    code: 'MOD-02',
    title: 'Модерация нецензурных выражений',
    cat: 'Модератор',
    count: 18,
    readTime: '3 мин.',
    criteria: [
      'Адресное употребление мата в спорах между пользователями',
      'Нецензурные оскорбления родственников или близких собеседника',
      'Систематическая обсценная брань в публичных сообществах'
    ],
    sanctions: [
      'Удаление нецензурного комментария',
      'Блокировка комментирования на 24 часа при повторе',
      'Блокировка аккаунта на 7 суток при злостном рецидиве'
    ],
    workflow: [
      '1. Убедиться, что мат носит адресный оскорбительный характер',
      '2. Применить удаление контента (AGREE)',
      '3. При рецидиве выписать суточный режим чтения (Read-Only)'
    ],
    violationExamples: [
      '«Слушай меня сюда, пошёл ты на *** со своими советами, ублюдок...»'
    ],
    linkedComplaintTypes: ['Нецензурные выражения', 'Мат', 'Оскорбление'],
    content: `Применение мата на площадке регулируется общим контекстом общения.
Прямые личные оскорбления собеседников с использованием мата подлежат безусловным штрафным санкциям и временной блокировке.

Эмоциональные выкрики или художественные цитаты без перехода на конкретные личности могут быть отредактированы или удалены по факту обоснованной жалобы.`
  },
  {
    id: 'wiki-4',
    code: 'MOD-03',
    title: 'Борьба с флудом и оффтопом',
    cat: 'Модератор',
    count: 11,
    readTime: '2 мин.',
    criteria: [
      'Отправка трех и более одинаковых сообщений подряд',
      'Выпрашивание взаимных подписок и оценок в чужих обсуждениях',
      'Публикация нерелевантных картинок и стикеров с целью засорения темы'
    ],
    sanctions: [
      'Скрытие флуд-сообщений из обсуждения',
      'Предупреждение пользователю в системных уведомлениях',
      'Блокировка постинга на 12 часов'
    ],
    workflow: [
      '1. Скрыть дублированные сообщения (AGREE)',
      '2. Вынести нарушителю мягкое системное предупреждение'
    ],
    violationExamples: [
      '«Взаимная подписка и лайки на все посты! Ставьте лайк на аватарку и пишите + в лс!»'
    ],
    linkedComplaintTypes: ['Флуд', 'Оффтоп', 'Накрутка'],
    content: `Флудом официально считается отправка трех и более одинаковых или схожих по смыслу сообщений подряд.

Особый фокус внимания следует направлять на массовое выпрашивание оценок или взаимной подписки в обсуждениях. Такой контент скрывается от показа в ленте автоматически, а нарушителям выносится регламентное предупреждение.`
  },
  {
    id: 'wiki-11',
    code: 'SEC-01',
    title: 'Предотвращение фишинга и кражи сессий',
    cat: 'Безопасность',
    count: 16,
    readTime: '4 мин.',
    criteria: [
      'Поддельные страницы входа ИТД или партнерских банков',
      'Ссылки на вредоносные скрипты и кражу auth-токенов',
      'Сообщения от поддельных ботов техподдержки с требованием пароля'
    ],
    sanctions: [
      'Перманентная блокировка профиля злоумышленника',
      'Внесение домена в глобальный blacklist',
      'Сброс активных сессий обманутых пользователей'
    ],
    workflow: [
      '1. Зафиксировать фишинговый URL и заблокировать профиль немедленно',
      '2. Передать домен дежурному инженеру безопасности для блокировки по шлюзу'
    ],
    violationExamples: [
      '«Внимание! Ваш аккаунт зафиксирован при входе. Подтвердите данные по ссылке: login-security-check...»',
      '«Оплатите бронь по ссылке: sber-safe-escrow-payment94.ru/order-verify»'
    ],
    linkedComplaintTypes: ['Фишинг', 'Взлом', 'Мошенничество'],
    content: `Фишинг несёт критическую угрозу безопасности конфиденциальных данных пользователей платформы «ИТД».

Модераторы обязаны незамедлительно блокировать учетные записи, распространяющие фишинговые ссылки, и передавать адреса подозрительных шлюзов в отдел кибербезопасности для включения в общесистемные черные списки.`
  },
  {
    id: 'wiki-12',
    code: 'SEC-02',
    title: 'Защита конфиденциальных данных (GDPR)',
    cat: 'Безопасность',
    count: 12,
    readTime: '3 мин.',
    criteria: [
      'Публикация паспортных данных, СНИЛС, ИНН третьих лиц',
      'Разглашение номеров телефонов и домашних адресов без согласия',
      'Публикация банковских реквизитов и закрытых документов'
    ],
    sanctions: [
      'Немедленное удаление персональных данных (AGREE)',
      'Блокировка аккаунта распространителя на 14–30 дней',
      'Внесение инцидента в журнал аудита безопасности'
    ],
    workflow: [
      '1. Незамедлительно удалить публикацию с персональными данными',
      '2. Заблокировать автора на время расследования',
      '3. Оповестить пострадавшего пользователя о принятых мерах защиты'
    ],
    violationExamples: [
      '«Вот реальный адрес и телефон должника: г. Москва, ул. Ленина д. 14, кв. 82. Телефон +7 (916)...»'
    ],
    linkedComplaintTypes: ['Разглашение данных', 'Доксинг', 'GDPR'],
    content: `Сотрудники администрации и пользователи платформы обязаны строго соблюдать нормативы конфиденциальности.

Разглашение персональных сведений (включая номера телефонов, пароли, адреса IP-авторизаций, банковские карты, паспортные данные) без согласия владельца является грубым нарушением закона и правил платформы.`
  },
  {
    id: 'wiki-5',
    code: 'SUP-01',
    title: 'Протокол взаимодействия с Support',
    cat: 'Поддержка',
    count: 15,
    readTime: '3 мин.',
    criteria: [
      'Эскалация сложных инцидентов на старших инженеров',
      'Маркировка обращений тегом DEV_READY',
      'Фиксация сбоев в работе биллинга и авторизации'
    ],
    sanctions: [],
    workflow: [
      '1. Зарегистрировать входящий тикет',
      '2. Проверить воспроизводимость бага',
      '3. Передать обращение ведущему разработчику'
    ],
    violationExamples: [],
    linkedComplaintTypes: ['Поддержка', 'Тикеты'],
    content: `Регламент взаимодействия со службой технической поддержки определяет порядок эскалации сложных вопросов на старших администраторов.

Все обращения пользователей, требующие вмешательства бэкенд-инженеров или исправления записей в базе данных, помечаются маркером "DEV_READY".`
  },
  {
    id: 'wiki-6',
    code: 'SUP-02',
    title: 'Этика общения в тикетах у поддержки',
    cat: 'Поддержка',
    count: 22,
    readTime: '3 мин.',
    criteria: [
      'Вежливость и эмпатия при любых обстоятельствах',
      'Запрет на сарказм и споры с заявителем',
      'Использование утвержденных корпоративных шаблонов'
    ],
    sanctions: [],
    workflow: [],
    violationExamples: [],
    linkedComplaintTypes: [],
    content: `Будьте предельно вежливы и профессиональны в любой ситуации, даже если пользователь идет на прямые провокации, грубит и хамит.

Наша ключевая задача — успокоить человека и оперативно решить его затруднение. Придерживайтесь нейтральных словесных конструкций.`
  },
  {
    id: 'wiki-7',
    code: 'SUP-03',
    title: 'Решение споров и сбоев по платежам',
    cat: 'Поддержка',
    count: 14,
    readTime: '3 мин.',
    criteria: [
      'Проверка банковского PDF-чека',
      'Сверка ID транзакции в шлюзе',
      'Ручная активация услуг при задержках банка'
    ],
    sanctions: [],
    workflow: [],
    violationExamples: [],
    linkedComplaintTypes: [],
    content: `Алгоритм обработки тикетов по задержкам оплат:
1. Запросите у обратившегося чек операции (желательно PDF-версию с деталями банка);
2. Проверьте ID транзакции в нашей биллинговой системе;
3. При статусе платежа "В обработке" попросите подождать до 1-2 часов;
4. При системной ошибке - инициируйте процедуру ручной активации пакета.`
  },
  {
    id: 'wiki-8',
    code: 'SUP-04',
    title: 'Восстановление взломанных профилей',
    cat: 'Поддержка',
    count: 32,
    readTime: '4 мин.',
    criteria: [
      'Проверка истории IP-адресов и сессий',
      'Фото заявителя с паспортом на фоне открытого обращения',
      'Сброс скомпрометированных контактных данных'
    ],
    sanctions: [],
    workflow: [],
    violationExamples: [],
    linkedComplaintTypes: [],
    content: `Если пользователь утверждает, что потерял контроль над аккаунтом:
1. Проанализируйте историю входов, IP-адресов и последние действия.
2. Попросите пользователя прислать качественное фото на фоне открытого тикета.
3. Сравните био-данные страницы. При совпадении критериев деактивируйте старое мыло и телефон, выдав ссылку на ввод нового пароля.`
  },
  {
    id: 'wiki-9',
    code: 'SEC-03',
    title: 'Критерии верификации профилей',
    cat: 'Безопасность',
    count: 27,
    readTime: '3 мин.',
    criteria: [
      'Полностью заполненные поля профиля',
      'Отсутствие активных блокировок за 90 дней',
      'Подтверждение публичности или авторства'
    ],
    sanctions: [],
    workflow: [],
    violationExamples: [],
    linkedComplaintTypes: [],
    content: `Базовые требования для прохождения верификации и выдачи официальной галочки:
1. Полностью заполненные поля профиля, включая имя, фамилию, дату рождения и город.
2. Наличие качественного реального аватара человека.
3. Абсолютное отсутствие блокировок и предупреждений за последние 90 дней.
4. Документальное подтверждение медийности (ссылки на статьи в СМИ, крупные каналы).`
  },
  {
    id: 'wiki-10',
    code: 'SEC-04',
    title: 'Анализ логов безопасности входа',
    cat: 'Безопасность',
    count: 9,
    readTime: '3 мин.',
    criteria: [
      'Несоответствие геолокации и провайдера',
      'Подозрительные отпечатки браузера User-Agent',
      'Автоматический 24-часовой карантин при аномалиях'
    ],
    sanctions: [],
    workflow: [],
    violationExamples: [],
    linkedComplaintTypes: [],
    content: `Каждый раз при авторизации пользователя с нового диапазона IP-сетей, система проводит проверку его отпечатков браузера (User-Agent, куки, локаль).

При сильном расхождении на аккаунт накладывается временный запрет сброса паролей на 24 часа для защиты от кражи сессии.`
  },
  {
    id: 'wiki-13',
    code: 'REG-01',
    title: 'Разбор поданных апелляций на бан',
    cat: 'Регламент',
    count: 35,
    readTime: '4 мин.',
    criteria: [
      'Анализ архива нарушений',
      'Проверка обстоятельств взлома',
      'Смягчение санкции при признании вины и исправлении'
    ],
    sanctions: [],
    workflow: [],
    violationExamples: [],
    linkedComplaintTypes: [],
    content: `При изучении аргументации в заявках на разблокировку:
1. Оцените общее количество и частоту прошлых нарушений.
2. Проверьте архив удаленных постов, послуживших триггером бана.
3. Если пользователь искренне раскаивается, сменил пароли при взломе и не допускал рецидивов - вечную блокировку допускается заменить временной или снять.`
  },
  {
    id: 'wiki-14',
    code: 'REG-02',
    title: 'Действия при аварии на серверах',
    cat: 'Регламент',
    count: 8,
    readTime: '2 мин.',
    criteria: [
      'Предотвращение паники среди пользователей',
      'Публикация закрепленного статусного сообщения',
      'Перевод обращений в режим штатного ожидания'
    ],
    sanctions: [],
    workflow: [],
    violationExamples: [],
    linkedComplaintTypes: [],
    content: `В случае выявления масштабных технических неисправностей (отказ СУБД, падение серверов доставки контента):
1. Модераторам запрещено плодить панику.
2. Закрепите сверху в ленте сообщение от тех. отдела об идущих работах.
3. Закрытые тикеты задержите до стабилизации систем, все обращения переводите на регламентный режим ожидания.`
  },
  {
    id: 'wiki-15',
    code: 'INS-01',
    title: 'Инструкция по использованию админ-панели',
    cat: 'Инструкции',
    count: 41,
    readTime: '3 мин.',
    criteria: [
      'Навигация по разделам очередей модерации',
      'Быстрые горячие клавиши модератора',
      'Работа с фильтрами стоп-слов и спам-шаблонов'
    ],
    sanctions: [],
    workflow: [],
    violationExamples: [],
    linkedComplaintTypes: [],
    content: `Вспомогательный гид по возможностям веб-интерфейса:
- Левый сайдбар группирует все оперативные queues.
- В ленте активности клик мгновенно открывает профиль зафиксированного пользователя с возможностью экспресс-блокировки.
- Фильтры поиска поддерживают детекцию стоп-слов и спам-шаблонов.`
  },
  {
    id: 'wiki-16',
    code: 'INS-02',
    title: 'Стандарты оценки качества персонала',
    cat: 'Инструкции',
    count: 11,
    readTime: '3 мин.',
    criteria: [
      'Показатель среднего времени ответа ART',
      'Процент корректных аудитов от ОКК (не менее 90%)',
      'Отсутствие необоснованных блокировок пользователей'
    ],
    sanctions: [],
    workflow: [],
    violationExamples: [],
    linkedComplaintTypes: [],
    content: `Ключевые KPI эффективности сотрудников поддержки и модерации:
- Показатель ART (Average Response Time) — среднее время ответа на тикет.
- Доля успешных аудитов от отдела качества (минимум 90% корректных решений в выборке).
- Количество повторных жалоб от пользователей, спровоцированных некорректными трактовками правил.`
  }
];

/**
 * Official Complaints strictly corresponding to Knowledge Base articles and rules.
 * No arbitrary dummy text or offensive slurs; all entries represent realistic platform moderation cases.
 */
export const OFFICIAL_KB_COMPLAINTS: Complaint[] = [
  {
    id: 'kb-comp-1',
    userId: 'u-melnikov',
    userName: 'Дмитрий Мельников',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
    type: 'Публикация',
    content: 'Ты совершенно бездарный верстальщик, уходи из профессии и не позорься здесь. Никто с тобой работать не будет, бездарь и неудачник.',
    reason: 'Оскорбление личности и буллинг',
    rating: '0.88',
    dept: 'Модерация',
    wikiArticleId: 'wiki-1',
    wikiArticleTitle: 'Основы модерации контента',
    wikiRule: 'Основы модерации контента • Пункт 1: Оскорбления личности и буллинг',
    ruleCode: 'MOD-01',
    status: 'pending',
    timestamp: new Date(Date.now() - 15 * 60 * 1000)
  },
  {
    id: 'kb-comp-2',
    userId: 'u-fast-money',
    userName: 'Быстрый Доход 2026',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop',
    type: 'Спам-рассылка',
    content: '🔥 Зарабатывай от 15 000 рублей в день прямо со смартфона без опыта! Переходи в нашего бота по ссылке: https://clck.ru/earn-fast-online и забирай бонус 3000₽ прямо сейчас!',
    reason: 'Несанкционированная реклама и спам',
    rating: '0.96',
    dept: 'Spam',
    wikiArticleId: 'wiki-2',
    wikiArticleTitle: 'Работа с жалобами на спам',
    wikiRule: 'Работа с жалобами на спам • Пункт 2: Подозрительные ссылки и заработок',
    ruleCode: 'SPAM-01',
    status: 'pending',
    timestamp: new Date(Date.now() - 25 * 60 * 1000)
  },
  {
    id: 'kb-comp-3',
    userId: 'u-gromov',
    userName: 'Алексей Громов',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    type: 'Комментарий',
    content: 'Слушай меня сюда, пошёл ты на *** со своими советами, ублюдок конченый. Ещё раз вякнешь под моим постом — пожалеешь.',
    reason: 'Модерация нецензурных выражений',
    rating: '0.92',
    dept: 'Модерация',
    wikiArticleId: 'wiki-3',
    wikiArticleTitle: 'Модерация нецензурных выражений',
    wikiRule: 'Модерация нецензурных выражений • Прямые оскорбления собеседников',
    ruleCode: 'MOD-02',
    status: 'pending',
    timestamp: new Date(Date.now() - 40 * 60 * 1000)
  },
  {
    id: 'kb-comp-4',
    userId: 'u-laikov',
    userName: 'Максим Лайков',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    type: 'Флуд',
    content: 'Взаимная подписка и лайки на все посты! Ставьте лайк на аватарку и пишите + в лс, отвечу всем взаимно 100%! Лайкни меня плз! Лайкни меня плз! Лайкни меня плз!',
    reason: 'Борьба с флудом и оффтопом',
    rating: '0.75',
    dept: 'Модерация',
    wikiArticleId: 'wiki-4',
    wikiArticleTitle: 'Борьба с флудом и оффтопом',
    wikiRule: 'Борьба с флудом и оффтопом • Массовое выпрашивание оценок (3+ сообщений)',
    ruleCode: 'MOD-03',
    status: 'pending',
    timestamp: new Date(Date.now() - 55 * 60 * 1000)
  },
  {
    id: 'kb-comp-5',
    userId: 'u-fake-security',
    userName: 'Служба Безопасности',
    userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
    type: 'Фишинг',
    content: 'Внимание! Ваш аккаунт зафиксирован при подозрительном входе. Срочно подтвердите свои учетные данные по ссылке http://login-security-check-auth.ru/verify иначе доступ будет заблокирован через 1 час.',
    reason: 'Предотвращение фишинга и кражи сессий',
    rating: '0.99',
    dept: 'Модерация',
    wikiArticleId: 'wiki-11',
    wikiArticleTitle: 'Предотвращение фишинга и кражи сессий',
    wikiRule: 'Предотвращение фишинга и кражи сессий • Поддельные ссылки и шлюзы',
    ruleCode: 'SEC-01',
    status: 'pending',
    timestamp: new Date(Date.now() - 70 * 60 * 1000)
  },
  {
    id: 'kb-comp-6',
    userId: 'u-drozdov',
    userName: 'Игорь Дроздов',
    userAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop',
    type: 'Профиль',
    content: 'Вот реальный адрес и телефон этого должника: г. Москва, ул. Ленина д. 14, кв. 82. Телефон +7 (916) 432-11-90, паспорт серии 4512. Звоните ему все и требуйте деньги назад!',
    reason: 'Защита конфиденциальных данных (GDPR)',
    rating: '0.93',
    dept: 'Модерация страниц',
    wikiArticleId: 'wiki-12',
    wikiArticleTitle: 'Защита конфиденциальных данных (GDPR)',
    wikiRule: 'Защита конфиденциальных данных (GDPR) • Разглашение персональных сведений',
    ruleCode: 'SEC-02',
    status: 'pending',
    timestamp: new Date(Date.now() - 90 * 60 * 1000)
  }
];

/**
 * Official Dialog Complaints strictly matching Knowledge Base articles and rules without profanities.
 */
export const OFFICIAL_KB_DIALOG_COMPLAINTS: DialogComplaint[] = [
  {
    id: 'dc-phishing',
    offenderId: 'u-kuznetsov',
    offenderName: 'Николай Кузнецов',
    offenderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    offenderTrust: 0.05,
    offenderRisk: 0.98,
    violationType: 'Мошенничество',
    wikiArticleId: 'wiki-11',
    wikiArticleTitle: 'Предотвращение фишинга и кражи сессий',
    wikiRule: 'Предотвращение фишинга и кражи сессий • Поддельные платежные ссылки',
    ruleCode: 'SEC-01',
    source: 'Автофлаг',
    reporterId: 'u-alex',
    reporterName: 'Алексей Петров',
    reporterAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=200&auto=format&fit=crop',
    participants: {
      userA: { name: 'Алексей Петров', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=200&auto=format&fit=crop', isOffender: false },
      userB: { name: 'Николай Кузнецов', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', isOffender: true }
    },
    previewMessages: [
      { id: 'm3-1', senderName: 'Алексей Петров', senderAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=200&auto=format&fit=crop', text: 'Здравствуйте, я по поводу объявления о продаже фотокамеры Sony A7.', timestamp: 'Вчера, 12:00' },
      { id: 'm3-2', senderName: 'Николай Кузнецов', senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', text: 'Да, в наличии. Состояние отличное, полный комплект.', timestamp: 'Вчера, 12:05' },
      { id: 'm3-3', senderName: 'Николай Кузнецов', senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', text: 'Я сейчас в другом городе. Давайте вы мне переведете предоплату 5 000 руб для бронирования доставки?', timestamp: 'Вчера, 12:15', isViolation: true },
      { id: 'm3-4', senderName: 'Николай Кузнецов', senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', text: 'Вот официальная ссылка безопасного шлюза: sber-safe-escrow-payment94.ru/order-verify. Оплатите сейчас, иначе бронь сгорит.', timestamp: 'Вчера, 12:16', isViolation: true }
    ],
    contextBeforeMessages: [
      { id: 'm3-b1', senderName: 'Алексей Петров', senderAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=200&auto=format&fit=crop', text: 'Напишите номер телефона для связи пожалуйста.', timestamp: 'Вчера, 11:45' },
      { id: 'm3-b2', senderName: 'Николай Кузнецов', senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', text: 'Да, конечно: +7-999-123-4567.', timestamp: 'Вчера, 11:50' }
    ],
    contextAfterMessages: [
      { id: 'm3-a1', senderName: 'Алексей Петров', senderAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=200&auto=format&fit=crop', text: 'Это фишинговый адрес, страница имитирует банковский сервис.', timestamp: 'Вчера, 12:20' },
      { id: 'm3-a2', senderName: 'Николай Кузнецов', senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', text: 'Либо оплачиваете сейчас по ссылке, либо лот уходит следующему покупателю.', timestamp: 'Вчера, 12:22' }
    ],
    fullDialogueMessages: [
      { id: 'm3-b1', senderName: 'Алексей Петров', senderAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=200&auto=format&fit=crop', text: 'Напишите номер телефона для связи пожалуйста.', timestamp: 'Вчера, 11:45' },
      { id: 'm3-b2', senderName: 'Николай Кузнецов', senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', text: 'Да, конечно: +7-999-123-4567.', timestamp: 'Вчера, 11:50' },
      { id: 'm3-1', senderName: 'Алексей Петров', senderAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=200&auto=format&fit=crop', text: 'Здравствуйте, я по поводу объявления о продаже фотокамеры Sony A7.', timestamp: 'Вчера, 12:00' },
      { id: 'm3-2', senderName: 'Николай Кузнецов', senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', text: 'Да, в наличии. Состояние отличное, полный комплект.', timestamp: 'Вчера, 12:05' },
      { id: 'm3-3', senderName: 'Николай Кузнецов', senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', text: 'Я сейчас в другом городе. Давайте вы мне переведете предоплату 5 000 руб для бронирования доставки?', timestamp: 'Вчера, 12:15', isViolation: true },
      { id: 'm3-4', senderName: 'Николай Кузнецов', senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', text: 'Вот официальная ссылка безопасного шлюза: sber-safe-escrow-payment94.ru/order-verify. Оплатите сейчас, иначе бронь сгорит.', timestamp: 'Вчера, 12:16', isViolation: true },
      { id: 'm3-a1', senderName: 'Алексей Петров', senderAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=200&auto=format&fit=crop', text: 'Это фишинговый адрес, страница имитирует банковский сервис.', timestamp: 'Вчера, 12:20' },
      { id: 'm3-a2', senderName: 'Николай Кузнецов', senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', text: 'Либо оплачиваете сейчас по ссылке, либо лот уходит следующему покупателю.', timestamp: 'Вчера, 12:22' }
    ],
    aiAnalysis: { threat: 10, toxicity: 35, insult: 10, spam: 45, scam: 98, riskLevel: 'CRITICAL' },
    violationHistory: { violationsCount: 8, warningsCount: 2, blocksCount: 3, lastViolationDate: '2 дня назад', lastViolationReason: 'Фишинговые ссылки' },
    hasCounterComplaint: false
  },
  {
    id: 'dc-harassment',
    offenderId: 'u-volkov',
    offenderName: 'Сергей Волков',
    offenderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    offenderTrust: 0.25,
    offenderRisk: 0.88,
    violationType: 'Угроза',
    wikiArticleId: 'wiki-1',
    wikiArticleTitle: 'Основы модерации контента',
    wikiRule: 'Основы модерации контента • Пункт 1: Оскорбления личности, преследование и буллинг',
    ruleCode: 'MOD-01',
    source: 'Жалобы пользователя',
    reporterId: 'u-kravtsov',
    reporterName: 'Иван Кравцов',
    reporterAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    participants: {
      userA: { name: 'Иван Кравцов', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', isOffender: false },
      userB: { name: 'Сергей Волков', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', isOffender: true }
    },
    previewMessages: [
      { id: 'm1-1', senderName: 'Иван Кравцов', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', text: 'Сергей, дедлайн по контракту прошел 3 дня назад. Когда будут предоставлены материалы?', timestamp: 'Вчера, 18:20' },
      { id: 'm1-2', senderName: 'Сергей Волков', senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', text: 'Я ничего отдавать не собираюсь. Закрой эту тему раз и навсегда.', timestamp: 'Вчера, 18:22' },
      { id: 'm1-3', senderName: 'Сергей Волков', senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', text: 'Если обратишься к юристам компании — я разрушу твою карьеру и сделаю так, что тебя никуда не возьмут.', timestamp: 'Вчера, 18:25', isViolation: true },
      { id: 'm1-4', senderName: 'Сергей Волков', senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', text: 'Я знаю, где ты живешь и где учится твоя сестра. Будешь оглядываться на улице, понял меня?', timestamp: 'Вчера, 18:26', isViolation: true }
    ],
    contextBeforeMessages: [
      { id: 'm1-b1', senderName: 'Сергей Волков', senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', text: 'Давай спишемся позже, я сейчас на встрече.', timestamp: 'Вчера, 15:10' },
      { id: 'm1-b2', senderName: 'Иван Кравцов', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', text: 'Хорошо, жду ответа.', timestamp: 'Вчера, 15:15' }
    ],
    contextAfterMessages: [
      { id: 'm1-a1', senderName: 'Иван Кравцов', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', text: 'Это прямая угроза физической расправой. Я отправляю жалобу модераторам.', timestamp: 'Вчера, 18:30' },
      { id: 'm1-a2', senderName: 'Сергей Волков', senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', text: 'Жалуйся куда угодно, никто тебе не поможет.', timestamp: 'Вчера, 18:31' }
    ],
    fullDialogueMessages: [
      { id: 'm1-b1', senderName: 'Сергей Волков', senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', text: 'Давай спишемся позже, я сейчас на встрече.', timestamp: 'Вчера, 15:10' },
      { id: 'm1-b2', senderName: 'Иван Кравцов', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', text: 'Хорошо, жду ответа.', timestamp: 'Вчера, 15:15' },
      { id: 'm1-1', senderName: 'Иван Кравцов', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', text: 'Сергей, дедлайн по контракту прошел 3 дня назад. Когда будут предоставлены материалы?', timestamp: 'Вчера, 18:20' },
      { id: 'm1-2', senderName: 'Сергей Волков', senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', text: 'Я ничего отдавать не собираюсь. Закрой эту тему раз и навсегда.', timestamp: 'Вчера, 18:22' },
      { id: 'm1-3', senderName: 'Сергей Волков', senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', text: 'Если обратишься к юристам компании — я разрушу твою карьеру и сделаю так, что тебя никуда не возьмут.', timestamp: 'Вчера, 18:25', isViolation: true },
      { id: 'm1-4', senderName: 'Сергей Волков', senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', text: 'Я знаю, где ты живешь и где учится твоя сестра. Будешь оглядываться на улице, понял меня?', timestamp: 'Вчера, 18:26', isViolation: true },
      { id: 'm1-a1', senderName: 'Иван Кравцов', senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', text: 'Это прямая угроза физической расправой. Я отправляю жалобу модераторам.', timestamp: 'Вчера, 18:30' },
      { id: 'm1-a2', senderName: 'Сергей Волков', senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', text: 'Жалуйся куда угодно, никто тебе не поможет.', timestamp: 'Вчера, 18:31' }
    ],
    aiAnalysis: { threat: 94, toxicity: 85, insult: 48, spam: 0, scam: 0, riskLevel: 'CRITICAL' },
    violationHistory: { violationsCount: 12, warningsCount: 4, blocksCount: 2, lastViolationDate: '3 дня назад', lastViolationReason: 'Прямые угрозы в ЛС' },
    hasCounterComplaint: false
  },
  {
    id: 'dc-spam',
    offenderId: 'u-smirnova',
    offenderName: 'Елена Смирнова',
    offenderAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
    offenderTrust: 0.35,
    offenderRisk: 0.74,
    violationType: 'Спам',
    wikiArticleId: 'wiki-2',
    wikiArticleTitle: 'Работа с жалобами на спам',
    wikiRule: 'Работа с жалобами на спам • Пункт 2: Массовая рассылка в ЛС',
    ruleCode: 'SPAM-01',
    source: 'Автофлаг',
    reporterId: 'u-orlov',
    reporterName: 'Дмитрий Орлов',
    reporterAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    participants: {
      userA: { name: 'Дмитрий Орлов', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', isOffender: false },
      userB: { name: 'Елена Смирнова', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop', isOffender: true }
    },
    previewMessages: [
      { id: 'm2-1', senderName: 'Елена Смирнова', senderAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop', text: 'Здравствуйте! Ваш аккаунт отобран для участия в закрытой торговой группе с доходностью 30% в неделю.', timestamp: 'Сегодня, 11:10', isViolation: true },
      { id: 'm2-2', senderName: 'Елена Смирнова', senderAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop', text: 'Для получения приветственного бонуса 50 USDT перейдите по ссылке: https://clck.ru/crypto-bot-start', timestamp: 'Сегодня, 11:11', isViolation: true },
      { id: 'm2-3', senderName: 'Дмитрий Орлов', senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', text: 'Я не подписывался на рассылку, прекратите присылать спам.', timestamp: 'Сегодня, 11:15' },
      { id: 'm2-4', senderName: 'Елена Смирнова', senderAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop', text: 'Осталось всего 2 свободных места! Успейте забрать бонус: https://clck.ru/crypto-bot-start', timestamp: 'Сегодня, 11:16', isViolation: true }
    ],
    contextBeforeMessages: [],
    contextAfterMessages: [],
    fullDialogueMessages: [
      { id: 'm2-1', senderName: 'Елена Смирнова', senderAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop', text: 'Здравствуйте! Ваш аккаунт отобран для участия в закрытой торговой группе с доходностью 30% в неделю.', timestamp: 'Сегодня, 11:10', isViolation: true },
      { id: 'm2-2', senderName: 'Елена Смирнова', senderAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop', text: 'Для получения приветственного бонуса 50 USDT перейдите по ссылке: https://clck.ru/crypto-bot-start', timestamp: 'Сегодня, 11:11', isViolation: true },
      { id: 'm2-3', senderName: 'Дмитрий Орлов', senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', text: 'Я не подписывался на рассылку, прекратите присылать спам.', timestamp: 'Сегодня, 11:15' },
      { id: 'm2-4', senderName: 'Елена Смирнова', senderAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop', text: 'Осталось всего 2 свободных места! Успейте забрать бонус: https://clck.ru/crypto-bot-start', timestamp: 'Сегодня, 11:16', isViolation: true }
    ],
    aiAnalysis: { threat: 0, toxicity: 20, insult: 5, spam: 95, scam: 70, riskLevel: 'HIGH' },
    violationHistory: { violationsCount: 19, warningsCount: 2, blocksCount: 1, lastViolationDate: 'Вчера', lastViolationReason: 'Массовый спам в ЛС' },
    hasCounterComplaint: false
  }
];

/**
 * Resolves governing rule metadata for any complaint text/reason.
 */
export function resolveRuleMetadata(reason?: string, content?: string): KnowledgeRuleMeta {
  const normReason = (reason || '').toLowerCase();
  const normContent = (content || '').toLowerCase();

  if (normReason.includes('фишинг') || normContent.includes('login') || normContent.includes('verify') || normContent.includes('escrow') || normContent.includes('шлюз')) {
    return KNOWLEDGE_BASE_RULES_MAP['SEC-01'];
  }
  if (normReason.includes('персонал') || normReason.includes('данн') || normReason.includes('gdpr') || normReason.includes('доксинг') || normContent.includes('паспорт') || normContent.includes('телефон')) {
    return KNOWLEDGE_BASE_RULES_MAP['SEC-02'];
  }
  if (normReason.includes('спам') || normReason.includes('реклам') || normContent.includes('зарабатывай') || normContent.includes('бонус') || normContent.includes('clck.ru')) {
    return KNOWLEDGE_BASE_RULES_MAP['SPAM-01'];
  }
  if (normReason.includes('нецензур') || normReason.includes('мат') || normContent.includes('***') || normContent.includes('ублюдок')) {
    return KNOWLEDGE_BASE_RULES_MAP['MOD-02'];
  }
  if (normReason.includes('флуд') || normReason.includes('оффтоп') || normContent.includes('лайкни') || normContent.includes('взаимн')) {
    return KNOWLEDGE_BASE_RULES_MAP['MOD-03'];
  }

  // Default to General Content Moderation (MOD-01)
  return KNOWLEDGE_BASE_RULES_MAP['MOD-01'];
}
