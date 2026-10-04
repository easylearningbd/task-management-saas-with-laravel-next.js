<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database. Every seeder called here must be
     * additive and idempotent (CLAUDE.md §10).
     */
    public function run(): void
    {
        $this->call(AdminUserSeeder::class);
    }
}
