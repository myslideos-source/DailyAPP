import WidgetKit

struct DayliWidgetEntry: TimelineEntry {
    let date: Date
    let snapshot: DayliWidgetSnapshot?
    /// True only when no snapshot file has ever been written (or it was
    /// explicitly cleared on sign-out) — the "Nicht angemeldet" state
    /// (spec §15). A snapshot that's merely old is rendered as-is instead
    /// ("Daten vorübergehend nicht erreichbar" → show the last valid data,
    /// never blank it out just because it's stale).
    let isSignedOut: Bool
}

struct DayliWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> DayliWidgetEntry {
        // The widget gallery / redacted preview can render before the
        // device is unlocked, so this is generic placeholder content —
        // never a copy of real user data.
        let sampleStart = Calendar.current.date(bySettingHour: 9, minute: 0, second: 0, of: .now) ?? .now
        let sampleEnd = Calendar.current.date(bySettingHour: 10, minute: 30, second: 0, of: .now)
        return DayliWidgetEntry(
            date: .now,
            snapshot: DayliWidgetSnapshot(
                generatedAt: .now,
                userName: "Domenico",
                nextEvent: WidgetEvent(
                    id: "placeholder",
                    title: "Bemusterung Haus",
                    startDate: sampleStart,
                    endDate: sampleEnd,
                    isAllDay: false,
                    assignee: "gemeinsam",
                    category: "hausbau"
                ),
                openTasks: [],
                openTaskCount: 3
            ),
            isSignedOut: false
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (DayliWidgetEntry) -> Void) {
        // WidgetKit calls this for the quick transient preview (e.g. when
        // the user is adding the widget) — it must return fast and must
        // never do network work, so it just reads whatever is already on
        // disk, exactly like the real timeline entry below.
        completion(currentEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DayliWidgetEntry>) -> Void) {
        let entry = currentEntry()

        // No per-minute polling (spec §13 explicitly forbids it) — instead,
        // ask WidgetKit to reload right around the moments the displayed
        // content would actually change: shortly before the next event, at
        // its start/end, and once after local midnight so a "heute"/
        // "morgen" framing rolls over even on a day with no event at all.
        var refreshDates: [Date] = [Date().addingTimeInterval(15 * 60)]

        if let next = entry.snapshot?.nextEvent {
            let leadIn = next.startDate.addingTimeInterval(-10 * 60)
            if leadIn > .now { refreshDates.append(leadIn) }
            refreshDates.append(next.startDate)
            if let end = next.endDate { refreshDates.append(end) }
        }

        if let midnight = Calendar.current.nextDate(
            after: .now,
            matching: DateComponents(hour: 0, minute: 1),
            matchingPolicy: .nextTime
        ) {
            refreshDates.append(midnight)
        }

        let nextRefresh = refreshDates.filter { $0 > .now }.min() ?? Date().addingTimeInterval(15 * 60)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }

    private func currentEntry() -> DayliWidgetEntry {
        let snapshot = DayliWidgetStore.load()
        return DayliWidgetEntry(date: .now, snapshot: snapshot, isSignedOut: snapshot == nil)
    }
}
