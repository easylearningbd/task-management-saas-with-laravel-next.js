<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A tax applied to an invoice, frozen at save time: `name` and `rate` are copies, `amount` =
 * (subtotal − discount) × rate / 100. Changing or deleting the Tax later leaves this row as it is.
 * No company_id — always reached through its (tenant-scoped) invoice.
 *
 * @property int $id
 * @property int $invoice_id
 * @property int|null $tax_id
 * @property string $name
 * @property string $rate
 * @property string $amount
 */
class InvoiceTax extends Model
{
    protected $fillable = [];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:2',
            'amount' => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
