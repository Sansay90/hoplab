"""Сквозь сервис и агента: пивоварня-имитация, настоящие Controller и Link, настоящий сервис с базой."""
import asyncio
import json
import time

import websockets

from app.db import session
from app.models import Brew, Equipment, Reading, Recipe, from_unix, parse_id

from .conftest import new_agent_token
from .support import eventually

IDLE = {"1": False, "104": 0, "101": 0, "10": 200, "109": "14", "144": 0}


def online(service, brewer, agents):
    """Агент на связи с пивоварней в простое."""
    agent = agents(new_agent_token(brewer))
    agent.brewery.set_online(True)
    agent.brewery.push(IDLE)
    assert eventually(lambda: brewer.get("/state")[1]["online"])
    return agent


def test_without_agent(service, brewer, recipe):
    guest = service.client()
    assert guest.get("/state")[0] == 401
    assert guest.get("/limits")[1]["maxSteps"] == 9                     # ограничения по умолчанию — и гостю
    assert brewer.get("/state")[1]["online"] is False
    assert brewer.post("/recipes", recipe)[0] == 200                   # рецепт сохраняется и без пивоварни
    status, err = brewer.post("/pump", {"on": False})
    assert status == 503 and err["detail"] == "пивоварня не в сети"


def test_bad_token_rejected(service):
    async def connect():
        try:
            async with websockets.connect(f"ws://127.0.0.1:{service.port}/api/agent",
                                          additional_headers={"Authorization": "Bearer nope"}):
                return None
        except websockets.exceptions.InvalidStatus as e:
            return e.response.status_code
    assert asyncio.run(connect()) == 403


def test_limits_from_agent(service, brewer, agents, recipe):
    online(service, brewer, agents)
    limits = brewer.get("/limits")[1]
    assert limits["maxWatts"] == 2500 and limits["wattsStep"] == 100
    rid = brewer.ok("POST", "/recipes", {**recipe, "boil": {**recipe["boil"], "watts": 2600}})["id"]
    assert brewer.ok("GET", f"/recipes/{rid}")["boil"]["watts"] is None       # у рецепта мощности нет
    with session() as s:                                                     # сохранённый с мощностью до — тоже
        s.get(Recipe, parse_id(rid)).data = {**recipe, "targets": {}}
        s.commit()
    shown = brewer.ok("GET", f"/recipes/{rid}")
    assert shown["boil"]["watts"] is None and all(st["watts"] is None for st in shown["mash"])
    bid = brewer.ok("POST", "/brews", {"recipeId": rid, "watts": [2500, 1500, 1000, 2600]})["id"]
    status, err = brewer.post(f"/brews/{bid}/upload")
    assert status == 400 and "мощность 2600" in err["detail"]          # пивоварня такую программу не примет


def test_readings_after_program(service, brewer, agents, recipe):
    """График партии: пока идёт варочный день, показания её пивоварни вне программы (охлаждение после конца) — тоже
    её; после конца дня и чужой варки — нет."""
    online(service, brewer, agents)
    rid = brewer.ok("POST", "/recipes", recipe)["id"]
    batch = brewer.ok("POST", "/brews", {"recipeId": rid})
    [eq] = brewer.ok("GET", "/equipment")
    start = batch["startedAt"] - 600                                         # партия начата 10 мин назад
    with session() as s:
        s.get(Brew, parse_id(batch["id"])).started_at = from_unix(start)
        device = s.get(Equipment, parse_id(eq["id"])).device_id
        other = Brew(user_id=parse_id(brewer.me["id"]), source="device", device_id=device, name="Другая",
                     started_at=from_unix(start))
        s.add(other)
        s.flush()
        for dt, temp, brew in [(-60, 15.0, None), (60, 63.0, None), (120, 40.0, None), (90, 70.0, other.id)]:
            s.add(Reading(device_id=device, brew_id=brew, at=from_unix(start + dt), temp=temp))
        s.commit()
    mine = {15.0, 63.0, 40.0, 70.0, 12.0}                                   # имитация сама шлёт 20 °C — не наши
    shown = lambda: [p[1] for p in brewer.ok("GET", f"/brews/{batch['id']}/readings") if p[1] in mine]  # noqa: E731
    assert shown() == [63.0, 40.0]
    pitch = next(st["index"] for st in batch["brewDay"] if st["kind"] == "pitch")
    brewer.ok("POST", f"/brews/{batch['id']}/entries", {"kind": "step", "value": pitch, "at": start + 150})
    assert shown() == [63.0, 40.0]                                           # сусло в ферментере — котёл дальше не её
    with session() as s:
        s.add(Reading(device_id=device, brew_id=None, at=from_unix(start + 200), temp=15.0))   # вода с теста
        s.commit()
    assert shown() == [63.0, 40.0]
    brewer.ok("POST", f"/brews/{batch['id']}/finish")                       # день позади — новые показания не её
    with session() as s:
        s.add(Reading(device_id=device, brew_id=None, at=from_unix(time.time() + 30), temp=12.0))
        s.commit()
    assert shown() == [63.0, 40.0]


def loaded(brewer, bid):
    """Программа партии bid — в пивоварне (так её видит сервис)."""
    return eventually(lambda: (r := brewer.get("/state")[1]["deviceRecipe"]) and r.get("brewId") == bid and r)


def test_batch_power(service, brewer, agents, recipe):
    """Мощность ТЭНа задают при «Сварить»: она — у партии, на шагах варочного дня и в программе пивоварни;
    в следующую «Сварить» подставляется прошлая. Без мощности — потолок модели."""
    online(service, brewer, agents)
    rid = brewer.ok("POST", "/recipes", recipe)["id"]
    batch = brewer.ok("POST", "/brews", {"recipeId": rid, "watts": [1500, 1500, 2000, 2400]})
    assert [st["watts"] for st in batch["snapshot"]["mash"]] == [1500, 1500, 2000]
    by_kind = {st["kind"]: st["measures"] for st in batch["brewDay"]}
    assert by_kind["mash_in"] == ["mash_temp"]                               # программа ещё не шла — замер рукой
    assert next(st for st in batch["brewDay"] if st["kind"] == "rest")["measures"] == ["ph", "mash_gravity"]
    assert {st["kind"]: st["watts"] for st in batch["brewDay"] if st["watts"]} == {"heat": 1500, "rest": 2000,
                                                                                      "boil": 2400}
    brewer.ok("POST", f"/brews/{batch['id']}/upload")
    program = loaded(brewer, batch["id"])
    assert [st["watts"] for st in program["steps"]] == [1500, 1500, 2000, 2400]
    [eq] = brewer.ok("GET", "/equipment")
    assert eq["watts"] == {"mash": [1500, 1500, 2000], "boil": 2400, "heat": None}

    status, err = brewer.post("/brews", {"recipeId": rid, "watts": [1500, 2400]})
    assert status == 400 and "по одной на каждую паузу" in err["detail"]
    plain = brewer.ok("POST", "/brews", {"recipeId": rid})                  # без мощности — при загрузке потолок
    assert all(st["watts"] is None for st in plain["brewDay"])
    assert brewer.ok("GET", "/equipment")[0]["watts"]["boil"] == 2400        # подставляется последняя заданная
    brewer.ok("POST", f"/brews/{plain['id']}/upload")
    program = loaded(brewer, plain["id"])
    assert [st["watts"] for st in program["steps"]] == [2500] * 4

    heated = brewer.ok("POST", "/brews", {"recipeId": rid, "watts": [1500, 1500, 2000, 2400], "heatWatts": 2500})
    assert next(st for st in heated["brewDay"] if st["kind"] == "heat")["watts"] == 2500
    brewer.ok("POST", f"/brews/{heated['id']}/upload")                     # свой нагрев — шаг перед первой паузой
    program = loaded(brewer, heated["id"])
    assert [(st["temp"], st["minutes"], st["watts"]) for st in program["steps"][:2]] == [(30, 1, 2500), (30, 2, 1500)]
    assert len(program["steps"]) == 5 and brewer.ok("GET", "/equipment")[0]["watts"]["heat"] == 2500

    long = brewer.ok("POST", "/recipes", {**recipe, "mash": [{"temp": 30 + i, "minutes": 2} for i in range(8)]})["id"]
    status, err = brewer.post("/brews", {"recipeId": long, "watts": [1500] * 9, "heatWatts": 2500})
    assert status == 400 and "нет места" in err["detail"]                   # 8 пауз + кипячение — для нагрева места нет
    assert brewer.post("/brews", {"recipeId": long, "watts": [1500] * 9, "heatWatts": 1500})[0] == 200   # как у паузы

    pot = brewer.ok("POST", "/equipment", {"name": "Кастрюля", "kind": "manual", "volume": 20, "efficiency": 75})
    status, err = brewer.post("/brews", {"recipeId": rid, "equipmentId": pot["id"], "watts": [1500, 1500, 2000, 2400]})
    assert status == 400 and "только для пивоварни" in err["detail"]


def test_command_errors(service, brewer, agents):
    online(service, brewer, agents)
    assert brewer.post("/manual", {"setpoint": 10, "minutes": 5, "watts": 1000})[0] == 400
    assert brewer.post("/alert/confirm")[0] == 400
    status, err = brewer.post("/additions/7/ack")
    assert status == 404 and err["detail"] == "такой закладки не ждём"


def test_batch_brewed_on_the_brewery(service, brewer, agents, recipe):
    """«Сварить» на подключённой пивоварне: программа партии уходит с её id, запущенная — идёт варкой в партию,
    второй варки не появляется."""
    agent = online(service, brewer, agents)
    fake = agent.brewery
    rid = brewer.ok("POST", "/recipes", recipe)["id"]
    batch = brewer.ok("POST", "/brews", {"recipeId": rid})
    assert batch["status"] == "running" and batch["manual"] and batch["equipment"]["name"] == "Имитация"

    brewer.ok("POST", f"/brews/{batch['id']}/upload")
    assert eventually(lambda: (brewer.get("/state")[1]["deviceRecipe"] or {}).get("brewId") == batch["id"])
    brewer.ok("POST", "/recipe/start")
    fake.push({"104": 2, "144": 1, "6": 2, "10": 250})
    assert eventually(lambda: brewer.get("/state")[1]["brewId"] == batch["id"])
    fake.push({"1": False, "104": 0, "144": 0})                             # выключили на первом шаге — прервана
    done = eventually(lambda: (b := brewer.get(f"/brews/{batch['id']}")[1])["status"] == "stopped" and b)
    assert done["manual"] is False and done["recipe"]["id"] == rid and done["snapshot"]["name"] == recipe["name"]
    mash_in = next(st for st in done["brewDay"] if st["kind"] == "mash_in")
    assert mash_in["measures"] == []                                         # программа шла — температуру пишет она
    assert [b["id"] for b in brewer.ok("GET", "/brews")] == [batch["id"]]
    # выключение пивоварни — не конец партии: день идёт с того шага, где она остановилась, доводят рукой
    assert done["phase"] == "brewday" and done["brewDay"][done["currentStep"]]["kind"] == "heat"
    assert brewer.ok("POST", f"/brews/{batch['id']}/finish")["phase"] == "fermenting"
    assert brewer.post(f"/brews/{batch['id']}/upload")[0] == 409            # день позади — программа не нужна


def test_brew(service, brewer, agents, recipe):
    agent = online(service, brewer, agents)
    fake = agent.brewery
    rid = brewer.ok("POST", "/recipes", recipe)["id"]
    bid = brewer.ok("POST", "/brews", {"recipeId": rid})["id"]

    brewer.ok("POST", f"/brews/{bid}/upload")
    assert any("128" in w for w in fake.writes)
    device_recipe = eventually(lambda: brewer.get("/state")[1]["deviceRecipe"])
    assert device_recipe["id"] == rid and device_recipe["steps"][0]["name"] == "Пауза 1"

    brewer.ok("PUT", f"/recipes/{rid}", {**recipe, "name": "Переименован"})       # программа партии — снимок
    assert brewer.get("/state")[1]["deviceRecipe"]["name"] == recipe["name"]

    brewer.ok("POST", "/recipe/start")
    assert fake.writes[-3:] == [{"1": True}, {"101": 1}, {"2": True}]       # включить → режим «рецепт» → старт
    fake.push({"104": 2, "144": 1, "6": 2, "10": 250})
    for temp in (260, 280, 300):
        fake.push({"10": temp})
    fake.push({"143": 1})                                                   # подсказка: засыпь солода
    brewer.ok("POST", "/alert/confirm")
    assert fake.dps["143"] == 0
    fake.push({"144": 4, "6": 3, "10": 1000})                               # кипячение, отсчёт пошёл
    fake.push({"6": 2})                                                     # закладка «за 2 мин»
    pending = eventually(lambda: brewer.get("/state")[1]["additionsPending"])
    assert [a["minutes"] for a in pending] == [2] and pending[0]["label"] == "Тест-хмель А 10 г"
    brewer.ok("POST", "/additions/2/ack")
    fake.push({"6": 0})
    fake.push({"1": False, "104": 0, "144": 0})                             # конец программы

    brews = eventually(lambda: [b for b in brewer.get("/brews")[1] if b["status"] == "finished"])
    assert len(brews) == 1 and brews[0]["id"] == bid and brews[0]["recipeId"] == rid
    detail = brewer.get(f"/brews/{bid}")[1]
    kinds = [e["kind"] for e in detail["events"]]
    assert {"alert", "alertCleared", "step", "addition", "added", "end"} <= set(kinds)
    assert [t for _, t, _ in brewer.ok("GET", f"/brews/{bid}/readings")][:4] == [25.0, 26.0, 28.0, 30.0]
    # программа закончилась — охлаждение и дрожжи впереди, шаги с временем по событиям пивоварни
    step = detail["brewDay"][detail["currentStep"]]
    assert detail["phase"] == "brewday" and step["kind"] == "chill" and step["at"] is not None
    assert all(s["at"] is not None for s in detail["brewDay"] if s["kind"] in ("heat", "mash_in", "boil"))
    assert detail["manual"] is False and detail["plan"] is None                  # у рецепта без засыпи плана нет
    assert detail["equipment"]["name"] == "Имитация"                             # на оборудовании этой пивоварни
    brewer.ok("POST", f"/brews/{brews[0]['id']}/entries", {"kind": "og", "value": 1.048})   # журнал — и у неё
    assert brewer.get("/brews")[1][0]["og"] == 1.048
    assert len(brewer.get("/events")[1]) >= 6
    assert brewer.get(f"/brews?recipe={rid}")[1][0]["id"] == brews[0]["id"]
    assert brewer.get("/brews?recipe=not-an-id")[1] == []

    agent.stop()
    assert eventually(lambda: brewer.get("/state")[1]["online"] is False)
    assert brewer.post("/pump", {"on": False})[0] == 503


def test_other_users_brewery_is_invisible(service, brewer, agents):
    online(service, brewer, agents)
    other = service.client()
    other.signup("other@test.local")
    assert other.get("/state")[1]["online"] is False
    assert other.post("/pump", {"on": True})[0] == 503
    assert other.get("/brews")[1] == []


def test_brewery_becomes_equipment(service, brewer, agents):
    assert brewer.get("/equipment")[1] == []
    online(service, brewer, agents)
    [e] = brewer.ok("GET", "/equipment")                                  # заведённая агентом — оборудование
    assert e["kind"] == "easybrew" and e["connected"] and e["main"] and e["name"] == "Имитация"
    assert brewer.delete(f"/equipment/{e['id']}")[0] == 409                # привязанную — не удалить
    saved = brewer.ok("PUT", f"/equipment/{e['id']}", {"name": "Easy Brew 40", "volume": 30, "efficiency": 83,
                                                       "evaporation": 3.5})
    assert saved["name"] == "Easy Brew 40" and saved["efficiency"] == 83 and saved["connected"]


def test_foreign_brewery_rejected(service, brewer, agents, caplog):
    online(service, brewer, agents)                          # пивоварня fake-easybrew заведена у brewer
    other = service.client()
    other.me = other.signup("other@test.local")[1]
    token = new_agent_token(other)

    async def hello():
        async with websockets.connect(f"ws://127.0.0.1:{service.port}/api/agent",
                                      additional_headers={"Authorization": f"Bearer {token}"}) as ws:
            await ws.send(json.dumps({"type": "hello", "session": "s", "device": {"tuyaId": "fake-easybrew"}}))
            try:
                await ws.recv()
            except websockets.exceptions.ConnectionClosed as e:
                return e.rcvd.code if e.rcvd else None
    assert asyncio.run(hello()) == 1008                       # чужую пивоварню не привязать
    assert brewer.get("/state")[1]["online"] is True
    assert not [r for r in caplog.records if r.levelname == "ERROR"]


def test_brews_of_published_recipe_counted_for_all(service, brewer, agents, recipe):
    """Чужой опубликованный рецепт сварили — варка к нему привязана, «сколько раз варили» (разлитые) видят все."""
    author = service.client()
    author.signup("author@test.local")
    author.ok("POST", "/auth/verify", {"token": service.outbox.link("verify")})
    rid = author.ok("POST", "/recipes", recipe)["id"]
    author.ok("PUT", f"/recipes/{rid}/visibility", {"visibility": "public"})

    agent = online(service, brewer, agents)
    bid = brewer.ok("POST", "/brews", {"recipeId": rid})["id"]
    brewer.ok("POST", f"/brews/{bid}/upload")
    brewer.ok("POST", "/recipe/start")
    agent.brewery.push({"104": 2, "144": 1, "6": 2, "10": 250})
    brews = eventually(lambda: brewer.get("/brews")[1])
    assert brews[0]["recipeId"] == rid
    assert service.client().get("/recipes")[1][0]["brewsTotal"] == 0              # сварена — когда разлита
    brewer.ok("POST", f"/brews/{bid}/entries", {"kind": "package"})
    assert service.client().get("/recipes")[1][0]["brewsTotal"] == 1
    assert author.get(f"/recipes/{rid}")[1]["meta"]["brewsTotal"] == 1
