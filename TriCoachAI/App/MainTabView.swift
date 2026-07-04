import SwiftUI

struct MainTabView: View {
    let container: DependencyContainer
    let appState: AppState

    var body: some View {
        TabView {
            DashboardView(container: container)
                .tabItem { Label("Dashboard", systemImage: "gauge.with.dots.needle.67percent") }

            CalendarView(container: container)
                .tabItem { Label("Calendrier", systemImage: "calendar") }

            ProfileView(container: container, user: appState.currentUser) {
                appState.signOut()
            }
            .tabItem { Label("Profil", systemImage: "person.crop.circle") }
        }
    }
}
