"""Варочный день партии: шаги из рецепта партии, текущий шаг по записям «step» и по событиям пивоварни, таймеры
шагов, к которым перешёл пивовар, — конец паузы и закладки на кипячении уведомлением и push; конец дня — дрожжи,
«закончить» или полтора суток без них."""
import time
from datetime import timedelta

import pytest

from app.brewery.brewday import DAY_SPAN, progress, steps_of
from app.brewery.logbook import DEVICE
from app.db import session
from app.models import Brew, from_unix, parse_id


def test_steps_from_batch_recipe(brewer, recipe):
    rid = brewer.ok("POST", "/recipes", recipe)["id"]
    brew = brewer.ok("POST", "/brews", {"recipeId": rid})
    steps = brew["brewDay"]
    assert [s["kind"] for s in steps] == ["prepare", "heat", "mash_in", "rest", "rest", "rest", "sparge", "boil",
                                          "chill", "pitch"]
    assert [s["index"] for s in steps] == list(range(10))
    assert steps[1]["temp"] == 30 and steps[2]["measures"] == ["mash_temp"]
    assert steps[3]["name"] == "Пауза 1" and steps[3]["temp"] == 30 and steps[3]["minutes"] == 2
    assert steps[3]["measures"] == ["ph"] and steps[4]["measures"] == []     # pH — на первой паузе
    assert steps[6]["measures"] == ["first_wort", "preboil_volume", "preboil_gravity"]
    boil = steps[7]
    assert boil["minutes"] == 3 and [a["minutes"] for a in boil["additions"]] == [2, 1]
    assert boil["additions"][0]["label"] == "Тест-хмель А 10 г"
    assert steps[8]["measures"] == ["og", "fermenter_volume"] and steps[9]["measures"] == ["pitch_temp"]
    assert brew["currentStep"] == 0 and brew["phase"] == "brewday"
    assert steps[0]["at"] == brew["startedAt"] and steps[1]["at"] is None     # подготовка — с начала варки


def test_progress_by_brewery_events():
    """Программа пивоварни — паузы и кипячение: её шаги и подсказки ложатся на шаги варочного дня; позже по времени —
    запись пивовара или событие пивоварни — то и текущий шаг."""
    steps = steps_of({"mash": [{"temp": 66, "minutes": 60}, {"temp": 78, "minutes": 10}], "boil": {"minutes": 60}})
    kinds = [s["kind"] for s in steps]
    events = [(1, "step", {"step": 1}), (2, "alert", {"alert": "malt"}), (3, "alertCleared", None),
              (4, "step", {"step": 2}), (5, "alert", {"alert": "mashEnd"}), (6, "alertCleared", None),
              (7, "step", {"step": 3}), (8, "end", None)]
    seen = [kinds[progress(steps, 0, [], events[:n])[0]] for n in range(1, len(events) + 1)]
    assert seen == ["heat", "mash_in", "rest", "rest", "sparge", "sparge", "boil", "chill"]
    _, starts, manual = progress(steps, 0, [], events)
    assert starts[kinds.index("boil")] == 7 and manual is False
    assert progress(steps, 0, [(9, "step", kinds.index("pitch"))], events)[::2] == (kinds.index("pitch"), True)
    assert progress(steps, 0, [(9, "pitch", None)], events)[0] == len(steps) - 1


def test_progress_with_own_heating_step():
    """Нагрев своей мощностью — свой шаг программы перед первой паузой: её шаг 1 — нагрев (и минута догрева после
    засыпи), паузы — со второго шага."""
    steps = steps_of({"mash": [{"temp": 66, "minutes": 60, "watts": 1500}, {"temp": 78, "minutes": 10, "watts": 1500}],
                      "heat": {"watts": 2500}, "boil": {"minutes": 60, "watts": 2500}})
    kinds = [s["kind"] for s in steps]
    assert steps[kinds.index("heat")]["watts"] == 2500
    events = [(1, "step", {"step": 1}), (2, "alert", {"alert": "malt"}), (3, "alertCleared", None),
              (4, "step", {"step": 2}), (5, "step", {"step": 3}), (6, "alert", {"alert": "mashEnd"}),
              (7, "alertCleared", None), (8, "step", {"step": 4}), (9, "end", None)]
    seen = [progress(steps, 0, [], events[:n])[0] for n in range(1, len(events) + 1)]
    rests = [i for i, k in enumerate(kinds) if k == "rest"]
    assert [kinds[i] for i in seen] == ["heat", "mash_in", "rest", "rest", "rest", "sparge", "sparge", "boil", "chill"]
    assert seen[3] == rests[0] and seen[4] == rests[1]
    same = steps_of({"mash": [{"temp": 66, "minutes": 60, "watts": 2500}], "heat": {"watts": 2500}})
    assert not any(s.get("own") for s in same)                     # мощность как у первой паузы — шага нет


def test_step_timers(service, brewer, recipe, pushes):
    rid = brewer.ok("POST", "/recipes", recipe)["id"]
    bid = brewer.ok("POST", "/brews", {"recipeId": rid})["id"]
    assert brewer.post(f"/brews/{bid}/entries", {"kind": "step", "value": 42})[0] == 400   # такого шага нет
    t0 = time.time() - 30
    step = brewer.ok("POST", f"/brews/{bid}/entries", {"kind": "step", "value": 3, "at": t0})   # первая пауза, 2 мин
    assert step["text"] == "Пауза 1"
    tick = service.state.brewday.tick

    assert tick(from_unix(t0 + 60)) == 0
    timers = service.state.brewday
    assert timers.next_at(from_unix(t0 + 60)) == from_unix(t0 + 120)           # проснуться ровно к концу паузы
    interval, timers.interval = timers.interval, 600
    try:                                                                        # проход реже срока — проснуться к сроку
        assert timers._pause() == pytest.approx(t0 + 120 - time.time(), abs=2)
    finally:
        timers.interval = interval
    assert tick(from_unix(t0 + 121)) == 1                                       # пауза прошла — напомнили
    assert tick(from_unix(t0 + 200)) == 0                                       # без повторов
    [n] = brewer.ok("GET", "/notifications")
    assert n["kind"] == "brew" and n["title"] == "Пауза 1 — 2 мин прошло" and n["text"].startswith("Дальше — Пауза 2")
    assert pushes[0][1]["url"] == f"/brews/{bid}" and pushes[0][1]["title"].startswith("Пауза 1 — 2 мин прошло")

    brewer.ok("POST", f"/brews/{bid}/entries", {"kind": "step", "value": 7, "at": t0 + 300})   # кипячение 3 мин
    assert tick(from_unix(t0 + 300 + 61)) == 1                                  # закладка за 2 мин до конца
    assert tick(from_unix(t0 + 300 + 185)) == 2                                 # за 1 мин и конец кипячения
    titles = [n["title"] for n in brewer.ok("GET", "/notifications")]
    assert "Закладка: Тест-хмель А 10 г" in titles and "Кипячение закончено" in titles

    brewer.ok("POST", f"/brews/{bid}/entries", {"kind": "pitch"})               # дрожжи — варочный день позади
    done = brewer.ok("GET", f"/brews/{bid}")
    assert done["status"] == "finished" and done["phase"] == "fermenting" and done["currentStep"] == 9
    assert tick(from_unix(t0 + 3600)) == 0


def test_abandoned_day_goes_on(service, brewer, recipe):
    """Варочный день без дрожжей и «закончить» через полтора суток кончается сам — партия переходит к брожению."""
    rid = brewer.ok("POST", "/recipes", recipe)["id"]
    brew = brewer.ok("POST", "/brews", {"recipeId": rid})
    assert [b["id"] for b in brewer.ok("GET", "/brews?phase=brewday&limit=1")] == [brew["id"]]
    service.state.brewday.tick(from_unix(brew["startedAt"]) + DAY_SPAN - timedelta(minutes=1))
    assert brewer.ok("GET", f"/brews/{brew['id']}")["phase"] == "brewday"
    service.state.brewday.tick(from_unix(brew["startedAt"]) + DAY_SPAN + timedelta(minutes=1))
    assert brewer.ok("GET", f"/brews/{brew['id']}")["phase"] == "fermenting"
    assert brewer.ok("GET", "/brews?phase=brewday") == []
    assert [b["id"] for b in brewer.ok("GET", "/brews?phase=fermenting")] == [brew["id"]]
    assert brewer.ok("GET", "/brews?phase=packaged") == []


def test_lost_agent_brew_closes(service, brewer, recipe):
    """Варка с пивоварни «идёт», а агент пропал: через DAY_SPAN без замеров она остановлена, день позади."""
    rid = brewer.ok("POST", "/recipes", recipe)["id"]
    brew = brewer.ok("POST", "/brews", {"recipeId": rid})
    with session() as s:
        b = s.get(Brew, parse_id(brew["id"]))
        b.source, b.status = DEVICE, "running"
        s.add(b)
        s.commit()
    assert brewer.post(f"/brews/{brew['id']}/finish")[0] == 409
    service.state.brewday.tick(from_unix(brew["startedAt"]) + DAY_SPAN - timedelta(minutes=1))
    assert brewer.ok("GET", f"/brews/{brew['id']}")["status"] == "running"
    service.state.brewday.tick(from_unix(brew["startedAt"]) + DAY_SPAN + timedelta(minutes=1))
    done = brewer.ok("GET", f"/brews/{brew['id']}")
    assert done["status"] == "stopped" and done["phase"] == "fermenting"
