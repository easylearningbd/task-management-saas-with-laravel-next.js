<?php

namespace App\Console\Commands;

use App\Services\PlanExpiryService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Billing rule 10: moves companies whose plan or trial has run out back to the default plan.
 * Scheduled daily in routes/console.php; idempotent, so running it again (or by hand) is safe.
 *
 *     php artisan plans:expire            # do it
 *     php artisan plans:expire --dry-run  # only list who would move
 */
#[Signature('plans:expire {--dry-run : List the companies that would move, change nothing}')]
#[Description('Move companies whose plan or trial has expired back to the default plan')]
class ExpirePlans extends Command
{
    public function handle(PlanExpiryService $expiry): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $result = $expiry->expireDue(dryRun: $dryRun);

        if ($result['default'] === null) {
            $this->warn('No active default plan — nothing moved.');

            return self::SUCCESS;
        }

        foreach ($result['moved'] as $company) {
            $this->line(sprintf('%s #%d %s (%s, was %s)', $dryRun ? 'would move' : 'moved', $company['id'], $company['email'], $company['reason'], $company['from'] ?? '—'));
        }
        $this->info(sprintf('%s %d compan%s to %s.', $dryRun ? 'Would move' : 'Moved', count($result['moved']), count($result['moved']) === 1 ? 'y' : 'ies', $result['default']));

        return self::SUCCESS;
    }
}
