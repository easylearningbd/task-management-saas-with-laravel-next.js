<?php

namespace Tests\Fixtures\Tenancy;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

/**
 * A throwaway tenant-owned model for the BelongsToCompany tests (table created by the test).
 * `company_id` is deliberately NOT fillable — exactly how real tenant models must be.
 */
class Widget extends Model
{
    use BelongsToCompany;

    protected $table = 'tenancy_widgets';

    protected $fillable = ['name'];
}
