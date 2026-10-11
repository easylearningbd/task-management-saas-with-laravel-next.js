<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * Scheduled tasks — run by `php artisan schedule:work` (development) or a cron entry calling
 * `php artisan schedule:run` every minute (production).
 */

// Billing rule 10: expired plans and trials back to the default plan. Idempotent.
Schedule::command('plans:expire')->dailyAt('00:15')->withoutOverlapping();
