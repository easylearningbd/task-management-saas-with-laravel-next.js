<?php

/*
 * Guards CLAUDE.md §10: the suite must never refresh the dev MySQL database.
 * The guard only reads config, so these tests swap a config value, call the guard,
 * and restore the value straight away — teardown only ever sees sqlite :memory:,
 * and no connection to MySQL is ever opened.
 */

function withConfig(array $overrides, Closure $callback): mixed
{
    $original = collect($overrides)->mapWithKeys(fn ($value, $key) => [$key => config($key)])->all();

    config($overrides);

    try {
        return $callback();
    } finally {
        config($original);
    }
}

test('the suite runs on the isolated sqlite in-memory database', function () {
    expect(config('database.default'))->toBe('sqlite')
        ->and(config('database.connections.sqlite.database'))->toBe(':memory:');

    $this->beforeRefreshingDatabase(); // passes on the real test config
});

test('refreshing the database is refused when the connection is not sqlite', function () {
    $refused = withConfig(['database.default' => 'mysql'], function () {
        try {
            $this->beforeRefreshingDatabase();
        } catch (RuntimeException $e) {
            return $e->getMessage();
        }

        return null;
    });

    expect($refused)->toStartWith('Refusing to refresh the database');
});

test('refreshing the database is refused for an on-disk sqlite file', function () {
    $refused = withConfig(['database.connections.sqlite.database' => database_path('database.sqlite')], function () {
        try {
            $this->beforeRefreshingDatabase();
        } catch (RuntimeException $e) {
            return $e->getMessage();
        }

        return null;
    });

    expect($refused)->toStartWith('Refusing to refresh the database');
});
