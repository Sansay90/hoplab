// Ошибки предметной области. Сервисы бросают их с текстом для человека, а код ответа и тело {"detail": текст}
// подбирает общий обработчик (app.ts) — маршруты не переводят исключения вручную. Тексты и коды — как в
// service/app/errors.py и модулях Python-сервиса.

export class AppError extends Error {
  readonly status: number

  constructor(detail: string, status = 500) {
    super(detail)
    this.name = new.target.name
    this.status = status
  }

  get detail() {
    return this.message
  }
}

/** Неверные данные. */
export class Invalid extends AppError {
  constructor(detail: string) {
    super(detail, 400)
  }
}

/** Видно, но этого нельзя. */
export class Forbidden extends AppError {
  constructor(detail: string) {
    super(detail, 403)
  }
}

/** Нет такого — или не видно тому, кто спрашивает: чужое личное не выдаём даже существованием. */
export class NotFound extends AppError {
  constructor(detail: string) {
    super(detail, 404)
  }
}

/** Нельзя в текущем состоянии. */
export class Conflict extends AppError {
  constructor(detail: string) {
    super(detail, 409)
  }
}

/** Файл не того типа (фото, аватар). */
export class Unsupported extends AppError {
  constructor(detail = 'нужна картинка JPEG, PNG или WebP') {
    super(detail, 415)
  }
}

/** Агента пивоварни нет на связи — команду некому отдать. */
export class Offline extends AppError {
  constructor(detail = 'пивоварня не в сети') {
    super(detail, 503)
  }
}

/** Связь с агентом оборвалась, пока команда ждала ответа: пивоварня могла её уже выполнить. */
export class Lost extends Offline {
  constructor() {
    super('связь с пивоварней прервалась — команда могла выполниться, проверьте её состояние')
  }
}
