<?php

namespace App\Http\Resources;

use App\Models\Tax;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One of the company's active taxes — an option of the invoice form's Tax multi-select:
 * `label` "VAT (10%)".
 *
 * @mixin Tax
 */
class TaxResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'rate' => $this->rate,
            'label' => sprintf('%s (%s%%)', $this->name, Money::trimZeros((string) $this->rate)),
        ];
    }
}
