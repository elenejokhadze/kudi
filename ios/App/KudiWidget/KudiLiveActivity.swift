// The Dynamic Island and Lock Screen views for Kudi's Live Activity.
// Target: KudiWidget (File > New > Target > Widget Extension, with "Include Live Activity" ticked).
import ActivityKit
import SwiftUI
import WidgetKit

// Colours mirror the app's dark tokens: --color-bg, --color-ink, --color-ink-2, --color-primary, --color-danger
private enum KudiColor {
    static let ink = Color(red: 0.965, green: 0.937, blue: 0.875)
    static let ink2 = Color(red: 0.776, green: 0.784, blue: 0.796)
    static let lime = Color(red: 0.788, green: 0.918, blue: 0.384)
    static let danger = Color(red: 0.957, green: 0.580, blue: 0.537)
}

private struct Mascot: View {
    var size: CGFloat
    var body: some View {
        Image("KudiMascot").resizable().scaledToFill().frame(width: size, height: size).clipShape(Circle())
    }
}

struct KudiLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: KudiActivityAttributes.self) { context in
            // Lock Screen and notification banner
            HStack(spacing: 12) {
                Mascot(size: 44)
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.title).font(.headline).foregroundStyle(KudiColor.ink)
                    Text(context.state.subtitle).font(.subheadline).foregroundStyle(KudiColor.ink2)
                }
                Spacer()
                countdown(context.state).font(.title3.monospacedDigit())
            }
            .padding(16)
            .activityBackgroundTint(Color.black.opacity(0.85))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { Mascot(size: 40) }
                DynamicIslandExpandedRegion(.trailing) { countdown(context.state).font(.title3.monospacedDigit()) }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.state.title).font(.headline).foregroundStyle(KudiColor.ink)
                        Text(context.state.subtitle).font(.subheadline).foregroundStyle(KudiColor.ink2)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }
            } compactLeading: {
                Mascot(size: 22)
            } compactTrailing: {
                countdown(context.state).font(.caption.monospacedDigit()).frame(maxWidth: 48)
            } minimal: {
                Mascot(size: 22)
            }
            .keylineTint(KudiColor.lime)
        }
    }

    // "12:04" counting down to the meal; "Late" once it has passed
    @ViewBuilder private func countdown(_ s: KudiActivityAttributes.ContentState) -> some View {
        if s.isLate || s.dueAt < Date() {
            Text("Late").foregroundStyle(KudiColor.danger)
        } else {
            Text(timerInterval: Date()...s.dueAt, countsDown: true).foregroundStyle(KudiColor.lime).multilineTextAlignment(.trailing)
        }
    }
}

@main
struct KudiWidgetBundle: WidgetBundle {
    var body: some Widget { KudiLiveActivity() }
}
