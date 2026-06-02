# buggy-bag 🐛

Оверлей для репортингу багів прямо на сторінці — скріншот, анотації, автоматичний tech context. Зроблено для команд, які тестують AI-генерований код.

---

## Що робить

- **Скріншот + малювання** — виділи область, стрілку, пін або виміряй відстань
- **Автоматичний tech context** — route, viewport, React-компонент під курсором, network-запити (включно з помилками), console errors, unhandled exceptions, кроки до бага
- **Shadow DOM** — оверлей не конфліктує зі стилями твого проекту
- **Захист доступу** — виджет не видно без активації; увімкнути можна URL-параметром `?bb=on` або через `localStorage`
- **Alt+B** — хоткей для відкриття/закриття

---

## Встановлення

```bash
npm install buggy-bag
```

Потрібен React ≥ 18 як peer dependency.

---

## Використання

### 1. Додай компонент

```tsx
// App.tsx або layout
import { BuggyBag } from 'buggy-bag';

export default function App() {
  return (
    <>
      <YourApp />
      <BuggyBag
        apiEndpoint="https://your-api.com/api/bugs/submit"
        apiKey="your-api-key"
        portalUrl="https://your-portal.com/bugs"   // опційно — посилання в тості після відправки
      />
    </>
  );
}
```

### 2. Активуй виджет

За замовчуванням виджет **прихований** — щоб не заважати кінцевим юзерам.

**Варіант A — URL параметр (найзручніше для колег):**
```
https://your-app.com/?bb=on
```
Після відкриття параметр зникає з URL, а активація зберігається в `localStorage`.

**Варіант B — вручну в консолі:**
```js
localStorage.setItem('BUGGY_BAG_ACCESS', 'active');
location.reload();
```

**Варіант C — програмно (наприклад, для internal builds):**
```tsx
import { BuggyBag } from 'buggy-bag';

// Завжди активний без перевірки localStorage
// Реалізуй власний guard навколо компонента
```

---

## API endpoint

Виджет робить `POST` на `apiEndpoint` з таким тілом:

```ts
{
  api_key: string;
  base64_image: string;          // "data:image/png;base64,..."
  shapes: DrawShape[];           // намальовані анотації
  annotations: Record<string, string>; // текст до кожної анотації
  description: string;
  tech_context: {
    route: string;               // pathname + search
    viewport: string;            // "1440x900"
    userAgent: string;
    component: { name: string; props?: object } | null;  // React-компонент під курсором
    storeSnapshot: object | null; // zustand/redux стан (маскує sensitive keys)
    networkRequests: Array<{ url, method, status, durationMs, isError }>;
    consoleErrors: Array<{ level, message, source? }>;
    eventLog: Array<{ type, description, timestamp }>;   // останні 30с
    autoSeverity: 'low' | 'medium' | 'high' | 'critical';
  }
}
```

---

## Що ловиться автоматично

| Подія | Як ловиться |
|---|---|
| `console.error / warn` | перехоплення `console[level]` |
| Необроблені JS-помилки | `window.addEventListener('error', ...)` |
| Unhandled promise rejections | `window.addEventListener('unhandledrejection', ...)` |
| Помилки fetch (4xx / 5xx / network) | патч `window.fetch` |
| Кліки на кнопки і посилання | делегування через `document` |
| Навігація (SPA) | патч `history.pushState` + `popstate` |

---

## Props

| Prop | Тип | Опис |
|---|---|---|
| `apiEndpoint` | `string` | URL для відправки репорту |
| `apiKey` | `string` | Ключ авторизації |
| `portalUrl` | `string` | Посилання на баг-трекер (показується в тості після відправки) |

Всі props опційні. Якщо `apiEndpoint` не задано — виджет показує тост «Відправлено (без API)» і нічого не надсилає (зручно для локальної розробки).

---

## Інструменти малювання

| Інструмент | Хоткей | Опис |
|---|---|---|
| Область | клік у меню | Виділення прямокутником |
| Стрілка | клік у меню | Вказати на елемент |
| Пін | клік у меню | Пронумерований маркер |
| Лінійка | клік у меню | Вимірювання відстані в пікселях |
| Піпетка | в попапі анотації | Взяти колір з екрана (Chrome 95+) |

---

## Приклад мінімального backend (Node/Express)

```ts
app.post('/api/bugs/submit', async (req, res) => {
  const { api_key, base64_image, description, tech_context, shapes, annotations } = req.body;

  if (api_key !== process.env.BUGGY_BAG_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Збережи в базу, відправ у Slack, створи GitHub Issue — що завгодно
  console.log('Bug report:', description, tech_context.autoSeverity);

  res.json({ ok: true });
});
```

---

## Ліцензія

MIT
