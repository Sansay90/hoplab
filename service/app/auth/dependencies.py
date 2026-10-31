"""Кто спрашивает: гость, пользователь или администратор — зависимости для роутеров (права — access.py)."""
from typing import Annotated

from fastapi import Depends, HTTPException, Request, Response

from ..access import is_admin
from ..models import User
from . import sessions

SESSION_COOKIE = "brewapp_session"


def set_session_cookie(request, response, token):
    response.set_cookie(SESSION_COOKIE, token, max_age=sessions.SESSION_DAYS * 86400, httponly=True, samesite="lax",
                        secure=request.url.scheme == "https", path="/")


def optional_user(request: Request, response: Response) -> User | None:
    """Вошедший пользователь или None — гость. Сессию продлили — продлеваем и cookie, иначе браузер выбросит её
    через SESSION_DAYS после входа, хотя человек заходит каждый день."""
    token = request.cookies.get(SESSION_COOKIE)
    user, renewed = sessions.lookup(token)
    if renewed:
        set_session_cookie(request, response, token)
    return user


def current_user(user: Annotated[User | None, Depends(optional_user)]) -> User:
    if user is None:
        raise HTTPException(401, "войдите")
    return user


def admin_user(user: Annotated[User, Depends(current_user)]) -> User:
    if not is_admin(user):
        raise HTTPException(403, "нужны права администратора")
    return user


Viewer = Annotated[User | None, Depends(optional_user)]
CurrentUser = Annotated[User, Depends(current_user)]
Admin = Annotated[User, Depends(admin_user)]
