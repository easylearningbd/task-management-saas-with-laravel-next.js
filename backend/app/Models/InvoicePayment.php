<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use App\Enums\PaymentType;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A payment received against an invoice. Written only by PaymentService, which never lets the
 * payments exceed the invoice total and recalculates the invoice after every change.
 *
 * @property int $id
 * @property int $company_id
 * @property int $invoice_id
 * @property Carbon $payment_date
 * @property string $amount
 * @property PaymentType $payment_type
 * @property string $reference
 * @property PaymentStatus $status
 * @property string|null $receipt_path
 * @property string|null $description
 */
class InvoicePayment extends Model
{
    use BelongsToCompany;

    protected $fillable = [];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
            'amount' => 'decimal:2',
            'payment_type' => PaymentType::class,
            'status' => PaymentStatus::class,
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
