import SwiftUI

private let calendarDayKeyFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
}()

struct CalendarView: View {
    let container: DependencyContainer
    @State private var viewModel: CalendarViewModel
    @State private var dropTargetDate: Date?

    init(container: DependencyContainer) {
        self.container = container
        _viewModel = State(initialValue: CalendarViewModel(container: container))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                weekStrip

                if let microcycle = viewModel.microcycle(containing: viewModel.selectedDate) {
                    MicrocycleBanner(microcycle: microcycle)
                }

                if viewModel.selectedDayWorkouts.isEmpty {
                    ContentUnavailableView("Journée de repos", systemImage: "bed.double.fill", description: Text("Aucune séance planifiée ce jour."))
                        .padding(.top, TCSpacing.xl)
                } else {
                    ScrollView {
                        VStack(spacing: TCSpacing.sm) {
                            ForEach(viewModel.selectedDayWorkouts) { workout in
                                NavigationLink(value: workout) {
                                    WorkoutRowView(workout: workout)
                                }
                                .buttonStyle(.plain)
                                .draggable(workout.id.uuidString)
                            }
                        }
                        .padding(TCSpacing.md)
                    }
                }
                Spacer(minLength: 0)
            }
            .navigationTitle("Calendrier")
            .navigationDestination(for: Workout.self) { workout in
                WorkoutDetailView(container: container, workout: workout, onUpdated: { Task { await viewModel.refresh() } })
            }
            .task { await viewModel.refresh() }
            .alert("Conflit détecté", isPresented: conflictAlertBinding) {
                Button("Compris") {}
            } message: {
                Text(viewModel.conflictMessage ?? "")
            }
            .alert("Erreur", isPresented: rescheduleErrorAlertBinding) {
                Button("OK") {}
            } message: {
                Text(viewModel.rescheduleErrorMessage ?? "")
            }
        }
    }

    private var conflictAlertBinding: Binding<Bool> {
        Binding(get: { viewModel.conflictMessage != nil }, set: { if !$0 { viewModel.conflictMessage = nil } })
    }

    private var rescheduleErrorAlertBinding: Binding<Bool> {
        Binding(get: { viewModel.rescheduleErrorMessage != nil }, set: { if !$0 { viewModel.rescheduleErrorMessage = nil } })
    }

    private var weekStrip: some View {
        HStack(spacing: 6) {
            ForEach(viewModel.weekDates, id: \.self) { date in
                let isSelected = Calendar.current.isDate(date, inSameDayAs: viewModel.selectedDate)
                let hasWorkout = !viewModel.workouts(on: date).isEmpty
                let isDropTarget = dropTargetDate.map { Calendar.current.isDate($0, inSameDayAs: date) } ?? false
                Button {
                    viewModel.selectedDate = date
                } label: {
                    VStack(spacing: 4) {
                        Text(date.formatted(.dateTime.weekday(.narrow)))
                            .font(TCFont.caption)
                        Text(date.formatted(.dateTime.day()))
                            .font(TCFont.subheadline.weight(.semibold))
                        Circle()
                            .fill(hasWorkout ? TCColor.brand : .clear)
                            .frame(width: 5, height: 5)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, TCSpacing.xs)
                    .background(isDropTarget ? TCColor.brand.opacity(0.3) : (isSelected ? TCColor.brand.opacity(0.15) : Color.clear))
                    .clipShape(RoundedRectangle(cornerRadius: TCRadius.control, style: .continuous))
                }
                .buttonStyle(.plain)
                .foregroundStyle(isSelected ? TCColor.brand : TCColor.primaryText)
                .accessibilityIdentifier("calendarDay.\(calendarDayKeyFormatter.string(from: date))")
                .accessibilityLabel(dayAccessibilityLabel(date: date, hasWorkout: hasWorkout))
                .accessibilityAddTraits(isSelected ? .isSelected : [])
                .dropDestination(for: String.self) { items, _ in
                    guard let idString = items.first, let workoutId = UUID(uuidString: idString),
                          let workout = viewModel.plan?.allWorkouts.first(where: { $0.id == workoutId }) else { return false }
                    Task { await viewModel.reschedule(workout, to: date) }
                    return true
                } isTargeted: { targeted in
                    dropTargetDate = targeted ? date : nil
                }
            }
        }
        .padding(.horizontal, TCSpacing.sm)
        .padding(.top, TCSpacing.xs)
    }

    private func dayAccessibilityLabel(date: Date, hasWorkout: Bool) -> String {
        let dateText = date.formatted(.dateTime.weekday(.wide).day().month(.wide))
        return hasWorkout ? "\(dateText), séance prévue" : "\(dateText), journée de repos"
    }
}

private struct MicrocycleBanner: View {
    let microcycle: Microcycle

    var body: some View {
        HStack {
            Text("Semaine \(microcycle.weekNumber)" + (microcycle.isRecoveryWeek ? " · allégée" : ""))
                .font(TCFont.caption.weight(.medium))
            Spacer()
            Text("\(Int(microcycle.plannedLoad)) TSS planifiés")
                .font(TCFont.caption)
                .foregroundStyle(TCColor.secondaryText)
        }
        .padding(.horizontal, TCSpacing.md)
        .padding(.vertical, TCSpacing.xs)
        .background(microcycle.isRecoveryWeek ? TCColor.intensityEasy.opacity(0.12) : Color.clear)
    }
}
