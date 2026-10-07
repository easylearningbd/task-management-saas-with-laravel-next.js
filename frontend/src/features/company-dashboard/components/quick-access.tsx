'use client'

import { Banknote, Briefcase, Play, Plus, Receipt, SquareCheck, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/* The page header's primary "+ Quick Access" (design/user-dashboard page.tsx) opening the
   quick-create menu from PRD §6.1: Add Project, Add Task, Create Invoice, Add Client,
   Add Expense, Start Timer. None of those pages exist yet, so every action is a disabled
   "Coming soon" item (UNBUILT ROUTES rule) — the menu itself opens and is keyboard-usable.
   Icons: the hero shortcuts' glyphs for project / task / invoice / client, `Receipt` for an
   expense and the Start button's `Play` for the timer. */
const ACTIONS = [
  { key: 'addProject', icon: Briefcase },
  { key: 'addTask', icon: SquareCheck },
  { key: 'createInvoice', icon: Banknote },
  { key: 'addClient', icon: UserPlus },
  { key: 'addExpense', icon: Receipt },
  { key: 'startTimer', icon: Play },
] as const

export function QuickAccess() {
  const t = useTranslations('companyDashboard.quickAccess')
  const tShared = useTranslations('shared')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="size-icon" aria-hidden="true" />
          {t('button')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-label={t('label')}>
        <DropdownMenuLabel>{t('button')}</DropdownMenuLabel>
        {ACTIONS.map((action) => (
          <DropdownMenuItem key={action.key} disabled hint={tShared('comingSoon')}>
            <action.icon className="size-icon" aria-hidden="true" />
            {t(action.key)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
