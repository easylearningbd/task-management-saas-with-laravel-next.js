<?php

namespace Database\Factories;

use App\Enums\CompanyActivityAction;
use App\Models\Company;
use App\Models\CompanyActivity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyActivity>
 */
class CompanyActivityFactory extends Factory
{
    protected $model = CompanyActivity::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'actor_id' => null,
            'action' => CompanyActivityAction::Updated,
            'description' => 'Company updated',
            'meta' => null,
        ];
    }
}
