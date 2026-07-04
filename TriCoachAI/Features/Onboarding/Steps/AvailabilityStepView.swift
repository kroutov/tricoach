import SwiftUI

struct AvailabilityStepView: View {
    @Binding var availability: Availability

    var body: some View {
        VStack(alignment: .leading, spacing: TCSpacing.lg) {
            Text("Vos disponibilités")
                .font(TCFont.title)

            OnboardingField(label: "Séances par semaine") {
                Stepper(value: $availability.sessionsPerWeek, in: 1...14) {
                    Text("\(availability.sessionsPerWeek) séances")
                }
            }

            OnboardingField(label: "Durée maximale par séance") {
                Stepper(value: $availability.maxSessionDurationMin, in: 20...240, step: 5) {
                    Text("\(availability.maxSessionDurationMin) min")
                }
            }

            OnboardingField(label: "Jours disponibles") {
                ChipGrid(items: Weekday.orderedWeek, selection: $availability.availableDays) { $0.label }
            }

            OnboardingField(label: "Créneaux horaires préférés") {
                ChipGrid(items: TimeSlot.allCases, selection: $availability.preferredTimeSlots) { $0.label }
            }

            OnboardingField(label: "Jours de repos obligatoires") {
                ChipGrid(items: Weekday.orderedWeek, selection: $availability.mandatoryRestDays) { $0.label }
            }
        }
    }
}

struct ChipGrid<Item: Hashable>: View {
    let items: [Item]
    @Binding var selection: Set<Item>
    let label: (Item) -> String

    private let columns = [GridItem(.adaptive(minimum: 100), spacing: 8)]

    var body: some View {
        LazyVGrid(columns: columns, alignment: .leading, spacing: 8) {
            ForEach(items, id: \.self) { item in
                let isSelected = selection.contains(item)
                Button {
                    if isSelected { selection.remove(item) } else { selection.insert(item) }
                } label: {
                    Text(label(item))
                        .font(TCFont.caption.weight(.medium))
                        .padding(.horizontal, TCSpacing.sm)
                        .padding(.vertical, 6)
                        .background(isSelected ? TCColor.brand : TCColor.secondaryBackground)
                        .foregroundStyle(isSelected ? .white : TCColor.primaryText)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
    }
}
