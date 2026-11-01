"""Агент brewapp — рядом с пивоварней: связь с ней по домашней сети и с сервисом по WebSocket.

Запуск из папки brewapp/agent:
    .venv\\Scripts\\python -m agent

Настройки — config.py (переменные окружения или agent/.env).
"""
import asyncio
import json
import logging

from .config import Config
from .controller import Controller
from .device import Brewery
from .link import Link
from .state import Memory

VERSION = "0.1"


def is_brewery(d):
    return d.get("category") == "mzj" or "EASY BREW" in (d.get("product_name") or "").upper()


def load_device(path, wanted=None):
    """Пивоварня с ключом из devices.json: по BREWERY_ID, иначе единственная. Мастер tinytuya пишет туда все
    устройства Smart Life — чужой прибор (розетку, чайник) пивоварней не считаем."""
    try:
        with open(path, encoding="utf-8") as f:
            keyed = [d for d in json.load(f) if d.get("key")]
    except FileNotFoundError:
        raise SystemExit(f"нет {path} — нужны ключи пивоварни (README.md, «Ключи пивоварни»)") from None
    if wanted:
        found = [d for d in keyed if d.get("id") == wanted]
        if not found:
            raise SystemExit(f"в {path} нет устройства с ключом и id {wanted} (BREWERY_ID)")
        return found[0]
    breweries = keyed if len(keyed) == 1 else [d for d in keyed if is_brewery(d)]
    if len(breweries) == 1:
        return breweries[0]
    if not keyed:
        raise SystemExit(f"в {path} нет пивоварни с ключом")
    names = ", ".join(f"{d.get('name') or '?'} ({d.get('id')})" for d in keyed)
    raise SystemExit(f"в {path} несколько устройств: {names} — укажите пивоварню в BREWERY_ID")


async def serve(controller, brewery, url, token, device):
    link = Link(url, token, controller, device, VERSION)
    brewery.start()
    try:
        await link.run()
    finally:
        await asyncio.to_thread(brewery.stop)


def main():
    cfg = Config.from_env()
    logging.basicConfig(level=cfg.log_level, format="%(asctime)s %(name)s: %(message)s", datefmt="%H:%M:%S")
    if not cfg.token:
        raise SystemExit("не задан AGENT_TOKEN — токен агента выдаёт сервис (README.md, «Запуск»)")
    d = load_device(cfg.devices, cfg.brewery_id)
    # BREWERY_IP/VERSION перекрывают devices.json — в Docker автопоиск по широковещанию не работает
    brewery = Brewery(d["id"], d["key"], address=cfg.brewery_ip or d.get("ip") or None,
                      version=cfg.brewery_version or d.get("version") or None)
    controller = Controller(brewery, Memory(cfg.state), cfg.max_watts)
    device = {"tuyaId": d["id"], "name": d.get("name") or "Пивоварня"}
    try:
        asyncio.run(serve(controller, brewery, cfg.service_url, cfg.token, device))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
