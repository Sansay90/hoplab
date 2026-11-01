"""Настройки агента — переменные окружения или agent/.env (образец — .env.example).

Пустая переменная окружения считается незаданной: тогда берётся значение из .env или по умолчанию.
"""
import os
from dataclasses import dataclass

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))      # hoplab/agent
ENV_FILE = os.path.join(AGENT_DIR, ".env")


def env(name, default=None, path=ENV_FILE):
    """Переменная окружения или строка из agent/.env."""
    if os.environ.get(name):
        return os.environ[name]
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                key, sep, value = line.strip().partition("=")
                if sep and key == name and not key.startswith("#"):
                    return value.strip() or default
    except OSError:
        pass
    return default


LOG_LEVELS = ("DEBUG", "INFO", "WARNING", "ERROR")


def log_level(value):
    level = (value or "INFO").strip().upper()
    if level not in LOG_LEVELS:
        raise SystemExit(f"LOG_LEVEL={value!r} — нужно одно из: {', '.join(LOG_LEVELS)}")
    return level


@dataclass(frozen=True)
class Config:
    service_url: str                  # SERVICE_URL — адрес сервиса для агентов, wss://<сайт>/api/agent
    token: str | None                 # AGENT_TOKEN — выдаёт сервис (README.md, «Запуск»)
    devices: str                      # HOPLAB_DEVICES — ключи пивоварни (devices.json)
    brewery_id: str | None            # BREWERY_ID — какое устройство из devices.json пивоварня, если их там несколько
    state: str                        # HOPLAB_STATE — память агента (data/state.json)
    brewery_ip: str | None            # BREWERY_IP, BREWERY_VERSION — адрес пивоварни и версия протокола
    brewery_version: str | None       # вместо автопоиска (из Docker широковещание не доходит)
    max_watts: int | None             # MAX_WATTS — потолок мощности, если модели нет в recipe.MODEL_MAX_WATTS
    log_level: str                    # LOG_LEVEL — DEBUG: в журнал каждое изменение DP пивоварни (разбор её поведения)

    @classmethod
    def from_env(cls):
        max_watts = env("MAX_WATTS")
        return cls(service_url=env("SERVICE_URL", "ws://127.0.0.1:8000/api/agent"), token=env("AGENT_TOKEN"),
                   devices=env("HOPLAB_DEVICES") or os.path.join(AGENT_DIR, "devices.json"),
                   brewery_id=env("BREWERY_ID"),
                   state=env("HOPLAB_STATE") or os.path.join(AGENT_DIR, "data", "state.json"),
                   brewery_ip=env("BREWERY_IP"), brewery_version=env("BREWERY_VERSION"),
                   max_watts=int(max_watts) if max_watts else None,
                   log_level=log_level(env("LOG_LEVEL")))
