<?php

namespace App\Http\Requests\Company;

use App\Enums\InvoiceItemType;
use App\Models\Invoice;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /api/v1/invoices — the Create Invoice form (PAGE SPEC B). Shapes and bounds only; the
 * service checks everything that needs the company's data (the client and project are its own, the
 * project belongs to the client, each item / task belongs to the project, the taxes are its active
 * ones, the discount ≤ subtotal) and computes every amount — any `subtotal` / `total` / `*_amount`
 * sent here is not even read (only the validated keys reach the service). The frontend schema
 * mirrors these rules.
 */
class StoreInvoiceRequest extends FormRequest
{
    public const MAX_ITEMS = 100;

    public const NOTES_MAX = 5000;

    public const DESCRIPTION_MAX = 2000;

    /** 999,999,999,999.99 — DECIMAL(15,2). */
    public const MONEY_MAX = '999999999999.99';

    /** 99,999,999.99 — DECIMAL(10,2). */
    public const QUANTITY_MAX = '99999999.99';

    public function authorize(): bool
    {
        return $this->user()->can('create', Invoice::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'client_id' => ['required', 'integer', 'min:1'],
            'project_id' => ['required', 'integer', 'min:1'],
            'invoice_date' => ['required', 'date_format:Y-m-d'],
            'due_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:invoice_date'],
            'discount_amount' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:'.self::MONEY_MAX],
            'notes' => ['nullable', 'string', 'max:'.self::NOTES_MAX],
            'tax_ids' => ['nullable', 'array', 'max:20'],
            'tax_ids.*' => ['integer', 'min:1', 'distinct'],
            'items' => ['required', 'array', 'min:1', 'max:'.self::MAX_ITEMS],
            'items.*.type' => ['required', Rule::enum(InvoiceItemType::class)],
            'items.*.project_item_id' => ['nullable', 'required_if:items.*.type,item', 'integer', 'min:1'],
            'items.*.task_id' => ['nullable', 'required_if:items.*.type,task', 'integer', 'min:1'],
            'items.*.description' => ['nullable', 'string', 'max:'.self::DESCRIPTION_MAX],
            'items.*.quantity' => ['required', 'numeric', 'decimal:0,2', 'gt:0', 'max:'.self::QUANTITY_MAX],
            'items.*.price' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:'.self::MONEY_MAX],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => __('Add at least one line item.'),
            'items.min' => __('Add at least one line item.'),
            'due_date.after_or_equal' => __('The due date can\'t be before the invoice date.'),
            'items.*.project_item_id.required_if' => __('Choose an item.'),
            'items.*.task_id.required_if' => __('Choose a task.'),
            'items.*.quantity.gt' => __('The quantity must be greater than 0.'),
            'items.*.price.min' => __('The price can\'t be negative.'),
            'discount_amount.min' => __('The discount can\'t be negative.'),
        ];
    }

    /**
     * What the service reads — the validated input only.
     *
     * @return array<string, mixed>
     */
    public function invoiceData(): array
    {
        return $this->safe()->only(['client_id', 'project_id', 'invoice_date', 'due_date', 'discount_amount', 'notes', 'tax_ids', 'items']);
    }
}
