<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

/**
 * RefreshDatabase is used HERE (not via Pest's ->use()) on purpose: a class's own
 * method beats a trait method of the same class, so the guard below cannot be
 * silently replaced by the trait's empty beforeRefreshingDatabase().
 */
abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Requests look like they come from the SPA, so Sanctum treats them as stateful
        // (session + cookie auth), exactly as in the browser.
        $this->withHeader('Referer', config('app.frontend_url'));
    }

    /**
     * Hard stop before RefreshDatabase migrates anything: tests may only ever run against
     * the isolated SQLite in-memory database, never the dev MySQL database (CLAUDE.md §10).
     * Also catches a stale `config:cache`, which would ignore phpunit.xml.
     *
     * @return void
     */
    protected function beforeRefreshingDatabase()
    {
        $connection = config('database.default');
        $driver = config("database.connections.{$connection}.driver");
        $database = config("database.connections.{$connection}.database");

        if ($driver !== 'sqlite' || $database !== ':memory:') {
            throw new RuntimeException(sprintf(
                'Refusing to refresh the database: tests must use sqlite :memory:, got [%s] driver [%s] database [%s]. Run `php artisan config:clear`.',
                $connection, $driver, $database,
            ));
        }
    }
}
