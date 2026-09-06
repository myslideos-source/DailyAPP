// Pre-built, actor-agnostic activity-feed strings — the actor's name is
// prefixed at render time (see ActivityEntry in lib/types.ts), so these only
// describe the action itself. Kept deliberately coarse (create/complete/
// delete, not field-level diffs) so the feed stays a quick skim, not a log.

export function eventCreatedMessage(title: string): string {
  return `„${title}“ erstellt`;
}

export function eventDeletedMessage(title: string): string {
  return `„${title}“ gelöscht`;
}

export function taskCreatedMessage(title: string): string {
  return `„${title}“ hinzugefügt`;
}

export function taskDoneMessage(title: string): string {
  return `„${title}“ erledigt`;
}

export function taskDeletedMessage(title: string): string {
  return `„${title}“ gelöscht`;
}

export function categoryCreatedMessage(label: string): string {
  return `Kategorie „${label}“ erstellt`;
}

export function categoryDeletedMessage(label: string): string {
  return `Kategorie „${label}“ gelöscht`;
}

export function noteCreatedMessage(title: string): string {
  return `Notiz „${title || "Ohne Titel"}“ erstellt`;
}

export function savingsGoalCreatedMessage(title: string): string {
  return `Sparziel „${title}“ erstellt`;
}

export function savingsEntryAddedMessage(amount: number, goalTitle: string): string {
  return `${amount} € zu „${goalTitle}“ hinzugefügt`;
}
