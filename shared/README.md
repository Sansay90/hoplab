# shared — общие примеры сервиса и packages/core

Пять правил живут и в сервисе, и в `packages/core`: расчёт показателей рецепта (`service/app/recipes/calc.py` ≡ `packages/core/src/calc.ts`), программа пивоварни из рецепта (`service/app/recipes/program.py` ≡ `packages/core/src/program.ts`), пересчёт рецепта под оборудование (`service/app/recipes/scale.py` ≡ `packages/core/src/scale.ts`), расписание брожения партии (`service/app/brewery/reminders.py`, `Ferment` ≡ `packages/core/src/ferment.ts`, `fermentPlan` / `fermentAdvice` / `fermentCalm`) и каталог видов оборудования (`service/app/brewery/kinds.py` ≡ `packages/core/src/kinds.ts`). Чтобы реализации не разошлись, все проверяют себя по одним и тем же примерам. До шага 8 плана переноса на Node (удаление `service/`) файлы остаются здесь, а тесты core читают их отсюда:

| Файл | Что внутри | Кто проверяет |
|---|---|---|
| `calc-cases.json` | рецепт → OG, FG, ABV, IBU, цвет, сбраживание | `service/tests/test_shared.py`, `packages/core/test/shared/calc-cases.test.ts` |
| `program-cases.json` | рецепт → шаги программы, таймеры пивоварни, закладки по минутам | `test_shared.py`, `test/shared/program-cases.test.ts` |
| `scale-cases.json` | рецепт + объём и эффективность (`to`) → рецепт партии: количества и показатели | `test_shared.py`, `test/shared/scale-cases.test.ts` |
| `ferment-cases.json` | план брожения партии, начало, записи журнала и «сейчас» → идущий этап, даты и цели этапов (от фактической OG), «пора» (цель достигнута, замедлилось, плотность встала) и «похоже, закончилось» | `test_shared.py`, `test/shared/ferment-cases.test.ts` |
| `kinds.json` | каталог видов оборудования — то, что отдаёт `GET /api/equipment/kinds` (группы, виды, поля) | `test_shared.py::test_kinds` (файл равен выводу Python), `packages/core/test/kinds.test.ts` (каталог core равен файлу) |

Рецепты в примерах — без названия (у сервиса оно обязательно): их читают расчёты; тест схемы core подставляет название сам. Примеры — настоящие рецепты (их показатели совпадали с посчитанными интерфейсом) и пограничные случаи: без объёма, без дрожжей, сахар и экстракт, первое сусло и вирпул, жжёный солод, закладки вне кипячения.

**Правило изменилось намеренно** — поменять обе реализации, затем пересчитать ожидания по сервису (из `service`: `.venv/Scripts/python ../shared/update.py`; на Linux — `.venv/bin/python`) и убедиться, что core сходится с ними сам (`pnpm --filter @hoplab/core test`). Новый случай — добавить в файл с любым `expected` и пересчитать. После пересчёта `git status shared/` не должен показывать лишнего: изменившийся файл, правило которого не меняли, — реализации уже разошлись.
