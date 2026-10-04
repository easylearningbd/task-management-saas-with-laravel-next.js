<?php

namespace Database\Seeders;

use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds the Super Admin and the demo Company account.
 *
 * Idempotent and additive: matches on email, never truncates or deletes. The password
 * is set only when the account is first created, and the row is saved only if something
 * actually differs — so a second run writes nothing.
 *
 * Run: php artisan db:seed --class=AdminUserSeeder
 */
class AdminUserSeeder extends Seeder
{
    /** @var list<array{email: string, name: string, type: UserType}> */
    private const ACCOUNTS = [
        ['email' => 'superadmin@example.com', 'name' => 'Super Admin', 'type' => UserType::SuperAdmin],
        ['email' => 'company@example.com', 'name' => 'Company', 'type' => UserType::Company],
    ];

    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->error('AdminUserSeeder uses the default password "password" and will not run in production.');

            return;
        }

        foreach (self::ACCOUNTS as $account) {
            // withTrashed: a soft-deleted demo account is restored, not duplicated.
            $user = User::withTrashed()->firstOrNew(['email' => $account['email']]);

            $user->forceFill([
                'name' => $account['name'],
                'type' => $account['type'],
                'status' => UserStatus::Active,
                'is_login_enabled' => true,
                'deleted_at' => null,
            ]);

            if (! $user->exists) {
                $user->forceFill([
                    'password' => 'password',
                    'email_verified_at' => now(),
                ]);
            }

            $action = match (true) {
                ! $user->exists => 'created',
                $user->isDirty() => 'updated',
                default => 'unchanged',
            };

            if ($action !== 'unchanged') {
                $user->save();
            }

            $this->command?->line(sprintf('  %-24s %-12s %s', $account['email'], $account['type']->value, $action));
        }
    }
}
