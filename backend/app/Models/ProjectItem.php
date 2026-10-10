<?php

namespace App\Models;

use App\Enums\ProjectItemStatus;
use App\Enums\ProjectItemUnit;
use App\Models\Concerns\BelongsToCompany;
use Database\Factories\ProjectItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A product or service owned by one project (the Items tab). Created through the company's own
 * project, so `company_id` and `project_id` always agree; neither is fillable from input.
 *
 * @property int $id
 * @property int $company_id
 * @property int $project_id
 * @property string $name
 * @property string|null $description
 * @property string $default_price
 * @property ProjectItemUnit $unit
 * @property ProjectItemStatus $status
 */
class ProjectItem extends Model
{
    /** @use HasFactory<ProjectItemFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = ['name', 'description', 'default_price', 'unit', 'status'];

    protected $attributes = [
        'status' => 'active',
    ];

    protected function casts(): array
    {
        return [
            'default_price' => 'decimal:2',
            'unit' => ProjectItemUnit::class,
            'status' => ProjectItemStatus::class,
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
