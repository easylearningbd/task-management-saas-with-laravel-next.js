export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const
export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const

/** Paid invoice revenue per month — totals $22,500.00 */
export const revenueByMonth = [450, 900, 1150, 800, 1450, 1950, 1850, 2400, 2250, 2700, 3050, 3550]
/** Logged hours per month — totals 750 h */
export const hoursByMonth = [42, 38, 55, 61, 48, 72, 65, 80, 58, 74, 69, 88]

export const performance = [
  { hue: 'blue',    label: 'Task Completion Rate',  sub: '27 of 52 tasks done',   pct: 51.9 },
  { hue: 'emerald', label: 'Invoice Payment Rate',  sub: '5 of 16 invoices paid', pct: 31.3 },
  { hue: 'violet',  label: 'Profit Margin',         sub: 'Net: $4,800.00',        pct: 69.6 },
] as const

export const taskDeadlines = [
  { title: 'API Integration',      project: 'Enterprise Digital Transformation', due: '2026-09-08', priority: 'Medium' },
  { title: 'Backup Implementation', project: 'Supply Chain Management System',   due: '2026-09-09', priority: 'Urgent' },
  { title: 'API Integration',      project: 'Supply Chain Management System',    due: '2026-09-11', priority: 'High' },
] as const

export const recentContracts = [
  { title: 'Development Contract - Workflow Automation Platform',    client: 'Apple Inc',             initials: 'AI', amount: '$380,000.00', status: 'Active' },
  { title: 'Maintenance Agreement - Enterprise Digital Transformation', client: 'Emily Davis',        initials: 'ED', amount: '$850,000.00', status: 'Completed' },
  { title: 'Service Agreement - AI-Powered Analytics Platform',      client: 'Emily Davis',           initials: 'ED', amount: '$650,000.00', status: 'Completed' },
  { title: 'Consulting Contract - Mobile-First Application Suite',   client: 'Google Cloud Platform', initials: 'GP', amount: '$420,000.00', status: 'Completed' },
  { title: 'Development Contract - Inventory Management',            client: 'John Smith',            initials: 'JS', amount: '$28,000.00',  status: 'Signed' },
] as const

export const recentTasks = [
  { title: 'Code Review',         project: 'Workflow Automation Platform',        status: 'Cancelled', when: '4 months ago' },
  { title: 'API Integration',     project: 'Data Lake and Analytics Infrastructure', status: 'Done',   when: '4 months ago' },
  { title: 'UI/UX Implementation', project: 'Data Lake and Analytics Infrastructure', status: 'Cancelled', when: '4 months ago' },
  { title: 'Documentation',       project: 'Data Lake and Analytics Infrastructure', status: 'Done',   when: '4 months ago' },
  { title: 'API Integration',     project: 'Workflow Automation Platform',        status: 'Cancelled', when: '4 months ago' },
] as const

export const money = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
