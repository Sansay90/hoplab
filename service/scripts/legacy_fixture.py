r"""Синтетическая «старая» база для теста переноса данных (apps/api, import-legacy):
дамп apps/api/test/fixtures/legacy.sql.

Данные создаёт код старого сервиса, а не ручной SQL — форма данных настоящая: схема поднимается миграциями Alembic
на пустой базе, сценарий идёт через HTTP API сервиса (tests.support.Service и Client — как в service/tests), а где
без пивоварни не обойтись (агент, устройство, показания, события, напоминания) — функции и модели сервиса.
Все пароли и токены — тестовые, настоящих данных здесь нет.

Как пересоздать дамп (из папки service/, нужен Postgres и .venv сервиса):

    docker run -d --name hoplab-pg-node -p 127.0.0.1:5434:5432 \
        -e POSTGRES_USER=hoplab -e POSTGRES_PASSWORD=hoplab postgres:17-alpine
    .venv/Scripts/python scripts/legacy_fixture.py --docker hoplab-pg-node \
        --url postgresql+psycopg://hoplab:hoplab@127.0.0.1:5434/hoplab_legacy_fixture_test
    docker rm -f hoplab-pg-node

--url — база для сборки (имя обязано кончаться на _test: её очищают); создаётся сама. pg_dump берётся из PATH, а если
его нет — из контейнера с Postgres: --docker ИМЯ (docker exec ИМЯ pg_dump). Дамп: --no-owner --no-privileges
--column-inserts (INSERT, а не COPY), строки psql-метакоманд (\restrict и т. п.) вырезаются: тест грузит файл
клиентом pg, без psql; строка SET transaction_timeout (её знает только pg_dump 17+) вырезается — дамп грузится и в
Postgres 16. Одно фото в дампе — без превью (thumb = NULL, как до миграции photo_thumbs), у одного напоминания в
ленте data — SQL NULL (у комментариев и ответов там JSON null). Схема старой базы в дампе тоже есть — тест поднимает
её без Alembic. UUID и время при каждой сборке новые: тест читает значения из самой базы, а не сверяет с
константами. Результат — --out (по умолчанию ../apps/api/test/fixtures/legacy.sql). Сервис в этом скрипте не меняется.
"""
import argparse
import io
import json
import shutil
import subprocess
import sys
import time
import urllib.request
import uuid
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote

from PIL import Image
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlmodel import select

SERVICE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVICE_DIR))

from tests.support import Service  # noqa: E402

from app import db, models  # noqa: E402
from app.brewery import agents as agent_tokens  # noqa: E402
from app.brewery.devices import DeviceStore  # noqa: E402
from app.config import Settings  # noqa: E402
from app.push.pusher import Pusher  # noqa: E402
from app.recipes.program import build_program  # noqa: E402

DAY = 86400
PASSWORD = "fixture-password-1"


def at(t):
    return datetime.fromtimestamp(t, UTC)


def png(size, color):
    out = io.BytesIO()
    Image.new("RGB", size, color).save(out, "PNG")
    return out.getvalue()


def send_bytes(client, method, path, data, content_type="image/png", query=""):
    """Тело — сама картинка (аватар, фото): Client шлёт только JSON."""
    req = urllib.request.Request(f"{client.base}/api{path}{query}", data=data, method=method,
                                 headers={"Content-Type": content_type})
    with client.opener.open(req, timeout=30) as r:
        return json.loads(r.read())


def pilsner():
    """Полный рецепт: стиль, засыпь, хмель с сухим охмелением, вода с солями и кислотой, паузы, кипячение, брожение."""
    return {
        "name": "Чешский пилснер", "style": {"code": "3B", "name": "Czech Premium Pale Lager"},
        "batch": {"volume": 30, "efficiency": 83},
        "fermentables": [{"name": "Pilsner", "kind": "grain", "amount": 5.3, "ebc": 3.5, "use": "mash"},
                         {"name": "Caramunich I", "kind": "grain", "amount": 0.3, "ebc": 90, "use": "mash"}],
        "hops": [{"name": "Saaz", "alpha": 3.5, "amount": 60, "use": "boil", "minutes": 60},
                 {"name": "Saaz", "alpha": 3.5, "amount": 40, "use": "boil", "minutes": 15},
                 {"name": "Saaz", "alpha": 3.5, "amount": 30, "use": "dry_hop", "day": 5}],
        "miscs": [{"name": "Ирландский мох", "kind": "fining", "amount": 1, "unit": "pcs", "use": "boil",
                   "minutes": 10}],
        "yeasts": [{"name": "W-34/70", "form": "dry", "amount": 2, "unit": "pkg", "attenuation": 80}],
        "water": {"ratio": 3.0, "ph": 5.3, "source": {},
                  "additions": [{"agent": "cacl2", "amount": 2.5, "target": "mash"},
                                {"agent": "lactic80", "amount": 3, "target": "mash"}]},
        "mash": [{"name": "Белковая", "temp": 52, "minutes": 10}, {"name": "Осахаривание", "temp": 65, "minutes": 50},
                 {"name": "Мэш-аут", "temp": 78, "minutes": 10}],
        "boil": {"minutes": 90},
        "fermentation": [{"name": "Основное", "temp": 10, "days": 10, "until": "gravity", "gravity": 1.020},
                         {"name": "Диацетиловая пауза", "temp": 16, "days": 3},
                         {"name": "Лагеризация", "temp": 3, "days": 21}],
        "notes": "Тестовый рецепт для проверки переноса.",
    }


def wheat():
    return {
        "name": "Светлое пшеничное", "batch": {"volume": 25, "efficiency": 75},
        "fermentables": [{"name": "Wheat Blanc", "amount": 2.5, "ebc": 4},
                         {"name": "Pilsner", "amount": 2.5, "ebc": 3.5}],
        "hops": [{"name": "Hallertau", "alpha": 4.0, "amount": 25, "use": "boil", "minutes": 60}],
        "yeasts": [{"name": "WB-06", "attenuation": 78}],
        "mash": [{"name": "Осахаривание", "temp": 66, "minutes": 60}], "boil": {"minutes": 60},
        "fermentation": [{"name": "Брожение", "temp": 20, "until": "fg"}],
    }


def private_short():
    return {"name": "Личный: короткая программа", "mash": [{"name": "Пауза", "temp": 65, "minutes": 30}],
            "boil": {"minutes": 30}, "hops": [{"name": "Test", "amount": 10, "use": "boil", "minutes": 5}]}


def ensure_database(url):
    u = make_url(url)
    admin = create_engine(u.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as c:
        if not c.execute(text("select 1 from pg_database where datname = :n"), {"n": u.database}).scalar():
            c.execute(text(f'create database "{u.database}"'))
    admin.dispose()
    clean = create_engine(url)
    with clean.begin() as c:                                 # с чистого листа: схему поднимут миграции сервиса
        c.execute(text("drop schema public cascade; create schema public"))
    clean.dispose()


def scenario(service, url):
    """Прогнать сценарий: люди, рецепты, обсуждение, оборудование, партии. Возвращает короткую сводку."""
    state = service.state
    outbox = service.outbox
    now = time.time()

    # ── люди ──────────────────────────────────────────────────────────────────
    admin = service.client()
    status, admin.me = admin.signup("admin@fixture.test", PASSWORD, "Хмелевар")       # первый — администратор
    assert status == 200, admin.me
    admin.ok("POST", "/auth/verify", {"token": outbox.link("verify")})
    reader = service.client()
    status, reader.me = reader.signup("reader@fixture.test", PASSWORD, "Читатель")
    assert status == 200, reader.me
    reader.ok("POST", "/auth/verify", {"token": outbox.link("verify")})
    unverified = service.client()
    status, unverified.me = unverified.signup("unverified@fixture.test", PASSWORD, "Новичок")
    assert status == 200, unverified.me                    # письмо подтверждения не использовано — токен verify живой

    # сброс пароля: использованный токен reset, прежние входы закрыты, новый вход
    service.client().ok("POST", "/auth/forgot", {"email": "reader@fixture.test"})
    reader.ok("POST", "/auth/reset", {"token": outbox.link("reset"), "password": PASSWORD})
    service.client().ok("POST", "/auth/forgot", {"email": "unverified@fixture.test"})   # неиспользованный reset
    reader2 = service.client()                              # второй вход читателя — вторая сессия
    assert reader2.post("/auth/login", {"email": "reader@fixture.test", "password": PASSWORD})[0] == 200

    send_bytes(admin, "PUT", "/auth/me/avatar", png((300, 300), (200, 140, 30)))
    admin_id, reader_id, unverified_id = (uuid.UUID(c.me["id"]) for c in (admin, reader, unverified))

    # ── рецепты, фото, избранное, голоса ──────────────────────────────────────
    r_pils = admin.ok("POST", "/recipes", pilsner())["id"]
    admin.ok("PUT", f"/recipes/{r_pils}/visibility", {"visibility": "public"})
    r_short = admin.ok("POST", "/recipes", private_short())["id"]
    r_wheat = reader.ok("POST", "/recipes", wheat())["id"]
    reader.ok("PUT", f"/recipes/{r_wheat}/visibility", {"visibility": "public"})
    reader.ok("POST", "/recipes", {"name": "Черновик читателя"})

    send_bytes(admin, "POST", f"/recipes/{r_pils}/photos", png((640, 480), (230, 190, 60)))
    send_bytes(admin, "POST", f"/recipes/{r_pils}/photos", png((800, 600), (180, 120, 40)),
               query="?credit=" + quote("Фото автора, CC-BY"))
    send_bytes(admin, "POST", f"/recipes/{r_short}/photos", png((320, 240), (90, 60, 30)), "image/png")
    send_bytes(reader, "POST", f"/recipes/{r_wheat}/photos", png((480, 480), (240, 220, 120)))

    reader.ok("PUT", f"/recipes/{r_pils}/favorite")
    admin.ok("PUT", f"/recipes/{r_pils}/favorite")                 # своё в избранном — тоже можно
    admin.ok("PUT", f"/recipes/{r_wheat}/favorite")
    reader.ok("PUT", f"/recipes/{r_pils}/vote", {"value": 1})
    unverified.ok("PUT", f"/recipes/{r_pils}/vote", {"value": -1})
    admin.ok("PUT", f"/recipes/{r_wheat}/vote", {"value": 1})

    # ── обсуждение и уведомления о нём ────────────────────────────────────────
    c1 = reader.ok("POST", f"/recipes/{r_pils}/comments", {"text": "Отличный рецепт, сварил — вышло чисто."})["id"]
    c2 = admin.ok("POST", f"/recipes/{r_pils}/comments",
                  {"text": "Спасибо! Диацетиловую паузу не пропускай.", "parentId": c1})["id"]
    reader.ok("POST", f"/recipes/{r_pils}/comments",
              {"text": "Не пропущу. А сухое охмеление — на 5-й день?", "parentId": c2})
    reader.ok("PATCH", f"/comments/{c1}", {"text": "Отличный рецепт, сварил — вышло очень чисто."})        # edited_at
    c5 = reader.ok("POST", f"/recipes/{r_pils}/comments", {"text": "Этот комментарий потом удалю."})["id"]
    admin.ok("POST", f"/recipes/{r_pils}/comments", {"text": "Ответ на тот, что удалят.", "parentId": c5})
    reader.ok("DELETE", f"/comments/{c5}")                  # с ответом — остаётся пустым (deleted_at)
    admin.ok("POST", f"/recipes/{r_wheat}/comments", {"text": "Интересное пшеничное."})
    c_u = unverified.ok("POST", f"/recipes/{r_wheat}/comments", {"text": "А дрожжи можно заменить?"})["id"]
    reader.ok("PUT", f"/comments/{c2}/vote", {"value": 1})
    admin.ok("PUT", f"/comments/{c1}/vote", {"value": 1})
    admin.ok("PUT", f"/comments/{c_u}/vote", {"value": -1})
    first = reader.ok("GET", "/notifications")[-1]["id"]
    reader.ok("POST", "/notifications/read", {"ids": [first]})                  # одно прочитано, остальные нет
    reader.ok("PUT", "/notifications/settings", {"pushBrews": False})

    # ── оборудование, агент, пивоварня ────────────────────────────────────────
    token = agent_tokens.create(admin_id, "Агент дома")
    agent_tokens.create(admin_id, "Запасной агент")                             # ни разу не подключался
    agent = agent_tokens.by_token(token)
    agent_tokens.touch(agent.id)
    device_id = DeviceStore().attach(agent, "fixture-easybrew-1", "Easy Brew 40", model="easybrew40",
                                     limits={"maxSteps": 9, "maxAdditions": 9, "minTemp": 20.0, "maxTemp": 100.0,
                                             "boilTemp": 100.1, "minWatts": 500, "maxWatts": 3500, "wattsStep": 100})
    admin.ok("POST", "/equipment", {"name": "Кастрюля 30 л", "kind": "manual", "volume": 30, "efficiency": 70,
                                    "evaporation": 3.5, "kettle": 35, "notes": "запасная"})
    admin.ok("POST", "/equipment", {"name": "ЦКТ 32 л", "kind": "fermenter", "props": {"volume": 32}})
    reader.ok("POST", "/equipment", {"name": "Котёл читателя", "kind": "manual", "volume": 20, "efficiency": 72})
    admin_equipment = admin.ok("GET", "/equipment")
    assert sum(1 for e in admin_equipment if e["main"]) == 1, admin_equipment

    # ── партии ────────────────────────────────────────────────────────────────
    # ручная: сварена 10 дней назад, брожение по плану; журнал и напоминания по плану брожения
    manual = reader.ok("POST", "/brews", {"recipeId": r_pils, "startedAt": now - 10 * DAY})
    mid = manual["id"]
    for kind, value, text_, t in (("mash_temp", 65.2, None, now - 10 * DAY), ("og", 1.049, None, now - 10 * DAY + 3600),
                                  ("pitch", None, None, now - 10 * DAY + 7200),
                                  ("pitch_temp", 12.5, None, now - 10 * DAY + 7260),
                                  ("gravity", 1.032, None, now - 7 * DAY),
                                  ("note", None, "Кружение на ночь", now - 6 * DAY),
                                  ("gravity", 1.021, None, now - 4 * DAY)):
        reader.ok("POST", f"/brews/{mid}/entries", {"kind": kind, "value": value, "text": text_, "at": t})
    state.reminders.tick(at(now))                          # всё, что подошло, — отмечено; старое — молча

    # вторая ручная — свежая: напоминание уходит и попадает в ленту
    fresh = reader.ok("POST", "/brews", {"recipeId": r_pils})["id"]
    t0 = now - 60
    reader.ok("POST", f"/brews/{fresh}/entries", {"kind": "pitch", "at": t0})
    state.reminders.tick(at(t0 + 4 * DAY + 3600))
    state.reminders.tick(at(t0 + 11 * DAY))

    # с пивоварни: рецепт партии загружен в устройство, показания и события
    device_brew = admin.ok("POST", "/brews", {"recipeId": r_pils, "startedAt": now - 9 * DAY})
    bid = device_brew["id"]
    journal = state.journal
    program = build_program(r_pils, device_brew["snapshot"], bid)
    journal.start_brew(device_id, admin_id, bid, device_brew["name"], r_pils, program, now - 9 * DAY)
    journal.finish_brew(bid, "finished", 6543.2, now - 9 * DAY + 4 * 3600)
    for i in range(240):
        journal.reading(device_id, bid, now - 9 * DAY + i * 60, 20 + (i % 50) * 1.4, 65.0 if i > 30 else None,
                        i // 30, "mash" if i < 120 else "boil")
    journal.reading(device_id, None, now - 2 * DAY, 18.75, None, None, None)      # показание вне варки
    for i, (kind, text_) in enumerate((("start", "Программа запущена"), ("step", "Шаг 1: Белковая"),
                                       ("alert", "Засыпьте солод"), ("addition", "Хмель Saaz 60 г"),
                                       ("end", "Программа закончена"))):
        journal.event(device_id, bid, {"kind": kind, "text": text_, "at": now - 9 * DAY + i * 900,
                                       "step": i, "temp": 50.5 + i})
    journal.event(device_id, None, {"kind": "info", "text": "Агент подключился", "at": now - 2 * DAY})
    assert journal.flush(30)
    admin.ok("POST", f"/brews/{bid}/entries", {"kind": "pitch", "at": now - 9 * DAY + 5 * 3600})
    admin.ok("POST", f"/brews/{bid}/entries", {"kind": "package", "at": now - DAY})

    # ── push, «у себя на ПК», сессия с истёкшим сроком ────────────────────────
    pusher = Pusher("", "mailto:fixture@example.com")
    pusher.subscribe(admin_id, "https://fcm.googleapis.com/fcm/send/fixture-admin",
                     "p256dh-admin-test", "auth-admin-test", "Fixture Chrome")
    pusher.subscribe(reader_id, "https://fcm.googleapis.com/fcm/send/fixture-reader",
                     "p256dh-reader-test", "auth-reader-test", None)
    with db.session() as s:
        local = models.User()                              # без почты и пароля: владелец данных, заведённых до входа
        s.add(local)
        s.flush()
        s.add(models.Recipe(user_id=local.id, name="Рецепт до входа",
                            data={"name": "Рецепт до входа", "notes": "заведён без входа"}))
        s.add(models.Equipment(user_id=local.id, name="Кастрюля до входа", kind="manual", volume=25.0, main=True))
        s.add(models.UserSession(user_id=reader_id, token_hash="0" * 63 + "1", user_agent="Старый браузер",
                                 created_at=at(now - 60 * DAY), last_seen_at=at(now - 45 * DAY),
                                 expires_at=at(now - 15 * DAY)))
        # фото без превью — как до миграции photo_thumbs: у него thumb = NULL
        old_photo = s.exec(select(models.RecipePhoto).where(models.RecipePhoto.recipe_id == uuid.UUID(r_short))).first()
        old_photo.thumb = None
        s.add(old_photo)
        s.flush()
        s.execute(text("update notifications set data = null "
                       "where id = (select id from notifications where kind = 'brew' order by id limit 1)"))
        s.commit()
        local_id = local.id

    return {"admin": admin_id, "reader": reader_id, "unverified": unverified_id, "local": local_id,
            "brews": (mid, fresh, bid)}


def dump(url, out, docker):
    u = make_url(url)
    args = ["pg_dump", "-U", u.username, "-h", u.host or "127.0.0.1", "-p", str(u.port or 5432), "-d", u.database,
            "--no-owner", "--no-privileges", "--column-inserts"]
    env = {"PGPASSWORD": u.password or ""}
    if docker:
        args = ["docker", "exec", "-e", f"PGPASSWORD={u.password or ''}", docker, "pg_dump", "-U", u.username,
                "-d", u.database, "--no-owner", "--no-privileges", "--column-inserts"]
        env = None
    elif not shutil.which("pg_dump"):
        raise SystemExit("pg_dump не найден в PATH — укажите --docker ИМЯ_КОНТЕЙНЕРА с Postgres")
    result = subprocess.run(args, capture_output=True, env=env, check=True)
    sql = result.stdout.decode("utf-8")
    # метакоманды psql (\restrict, \unrestrict…): тест грузит файл клиентом pg
    # SET transaction_timeout (pg_dump 17+) тоже убирается: без неё дамп грузится и в Postgres 16
    lines = [line for line in sql.replace("\r\n", "\n").split("\n")
             if not line.startswith("\\") and not line.startswith("SET transaction_timeout")]
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    Path(out).write_text("\n".join(lines), encoding="utf-8", newline="\n")
    return len(lines)


def main():
    p = argparse.ArgumentParser(description="Собрать синтетическую старую базу и снять дамп legacy.sql")
    p.add_argument("--url", required=True, help="postgresql+psycopg://…/имя_test — база для сборки (будет очищена)")
    p.add_argument("--out", default=str(SERVICE_DIR.parent / "apps" / "api" / "test" / "fixtures" / "legacy.sql"))
    p.add_argument("--docker", help="контейнер с Postgres, если pg_dump нет в PATH")
    args = p.parse_args()
    if not make_url(args.url).database.endswith("_test"):
        raise SystemExit("база должна называться *_test: её очищают")

    ensure_database(args.url)
    db.configure(args.url)
    # _env_file=None: настройки сервиса (service/.env) здесь не читаются
    settings = Settings(_env_file=None, database_url=args.url, app_url="", admin_emails="", vapid_private_key="",
                        smtp_host="")
    service = Service(settings).start()                     # lifespan: миграции Alembic, журнал, напоминания
    try:
        info = scenario(service, args.url)
    finally:
        service.stop()
        db.engine().dispose()
    n = dump(args.url, args.out, args.docker)
    print(f"готово: {args.out} ({n} строк); партии: {', '.join(str(b) for b in info['brews'])}")


if __name__ == "__main__":
    main()
