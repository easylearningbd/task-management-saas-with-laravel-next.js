<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

/**
 * The global bank-transfer details the checkout shows (Billing Phase 1) — clearly marked
 * placeholders until the super admin enters the real ones in Admin Settings. Idempotent and
 * additive: a key is created only when it is missing, so an admin's edit is never overwritten;
 * nothing is deleted.
 * Run: php artisan db:seed --class=SettingSeeder
 */
class SettingSeeder extends Seeder
{
    /** @var array<string, string> */
    public const BANK_PLACEHOLDERS = [
        'bank_name' => 'Example Bank (placeholder)',
        'bank_account_name' => 'TASK SaaS Ltd (placeholder)',
        'bank_account_number' => '0000 0000 0000 0000',
        'bank_branch' => 'Main Branch (placeholder)',
        'bank_swift' => 'XXXXXXXX',
        'bank_instructions' => 'Placeholder — set the real bank details in Admin Settings. Use your order code as the transfer reference, then upload the receipt.',
    ];

    public function run(): void
    {
        $created = 0;
        foreach (self::BANK_PLACEHOLDERS as $key => $value) {
            if (Setting::query()->global()->where('key', $key)->exists()) {
                continue;
            }
            Setting::putGlobal($key, $value);
            $created++;
        }

        $this->command?->info("Settings: {$created} created, ".(count(self::BANK_PLACEHOLDERS) - $created).' already present.');
    }
}
