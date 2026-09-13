import SwiftUI
import WidgetKit

// MARK: - Shared visual language
// Mirrors the web app's own CSS tokens (app/globals.css: --dl-bg,
// --dl-domenico, --dl-elisabeth, --dl-together) so the widget reads as
// unmistakably dayli, without trying to reproduce the PWA's CSS
// glassmorphism/blur — WidgetKit backgrounds are plain SwiftUI views, so
// the "glow" here is two soft radial gradients, not a backdrop filter.

private enum DayliColor {
    static let navy = Color(red: 0x05 / 255, green: 0x09 / 255, blue: 0x1F / 255)
    static let domenico = Color(red: 0x48 / 255, green: 0xDE / 255, blue: 0xF4 / 255)
    static let elisabeth = Color(red: 0xF0 / 255, green: 0x5A / 255, blue: 0xA5 / 255)
    static let together = Color(red: 0x95 / 255, green: 0x65 / 255, blue: 0xF5 / 255)
    static let textWarm = Color(red: 0xF7 / 255, green: 0xF7 / 255, blue: 0xFB / 255)
    static let textDim = Color(red: 0xA9 / 255, green: 0xB3 / 255, blue: 0xD2 / 255)

    static func forAssignee(_ assignee: String) -> Color {
        switch assignee {
        case "domenico": return domenico
        case "elisabeth": return elisabeth
        default: return together
        }
    }
}

/// The widget's base surface: deep navy with a cyan glow top-left and a
/// violet/pink glow bottom-right — see spec §10. Applied via
/// `.containerBackground(for: .widget)`, the current WidgetKit-required API
/// (iOS 17+) for widget backgrounds, rather than a plain `.background()`.
private struct DayliWidgetBackground: View {
    var body: some View {
        ZStack {
            DayliColor.navy
            RadialGradient(
                colors: [DayliColor.domenico.opacity(0.28), .clear],
                center: .topLeading,
                startRadius: 4,
                endRadius: 120
            )
            RadialGradient(
                colors: [DayliColor.together.opacity(0.30), DayliColor.elisabeth.opacity(0.16), .clear],
                center: .bottomTrailing,
                startRadius: 4,
                endRadius: 140
            )
        }
    }
}

private struct DayliWordmark: View {
    var body: some View {
        Text("dayli")
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .foregroundStyle(DayliColor.textDim)
    }
}

private func eventTimeLabel(_ event: WidgetEvent) -> Text {
    if event.isAllDay { return Text("Ganztägig") }
    return Text(event.startDate, style: .time)
}

// MARK: - Small widget

struct DayliSmallWidgetView: View {
    let entry: DayliWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            DayliWordmark()
            Spacer(minLength: 2)

            if entry.isSignedOut {
                signedOutContent
            } else if let event = entry.snapshot?.nextEvent {
                eventTimeLabel(event)
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(DayliColor.textWarm)
                if !event.title.isEmpty {
                    Text(event.title)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(DayliColor.forAssignee(event.assignee))
                        .lineLimit(1)
                }
            } else {
                Text("Keine Termine")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(DayliColor.textWarm)
            }

            Spacer(minLength: 2)
            taskCountLine
        }
        .padding(14)
        .containerBackground(for: .widget) { DayliWidgetBackground() }
        .widgetURL(URL(string: "dayli://today"))
    }

    @ViewBuilder
    private var signedOutContent: some View {
        Text("dayli öffnen")
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(DayliColor.textWarm)
        Text("Anmelden, um Termine zu sehen")
            .font(.system(size: 11))
            .foregroundStyle(DayliColor.textDim)
            .lineLimit(2)
    }

    @ViewBuilder
    private var taskCountLine: some View {
        if !entry.isSignedOut, let snapshot = entry.snapshot {
            if snapshot.openTaskCount > 0 {
                Text("\(snapshot.openTaskCount) Aufgabe\(snapshot.openTaskCount == 1 ? "" : "n") offen")
                    .font(.system(size: 11))
                    .foregroundStyle(DayliColor.textDim)
            } else {
                Text("Alles erledigt")
                    .font(.system(size: 11))
                    .foregroundStyle(DayliColor.textDim)
            }
        }
    }
}

// MARK: - Medium widget

struct DayliMediumWidgetView: View {
    let entry: DayliWidgetEntry

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                DayliWordmark()
                Text("Als Nächstes")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(DayliColor.together)

                if let event = nextEvent {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        eventTimeLabel(event)
                            .font(.system(size: 17, weight: .bold, design: .rounded))
                            .foregroundStyle(DayliColor.textWarm)
                        if !event.title.isEmpty {
                            Text(event.title)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(DayliColor.forAssignee(event.assignee))
                                .lineLimit(1)
                        }
                    }
                    Text(event.startDate, style: .date)
                        .font(.system(size: 11))
                        .foregroundStyle(DayliColor.textDim)
                } else if entry.isSignedOut {
                    Text("dayli öffnen")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(DayliColor.textWarm)
                    Text("Melde dich an, um deine Termine zu sehen.")
                        .font(.system(size: 11))
                        .foregroundStyle(DayliColor.textDim)
                } else {
                    Text("Keine kommenden Termine")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(DayliColor.textWarm)
                    Text("Euer Tag ist frei.")
                        .font(.system(size: 11))
                        .foregroundStyle(DayliColor.textDim)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .link(to: nextEvent.map { "dayli://event/\($0.id)" })

            if !entry.isSignedOut {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Offene Aufgaben")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(DayliColor.together)

                    if openTasks.isEmpty {
                        Text("Alles erledigt")
                            .font(.system(size: 12))
                            .foregroundStyle(DayliColor.textDim)
                    } else {
                        ForEach(openTasks.prefix(3)) { task in
                            HStack(alignment: .top, spacing: 5) {
                                Image(systemName: "square")
                                    .font(.system(size: 10))
                                    .foregroundStyle(DayliColor.forAssignee(task.assignee))
                                Text(task.title)
                                    .font(.system(size: 12))
                                    .foregroundStyle(DayliColor.textWarm)
                                    .lineLimit(1)
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .link(to: "dayli://tasks")
            }
        }
        .padding(14)
        .containerBackground(for: .widget) { DayliWidgetBackground() }
        .widgetURL(URL(string: "dayli://today"))
    }

    private var nextEvent: WidgetEvent? { entry.snapshot?.nextEvent }
    private var openTasks: [WidgetTask] { entry.snapshot?.openTasks ?? [] }
}

/// `Link(destination:)` around a sub-region only takes effect on iOS 17+
/// (multiple tap targets per widget); on iOS 16 the whole widget falls
/// back to the single `.widgetURL` set above ("today") — never a crash or
/// dead tap target either way, so no separate #available branch is needed
/// here.
private extension View {
    @ViewBuilder
    func link(to urlString: String?) -> some View {
        if let urlString, let url = URL(string: urlString) {
            Link(destination: url) { self }
        } else {
            self
        }
    }
}
