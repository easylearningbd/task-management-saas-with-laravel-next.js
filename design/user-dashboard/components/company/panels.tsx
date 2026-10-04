'use client'

import * as React from 'react'
import {
  Activity, Target, FileText, TrendingUp, ChevronDown, ChevronRight,
  SquareCheck, CircleAlert, Briefcase, Clock, DollarSign,
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { performance, taskDeadlines, recentContracts, recentTasks } from '@/lib/company-data'

/* Shared card head with a rule under it — the variant this page uses everywhere. */
function Head({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border px-card py-4.5">
      <div className="min-w-0">
        <h2 className="text-title-card">{title}</h2>
        <p className="text-caption font-normal text-muted-foreground">{subtitle}</p>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
    </div>
  )
}

function ViewAll() {
  return (
    <a
      href="#"
      className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-strong hover:underline focus-visible:rounded-sm focus-visible:shadow-focus focus-visible:outline-none"
    >
      View all
      <ChevronRight className="size-3.5" />
    </a>
  )
}

/* ------------------------------------------------------------ Performance */

const PERF: Record<string, { tile: string; icon: string; bar: string; track: string; text: string; glyph: React.ElementType }> = {
  blue:    { tile: 'bg-stat-blue-icon-bg',    icon: 'text-stat-blue-icon',    bar: 'bg-stat-blue-icon',    track: 'bg-stat-blue-icon-bg',    text: 'text-stat-blue-icon',    glyph: Target },
  emerald: { tile: 'bg-stat-emerald-icon-bg', icon: 'text-stat-emerald-icon', bar: 'bg-stat-emerald-icon', track: 'bg-stat-emerald-icon-bg', text: 'text-stat-emerald-icon', glyph: FileText },
  violet:  { tile: 'bg-stat-violet-icon-bg',  icon: 'text-stat-violet-icon',  bar: 'bg-stat-violet-icon',  track: 'bg-stat-violet-icon-bg',  text: 'text-stat-violet-icon',  glyph: TrendingUp },
}

export function PerformanceOverview() {
  return (
    <Card className="flex h-full flex-col">
      <Head
        title="Performance Overview"
        subtitle="Key metrics across tasks, invoices and profitability"
        action={
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Activity className="size-icon" strokeWidth={1.75} />
          </span>
        }
      />
      <ul className="flex-1">
        {performance.map((row, i) => {
          const p = PERF[row.hue]
          return (
            <li
              key={row.label}
              className={cn(
                'flex flex-wrap items-center gap-x-4 gap-y-3 px-card py-4',
                i < performance.length - 1 && 'border-b border-border',
              )}
            >
              <span className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-lg', p.tile, p.icon)}>
                <p.glyph className="size-icon-lg" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1 sm:w-[170px] sm:flex-none">
                <p className="text-title-row">{row.label}</p>
                <p className="text-body-sm text-muted-foreground">{row.sub}</p>
              </div>
              <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-caption font-normal text-muted-foreground">Progress</span>
                  <span className={cn('text-body-sm font-medium', p.text)}>{row.pct}%</span>
                </div>
                <div className={cn('mt-1.5 h-1.5 overflow-hidden rounded-sm', p.track)}>
                  <div
                    className={cn('h-full rounded-sm', p.bar)}
                    style={{ width: `${row.pct}%` }}
                    role="progressbar"
                    aria-valuenow={row.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={row.label}
                  />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* -------------------------------------------------------- Project progress */

export function ProjectProgress() {
  const pct = 33
  const R = 62
  const C = 2 * Math.PI * R
  return (
    <Card className="flex h-full flex-col">
      <Head
        title="Project Progress"
        subtitle="Select a project to view its completion details"
        action={
          <>
            <label className="relative inline-flex">
              <select
                className="h-control w-[160px] appearance-none truncate rounded-lg border border-input bg-card pr-8 pl-3 text-body focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none"
                defaultValue="edt"
              >
                <option value="edt">Enterprise Digital...</option>
                <option value="scm">Supply Chain Manage...</option>
                <option value="wap">Workflow Automation...</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-icon -translate-y-1/2 text-muted-foreground" />
            </label>
            <ViewAll />
          </>
        }
      />
      <div className="flex flex-1 flex-wrap items-center gap-5 px-card py-4">
        <div className="relative mx-auto shrink-0">
          <svg viewBox="0 0 150 150" className="size-[144px] -rotate-90">
            <circle cx="75" cy="75" r={R} fill="none" stroke="var(--track)" strokeWidth="17" />
            <circle
              cx="75" cy="75" r={R} fill="none"
              stroke="var(--primary)" strokeWidth="17" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[30px] leading-9 font-bold tracking-[-0.02em]">{pct}%</span>
            <span className="text-body-sm text-muted-foreground">complete</span>
          </div>
        </div>

        <div className="min-w-[260px] flex-1">
          <h3 className="text-title-section">Enterprise Digital Transformation</h3>
          <Badge tone="info" className="mt-2 border border-info/20">Completed</Badge>

          <div className="mt-3.5 flex items-center gap-3 rounded-lg border border-border px-4 py-2.5">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground">
              <DollarSign className="size-icon" strokeWidth={1.75} />
            </span>
            <span>
              <span className="block text-caption font-normal text-muted-foreground">Total Budget</span>
              <span className="block text-title-section">$850,000.00</span>
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border px-4 py-2.5">
              <span className="block text-caption font-normal text-muted-foreground">Spent</span>
              <span className="block text-title-section">$6,221.00</span>
            </div>
            <div className="rounded-lg border border-border px-4 py-2.5">
              <span className="block text-caption font-normal text-muted-foreground">Remaining</span>
              <span className="block text-title-section">$843,779.00</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------- Deadlines */

const PRIORITY: Record<string, string> = {
  Medium: 'bg-info-soft text-info border border-info/20',
  Urgent: 'bg-danger-soft text-danger border border-danger/20',
  High: 'bg-stat-amber text-stat-amber-icon border border-stat-amber-icon/20',
}

export function TaskDeadlines() {
  return (
    <Card className="flex h-full flex-col">
      <Head title="Upcoming Task Deadlines" subtitle="Tasks due soon" />
      <ul className="flex-1">
        {taskDeadlines.map((t, i) => (
          <li
            key={t.title + t.due}
            className={cn(
              'flex items-center gap-3 px-card py-3.5',
              i < taskDeadlines.length - 1 && 'border-b border-border',
            )}
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <SquareCheck className="size-icon" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-title-row">{t.title}</p>
              <p className="truncate text-body-sm text-muted-foreground">{t.project}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-body-sm font-medium text-danger">{t.due}</span>
              <span className={cn('inline-flex h-6 items-center rounded-md px-2.5 text-badge', PRIORITY[t.priority])}>
                {t.priority}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function InvoiceDeadlines() {
  return (
    <Card className="flex h-full flex-col">
      <Head title="Upcoming Invoice Deadlines" subtitle="Unpaid invoices due soon" action={<ViewAll />} />
      <div className="flex flex-1 flex-col items-center justify-center px-card py-12 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CircleAlert className="size-6" strokeWidth={1.75} />
        </span>
        <p className="mt-5 text-body text-muted-foreground">No upcoming invoice deadlines</p>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------- Recent */

const CONTRACT_STATUS: Record<string, string> = {
  Active: 'bg-success-soft text-success border border-success/20',
  Completed: 'bg-stat-violet text-stat-violet-label border border-stat-violet-label/20',
  Signed: 'bg-info-soft text-info border border-info/20',
}

const TASK_STATUS: Record<string, string> = {
  Done: 'bg-primary-soft text-primary border border-primary/20',
  Cancelled: 'bg-neutral-soft text-neutral border border-neutral/20',
}

export function RecentContracts() {
  return (
    <Card className="flex h-full flex-col">
      <Head title="Recent Contracts" subtitle="Latest contracts by status" action={<ViewAll />} />
      <ul className="flex-1">
        {recentContracts.map((c, i) => (
          <li
            key={c.title}
            className={cn(
              'flex items-center gap-3 px-card py-3',
              i < recentContracts.length - 1 && 'border-b border-border',
            )}
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Briefcase className="size-icon" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-title-row">{c.title}</p>
              <p className="mt-0.5 flex items-center gap-1.5">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">
                  {c.initials}
                </span>
                <span className="truncate text-body-sm text-muted-foreground">{c.client}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-money">{c.amount}</span>
              <span className={cn('inline-flex h-6 items-center rounded-md px-2.5 text-badge', CONTRACT_STATUS[c.status])}>
                {c.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function RecentTasks() {
  return (
    <Card className="flex h-full flex-col">
      <Head title="Recent Tasks" subtitle="Latest task activity in your projects" action={<ViewAll />} />
      <ul className="flex-1">
        {recentTasks.map((t, i) => (
          <li
            key={t.title + i}
            className={cn(
              'flex items-center gap-3 px-card py-3',
              i < recentTasks.length - 1 && 'border-b border-border',
            )}
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Clock className="size-icon" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-title-row">{t.title}</p>
              <p className="truncate text-body-sm text-muted-foreground">{t.project}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={cn('inline-flex h-6 items-center rounded-md px-2.5 text-badge', TASK_STATUS[t.status])}>
                {t.status}
              </span>
              <span className="text-caption font-normal text-muted-foreground">{t.when}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
