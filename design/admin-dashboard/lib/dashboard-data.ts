export const companies = [
  { name: 'Healthcare Systems', email: 'admin@healthcare.com', initials: 'HS', tone: 'info', joined: '4 months ago', status: 'Active' },
  { name: 'Financial Services', email: 'admin@financial.com', initials: 'FS', tone: 'emerald', joined: '4 months ago', status: 'Active' },
  { name: 'Manufacturing Corp', email: 'admin@manufacturing.com', initials: 'MC', tone: 'violet', joined: '4 months ago', status: 'Active' },
  { name: 'Creative Agency', email: 'admin@creativeagency.com', initials: 'CA', tone: 'indigo', joined: '4 months ago', status: 'Active' },
  { name: 'Tech Solutions Inc', email: 'admin@techsolutions.com', initials: 'TS', tone: 'amber', joined: '4 months ago', status: 'Active' },
] as const

export const topPlans = [
  { rank: 1, name: 'Pro', revenue: '$199.96', subscribers: '4 subscribers', pct: 100 },
  { rank: 2, name: 'Starter', revenue: '$39.98', subscribers: '2 subscribers', pct: 20 },
  { rank: 3, name: 'Free', revenue: '$0.00', subscribers: '1 subscribers', pct: 0 },
] as const

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const
export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const

/** 98 total */
export const companiesByMonth = [3, 5, 4, 7, 6, 9, 8, 11, 7, 13, 10, 15]
/** $93,900.00 total */
export const revenueByMonth = [4100, 5700, 3900, 7100, 6400, 8700, 7500, 8800, 8000, 10500, 9800, 13400]

export const money = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
