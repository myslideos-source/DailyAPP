import SwiftUI
import WidgetKit

struct DayliWidget: Widget {
    let kind: String = "DayliWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DayliWidgetProvider()) { entry in
            DayliWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("dayli")
        .description("Euer nächster Termin und offene Aufgaben.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private struct DayliWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: DayliWidgetEntry

    var body: some View {
        switch family {
        case .systemSmall:
            DayliSmallWidgetView(entry: entry)
        default:
            DayliMediumWidgetView(entry: entry)
        }
    }
}

/// The extension's entry point — Xcode's "Widget Extension" template
/// creates a file exactly like this one (usually named after the target,
/// e.g. `DayliWidgetBundle.swift`); if you generate the target from the
/// template rather than adding these files by hand, delete its generated
/// `@main` struct and use this one instead so there's only ever one.
@main
struct DayliWidgetBundle: WidgetBundle {
    var body: some Widget {
        DayliWidget()
    }
}
