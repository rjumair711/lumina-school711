export const REPORT_TABS = ['overview', 'attendance', 'finance', 'academics'] as const

export type ReportTab = (typeof REPORT_TABS)[number]
