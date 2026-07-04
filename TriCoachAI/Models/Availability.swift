import Foundation

enum Weekday: Int, Codable, CaseIterable, Identifiable {
    case monday = 2, tuesday = 3, wednesday = 4, thursday = 5, friday = 6, saturday = 7, sunday = 1
    var id: Int { rawValue }

    var label: String {
        switch self {
        case .monday: return "Lundi"
        case .tuesday: return "Mardi"
        case .wednesday: return "Mercredi"
        case .thursday: return "Jeudi"
        case .friday: return "Vendredi"
        case .saturday: return "Samedi"
        case .sunday: return "Dimanche"
        }
    }

    /// Ordered Monday-first, more natural for a training week than Calendar's Sunday-first.
    static let orderedWeek: [Weekday] = [.monday, .tuesday, .wednesday, .thursday, .friday, .saturday, .sunday]
}

enum TimeSlot: String, Codable, CaseIterable, Identifiable {
    case earlyMorning, morning, lunch, afternoon, evening
    var id: String { rawValue }

    var label: String {
        switch self {
        case .earlyMorning: return "Tôt le matin (avant 7h)"
        case .morning: return "Matin"
        case .lunch: return "Pause déjeuner"
        case .afternoon: return "Après-midi"
        case .evening: return "Soir"
        }
    }
}

struct Availability: Codable, Equatable {
    var sessionsPerWeek: Int = 4
    var maxSessionDurationMin: Int = 90
    var availableDays: Set<Weekday> = [.monday, .tuesday, .thursday, .saturday]
    var preferredTimeSlots: Set<TimeSlot> = [.evening]
    var mandatoryRestDays: Set<Weekday> = [.sunday]
    var updatedAt: Date = .now

    static let `default` = Availability()
}
