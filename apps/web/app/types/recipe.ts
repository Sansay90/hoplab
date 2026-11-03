// Модель формы редактора рецепта (RecipeDraft и строки) — в @hoplab/core; здесь — только то, что нужно виду.

/** Вариант типа строки для KindButton: иконка, подпись, цвет иконки. */
export interface KindOption<V extends string = string> {
  value: V
  label: string
  icon: string
  tint?: string
}
