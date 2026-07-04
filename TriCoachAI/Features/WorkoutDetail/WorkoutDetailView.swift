import SwiftUI

struct WorkoutDetailView: View {
    let container: DependencyContainer
    var onUpdated: () -> Void

    @State private var viewModel: WorkoutDetailViewModel
    @State private var showFeedbackSheet = false
    @State private var showAdaptationAlert = false
    @State private var showRescheduleSheet = false

    init(container: DependencyContainer, workout: Workout, onUpdated: @escaping () -> Void) {
        self.container = container
        self.onUpdated = onUpdated
        _viewModel = State(initialValue: WorkoutDetailViewModel(container: container, workout: workout))
    }

    private var workout: Workout { viewModel.workout }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: TCSpacing.md) {
                header
                loadSummary
                sectionCard(title: "Échauffement", section: workout.structure.warmup)
                mainSetCard
                sectionCard(title: "Retour au calme", section: workout.structure.cooldown)
                actions
            }
            .padding(TCSpacing.md)
        }
        .navigationTitle(workout.sport.label)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showFeedbackSheet) {
            FeedbackSheet(viewModel: viewModel) {
                showFeedbackSheet = false
                if viewModel.lastAdaptationSummary != nil { showAdaptationAlert = true }
                onUpdated()
            }
        }
        .sheet(isPresented: $showRescheduleSheet) {
            RescheduleSheet(viewModel: viewModel) {
                showRescheduleSheet = false
                onUpdated()
            }
        }
        .alert("Votre plan a été ajusté", isPresented: $showAdaptationAlert) {
            Button("Compris") {}
        } message: {
            Text(viewModel.lastAdaptationSummary ?? "")
        }
        .alert("Conflit détecté", isPresented: conflictAlertBinding) {
            Button("Compris") {}
        } message: {
            Text(viewModel.rescheduleConflictMessage ?? "")
        }
    }

    private var conflictAlertBinding: Binding<Bool> {
        Binding(get: { viewModel.rescheduleConflictMessage != nil }, set: { if !$0 { viewModel.rescheduleConflictMessage = nil } })
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: TCSpacing.xs) {
            HStack {
                PillBadge(text: workout.intensity.label, tint: TCColor.color(for: workout.intensity))
                if workout.status != .planned {
                    PillBadge(text: workout.status == .completed ? "Complétée" : "Ratée", tint: workout.status == .completed ? .green : .gray)
                }
                Spacer()
                Text(workout.date.formatted(date: .abbreviated, time: .omitted))
                    .font(TCFont.caption)
                    .foregroundStyle(TCColor.secondaryText)
            }
            Text(workout.title)
                .font(TCFont.largeTitle)
            Text(workout.summary)
                .font(TCFont.body)
                .foregroundStyle(TCColor.secondaryText)
        }
    }

    private var loadSummary: some View {
        CardView {
            HStack {
                metric(label: "Durée", value: "\(workout.plannedDurationMin) min")
                Divider()
                metric(label: "RPE cible", value: workout.rpeTarget.map { "\($0)/10" } ?? "—")
                Divider()
                metric(label: "TSS estimé", value: workout.estimatedTSS.map { "\(Int($0))" } ?? "—")
                Divider()
                metric(label: "TRIMP", value: workout.estimatedTRIMP.map { "\(Int($0))" } ?? "—")
            }
        }
    }

    private func metric(label: String, value: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(TCFont.headline)
            Text(label).font(TCFont.caption).foregroundStyle(TCColor.secondaryText)
        }
        .frame(maxWidth: .infinity)
    }

    private func sectionCard(title: String, section: WorkoutSection) -> some View {
        CardView {
            VStack(alignment: .leading, spacing: TCSpacing.xs) {
                Text("\(title) · \(section.durationMin) min").font(TCFont.headline)
                Text(section.description).font(TCFont.subheadline).foregroundStyle(TCColor.secondaryText)
                ZoneRow(target: section.target, sport: workout.sport)
            }
        }
    }

    private var mainSetCard: some View {
        CardView {
            VStack(alignment: .leading, spacing: TCSpacing.sm) {
                Text("Corps principal").font(TCFont.headline)
                ForEach(workout.structure.mainSet) { block in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(blockLabel(block))
                            .font(TCFont.subheadline.weight(.semibold))
                        if let note = block.note {
                            Text(note).font(TCFont.caption).foregroundStyle(TCColor.secondaryText)
                        }
                        ZoneRow(target: block.target, sport: workout.sport)
                    }
                    if block.id != workout.structure.mainSet.last?.id {
                        Divider()
                    }
                }
            }
        }
    }

    private func blockLabel(_ block: IntervalBlock) -> String {
        if block.repetitions <= 1 {
            return "\(block.workDurationSec / 60) min continu"
        }
        let recovery = block.recoveryDurationSec > 0 ? ", récup \(block.recoveryDurationSec)s" : ""
        let workLabel = block.workDurationSec >= 60 ? "\(block.workDurationSec / 60) min" : "\(block.workDurationSec)s"
        return "\(block.repetitions) x \(workLabel)\(recovery)"
    }

    private var actions: some View {
        VStack(spacing: TCSpacing.sm) {
            if workout.status == .planned {
                Button("Marquer comme complétée") { showFeedbackSheet = true }
                    .buttonStyle(PrimaryButtonStyle())
                Button("Déplacer cette séance") { showRescheduleSheet = true }
                    .accessibilityHint("Choisir un autre jour de la semaine d'entraînement pour cette séance, sans glisser-déposer")
                Button("Marquer comme ratée") {
                    Task {
                        await viewModel.markSkipped()
                        onUpdated()
                    }
                }
                .foregroundStyle(.red)
            }
            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
                    .font(TCFont.caption)
                    .foregroundStyle(.red)
            }
        }
        .padding(.top, TCSpacing.sm)
    }
}

private struct ZoneRow: View {
    let target: TargetZone
    let sport: SportType

    var body: some View {
        HStack(spacing: TCSpacing.sm) {
            if let zone = target.hrZone {
                Label("Z\(zone)", systemImage: "heart.fill")
            }
            if let hr = target.hrRangeBpm {
                Text("\(hr.lowerBound)-\(hr.upperBound) bpm")
            }
            if let pace = target.paceSecPerKm {
                Text("\(paceLabel(pace.lowerBound))-\(paceLabel(pace.upperBound))/km")
            }
            if let pace100 = target.paceSecPer100m {
                Text("\(paceLabel(pace100.lowerBound))-\(paceLabel(pace100.upperBound))/100m")
            }
            if let power = target.powerWatts {
                Text("\(power.lowerBound)-\(power.upperBound) W")
            }
        }
        .font(TCFont.caption)
        .foregroundStyle(TCColor.secondaryText)
    }

    private func paceLabel(_ seconds: Int) -> String {
        String(format: "%d:%02d", seconds / 60, seconds % 60)
    }
}

/// The accessible, non-drag equivalent of the calendar's drag & drop
/// rescheduling — same server-side validation, just driven by a
/// `DatePicker` instead of a drag gesture (see `CalendarView`).
private struct RescheduleSheet: View {
    var viewModel: WorkoutDetailViewModel
    var onDone: () -> Void

    @State private var newDate: Date

    init(viewModel: WorkoutDetailViewModel, onDone: @escaping () -> Void) {
        self.viewModel = viewModel
        self.onDone = onDone
        _newDate = State(initialValue: viewModel.workout.date)
    }

    var body: some View {
        NavigationStack {
            Form {
                DatePicker("Nouvelle date", selection: $newDate, displayedComponents: .date)
                    .datePickerStyle(.graphical)
                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage).font(TCFont.caption).foregroundStyle(.red)
                }
            }
            .navigationTitle("Déplacer la séance")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler", action: onDone)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Déplacer") {
                        Task {
                            await viewModel.reschedule(to: newDate)
                            if viewModel.errorMessage == nil { onDone() }
                        }
                    }
                    .disabled(viewModel.isSubmitting)
                }
            }
        }
    }
}

private struct FeedbackSheet: View {
    var viewModel: WorkoutDetailViewModel
    var onDone: () -> Void

    var body: some View {
        NavigationStack {
            Form {
                Stepper(value: Binding(get: { viewModel.actualDurationMin }, set: { viewModel.actualDurationMin = $0 }), in: 5...300, step: 5) {
                    Text("Durée réalisée : \(viewModel.actualDurationMin) min")
                }
                Stepper(value: Binding(get: { viewModel.actualRPE }, set: { viewModel.actualRPE = $0 }), in: 1...10) {
                    Text("RPE ressenti : \(viewModel.actualRPE)/10")
                }
            }
            .navigationTitle("Feedback séance")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Valider") {
                        Task {
                            await viewModel.markCompleted()
                            onDone()
                        }
                    }
                    .disabled(viewModel.isSubmitting)
                }
            }
        }
    }
}
