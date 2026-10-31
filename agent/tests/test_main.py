import json

import pytest

from agent.__main__ import load_device

PLUG = {"id": "p1", "key": "k1", "name": "Розетка", "category": "cz"}
BREWERY = {"id": "b1", "key": "k2", "name": "Пивоварня", "category": "mzj", "product_name": "EASY BREW"}


def devices(tmp_path, items):
    path = tmp_path / "devices.json"
    path.write_text(json.dumps(items), encoding="utf-8")
    return str(path)


def test_load_device(tmp_path):
    assert load_device(devices(tmp_path, [PLUG, BREWERY]))["id"] == "b1"          # из нескольких — Easy Brew
    assert load_device(devices(tmp_path, [{**BREWERY, "category": "x", "product_name": ""}]))["id"] == "b1"
    assert load_device(devices(tmp_path, [PLUG, BREWERY]), "p1")["id"] == "p1"     # BREWERY_ID решает
    with pytest.raises(SystemExit, match="BREWERY_ID"):
        load_device(devices(tmp_path, [PLUG, {**PLUG, "id": "p2"}]))
    with pytest.raises(SystemExit, match="нет устройства"):
        load_device(devices(tmp_path, [PLUG, BREWERY]), "zz")
    with pytest.raises(SystemExit, match="нет пивоварни с ключом"):
        load_device(devices(tmp_path, [{**BREWERY, "key": ""}]))
