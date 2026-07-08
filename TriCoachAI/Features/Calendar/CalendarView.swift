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
            VStack(spacing: TCSpacing.sm) {
                monthHeader
                weekdayHeaderRow
                monthGrid

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

    private var monthHeader: some View {
        HStack {
            Button {
                viewModel.goToPreviousMonth()
            } label: {
                Image(systemName: "chevron.left")
                    .frame(width: 32, height: 32)
            }
            .disabled(!viewModel.canGoToPreviousMonth)
            .accessibilityLabel("Mois précédent")

            Spacer()

            VStack(spacing: 2) {
                Text(viewModel.displayedMonth.formatted(.dateTime.month(.wide).year()))
                    .font(TCFont.headline)
                Button("Aujourd'hui") { viewModel.goToToday() }
                    .font(TCFont.caption.weight(.medium))
            }

            Spacer()

            Button {
                viewModel.goToNextMonth()
            } label: {
                Image(systemName: "chevron.right")
                    .frame(width: 32, height: 32)
            }
            .disabled(!viewModel.canGoToNextMonth)
            .accessibilityLabel("Mois suivant")
        }
        .padding(.horizontal, TCSpacing.md)
        .padding(.top, TCSpacing.xs)
    }

    private var weekdayHeaderRow: some View {
        HStack(spacing: 4) {
            ForEach(Weekday.orderedWeek) { weekday in
                Text(weekday.narrowLabel)
                    .font(TCFont.caption)
                    .foregroundStyle(TCColor.secondaryText)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, TCSpacing.sm)
    }

    private var monthGrid: some View {
        let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)
        return LazyVGrid(columns: columns, spacing: 4) {
            ForEach(viewModel.monthGridDates, id: \.self) { date in
                let hasWorkout = !viewModel.workouts(on: date).isEmpty
                MonthDayCell(
                    date: date,
                    isSelected: Calendar.current.isDate(date, inSameDayAs: viewModel.selectedDate),
                    isToday: Calendar.current.isDateInToday(date),
                    isCurrentMonth: Calendar.current.isDate(date, equalTo: viewModel.displayedMonth, toGranularity: .month),
                    hasWorkout: hasWorkout,
                    isDropTarget: dropTargetDate.map { Calendar.current.isDate($0, inSameDayAs: date) } ?? false,
                    onSelect: { viewModel.selectDay(date) }
                )
                .accessibilityIdentifier("calendarDay.\(calendarDayKeyFormatter.string(from: date))")
                .accessibilityLabel(dayAccessibilityLabel(date: date, hasWorkout: hasWorkout))
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
    }

    private func dayAccessibilityLabel(date: Date, hasWorkout: Bool) -> String {
        let dateText = date.formatted(.dateTime.weekday(.wide).day().month(.wide))
        return hasWorkout ? "\(dateText), séance prévue" : "\(dateText), journée de repos"
    }
}

private struct MonthDayCell: View {
    let date: Date
    let isSelected: Bool
    let isToday: Bool
    let isCurrentMonth: Bool
    let hasWorkout: Bool
    let isDropTarget: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: 4) {
                Text(date.formatted(.dateTime.day()))
                    .font(TCFont.subheadline.weight(.medium))
                Circle()
                    .fill(hasWorkout ? TCColor.brand : .clear)
                    .frame(width: 5, height: 5)
            }
            .frame(maxWidth: .infinity)
            .aspectRatio(1, contentMode: .fit)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: TCRadius.control, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: TCRadius.control, style: .continuous)
                    .strokeBorder(isToday && !isSelected ? TCColor.brand.opacity(0.5) : .clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .foregroundStyle(foregroundColor)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private var backgroundColor: Color {
        if isDropTarget { return TCColor.brand.opacity(0.3) }
        if isSelected { return TCColor.brand.opacity(0.15) }
        return .clear
    }

    private var foregroundColor: Color {
        if isSelected { return TCColor.brand }
        return isCurrentMonth ? TCColor.primaryText : TCColor.secondaryText.opacity(0.4)
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
