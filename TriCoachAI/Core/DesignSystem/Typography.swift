import SwiftUI

enum TCFont {
    static let largeTitle = Font.largeTitle.bold()
    static let title = Font.title2.bold()
    static let headline = Font.headline
    static let body = Font.body
    static let subheadline = Font.subheadline
    static let caption = Font.caption
    static let metric = Font.system(.title, design: .rounded, weight: .bold)
    static let metricLabel = Font.system(.caption, design: .rounded, weight: .medium)
}

enum TCSpacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
}

enum TCRadius {
    static let card: CGFloat = 16
    static let control: CGFloat = 12
    static let pill: CGFloat = 999
}
