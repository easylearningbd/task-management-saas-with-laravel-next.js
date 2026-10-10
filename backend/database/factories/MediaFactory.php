<?php

namespace Database\Factories;

use App\Models\Media;
use App\Services\MediaService;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * A media row without a real file — for tests that only need the record (tests that exercise
 * storage upload through MediaService with Storage::fake()). Create in the company's context:
 *
 *     Tenancy::instance()->runAs($company, fn () => Media::factory()->create());
 *
 * @extends Factory<Media>
 */
class MediaFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'disk' => MediaService::DISK,
            'path' => 'media/factory/'.Str::uuid()->toString().'.png',
            'original_name' => fake()->word().'.png',
            'mime_type' => 'image/png',
            'extension' => 'png',
            'size_bytes' => fake()->numberBetween(1000, 500000),
            'uploaded_by' => null,
        ];
    }

    public function pdf(): static
    {
        return $this->state(fn () => [
            'path' => 'media/factory/'.Str::uuid()->toString().'.pdf',
            'original_name' => fake()->word().'.pdf',
            'mime_type' => 'application/pdf',
            'extension' => 'pdf',
        ]);
    }
}
