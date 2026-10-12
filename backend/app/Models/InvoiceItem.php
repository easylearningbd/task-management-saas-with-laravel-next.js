<?php

namespace App\Models;

use App\Enums\InvoiceItemType;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One invoice line. `project_item_id` / `task_id` record where it came from (type item / task);
 * description, quantity and price are the line's own. `total` = quantity × price, computed by
 * InvoiceService.
 *
 * @property int $id
 * @property int $company_id
 * @property int $invoice_id
 * @property InvoiceItemType $type
 * @property int|null $project_item_id
 * @property int|null $task_id
 * @property string $description
 * @property string $quantity
 * @property string $price
 * @property string $total
 * @property int $position
 */
class InvoiceItem extends Model
{
    use BelongsToCompany;

    protected $fillable = [];

    protected function casts(): array
    {
        return [
            'type' => InvoiceItemType::class,
            'quantity' => 'decimal:2',
            'price' => 'decimal:2',
            'total' => 'decimal:2',
            'position' => 'integer',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function projectItem(): BelongsTo
    {
        return $this->belongsTo(ProjectItem::class)->withTrashed();
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class)->withTrashed();
    }
}
