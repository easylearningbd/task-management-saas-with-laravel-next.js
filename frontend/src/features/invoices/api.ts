'use client'

import { isAxiosError } from 'axios'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Paginated } from '@/lib/paginated'
import type { Resource } from '@/features/auth/types'
import type {
  Invoice,
  InvoiceListItem,
  InvoiceListParams,
  InvoicePayload,
  InvoicePayment,
  InvoiceSettings,
  PaymentPayload,
  PublicInvoice,
  Tax,
} from '@/features/invoices/types'

/* The company's invoices (all through the shared axios client):
   GET|POST /api/v1/invoices · GET|PUT|DELETE …/{id} · GET|POST …/{id}/payments ·
   DELETE /api/v1/invoice-payments/{id} · GET /api/v1/taxes · GET|PUT /api/v1/settings/invoice-details ·
   GET /api/v1/public/invoices/{token} (no sign-in — the share page).
   The server computes every amount and owns every rule (Draft / Sent only for edits, the overpayment
   guard, tenancy): its 422s reach the caller untouched.

   Invalidation: every write refreshes the lists; a write to one invoice also refreshes that invoice
   and its payments (create / update / payments put the server's fresh invoice straight into the
   cache); the billing-details edit refreshes the settings. */

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: ['invoices', 'list'] as const,
  list: (params: InvoiceListParams) => ['invoices', 'list', params] as const,
  details: ['invoices', 'detail'] as const,
  detail: (id: number) => ['invoices', 'detail', id] as const,
  payments: (id: number) => ['invoices', 'detail', id, 'payments'] as const,
  taxes: ['invoices', 'taxes'] as const,
  settings: ['invoices', 'settings'] as const,
  public: (token: string) => ['invoices', 'public', token] as const,
}

const INVOICES = '/api/v1/invoices'
const isId = (id: number | null | undefined): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0

/* ── Reads ── */

/** One page of the list; the previous page stays on screen while the next one loads. */
export function useInvoices(params: InvoiceListParams) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Paginated<InvoiceListItem>>(INVOICES, { params, signal })
      return data
    },
    placeholderData: keepPreviousData,
  })
}

/** One invoice with its client, project, lines, taxes and payments. Another company's id → 404. */
export function useInvoice(id: number | null, options: { initialData?: Invoice } = {}) {
  return useQuery({
    queryKey: invoiceKeys.detail(id ?? 0),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<Invoice>>(`${INVOICES}/${id ?? 0}`, { signal })
      return data.data
    },
    enabled: isId(id),
    initialData: options.initialData,
  })
}

/** The company's active taxes — the form's Tax options. */
export function useTaxes() {
  return useQuery({
    queryKey: invoiceKeys.taxes,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<Tax[]>>('/api/v1/taxes', { signal })
      return data.data
    },
  })
}

/** The company's "Billed From" block. */
export function useInvoiceSettings() {
  return useQuery({
    queryKey: invoiceKeys.settings,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<InvoiceSettings>>('/api/v1/settings/invoice-details', { signal })
      return data.data
    },
  })
}

/** The share page's invoice, by token — null when the token is unknown (404). No sign-in needed. */
export function usePublicInvoice(token: string) {
  return useQuery({
    queryKey: invoiceKeys.public(token),
    queryFn: async ({ signal }): Promise<PublicInvoice | null> => {
      try {
        const { data } = await api.get<Resource<PublicInvoice>>(`/api/v1/public/invoices/${encodeURIComponent(token)}`, { signal })
        return data.data
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) return null
        throw error
      }
    },
  })
}

/* ── Writes ── */

function useRefresh() {
  const queryClient = useQueryClient()
  return {
    lists: () => queryClient.invalidateQueries({ queryKey: invoiceKeys.lists }),
    /** Put the server's fresh invoice in the cache and refresh everything about it. */
    invoice: async (invoice: Invoice) => {
      queryClient.setQueryData(invoiceKeys.detail(invoice.id), invoice)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: invoiceKeys.lists }),
        queryClient.invalidateQueries({ queryKey: invoiceKeys.payments(invoice.id) }),
      ])
    },
    byId: (id: number) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: invoiceKeys.lists }),
        queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) }),
      ]),
  }
}

export function useCreateInvoice() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (payload: InvoicePayload) => {
      const { data } = await api.post<Resource<Invoice>>(INVOICES, payload)
      return data.data
    },
    onSuccess: refresh.invoice,
  })
}

/** Draft and Sent only — a Partial / Paid invoice answers 422. */
export function useUpdateInvoice(id: number) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (payload: InvoicePayload) => {
      const { data } = await api.put<Resource<Invoice>>(`${INVOICES}/${id}`, payload)
      return data.data
    },
    onSuccess: refresh.invoice,
  })
}

/** Soft delete — Draft and Sent only. */
export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`${INVOICES}/${id}`)
      return id
    },
    onSuccess: async (id) => {
      queryClient.removeQueries({ queryKey: invoiceKeys.detail(id) })
      await queryClient.invalidateQueries({ queryKey: invoiceKeys.lists })
    },
  })
}

/** Add a payment — at most the balance due (422 otherwise); the response carries the recalculated invoice.
 *  A refusal refetches the invoice: the balance may have moved since the page loaded (another payment
 *  meanwhile), and the page — and the modal's maximum — must show the current one. */
export function useAddPayment(invoiceId: number) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (payload: PaymentPayload) => {
      const { data } = await api.post<Resource<InvoicePayment> & { invoice: Invoice }>(`${INVOICES}/${invoiceId}/payments`, payload)
      return data
    },
    onSuccess: (data) => refresh.invoice(data.invoice),
    onError: () => refresh.byId(invoiceId),
  })
}

/** Delete a payment; the invoice's paid amount, balance and status roll back. A failure (e.g. it was
 *  already deleted elsewhere) refetches the invoice too. */
export function useDeletePayment(invoiceId: number) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (paymentId: number) => {
      await api.delete(`/api/v1/invoice-payments/${paymentId}`)
    },
    onSuccess: () => refresh.byId(invoiceId),
    onError: () => refresh.byId(invoiceId),
  })
}

export function useUpdateInvoiceSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<keyof InvoiceSettings, string | null>) => {
      const { data } = await api.put<Resource<InvoiceSettings>>('/api/v1/settings/invoice-details', payload)
      return data.data
    },
    onSuccess: (settings) => queryClient.setQueryData(invoiceKeys.settings, settings),
  })
}

/** Payments of one invoice (also embedded in useInvoice) — for a page that lists them alone. */
export function useInvoicePayments(invoiceId: number | null) {
  return useQuery({
    queryKey: invoiceKeys.payments(invoiceId ?? 0),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<InvoicePayment[]>>(`${INVOICES}/${invoiceId ?? 0}/payments`, { signal })
      return data.data
    },
    enabled: isId(invoiceId),
  })
}
