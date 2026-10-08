<?php

use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\EnsureGuest;
use App\Http\Middleware\EnsureRole;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum SPA cookie auth for requests from SANCTUM_STATEFUL_DOMAINS.
        $middleware->statefulApi();

        $middleware->alias([
            'verified' => EnsureEmailIsVerified::class,
            'role' => EnsureRole::class,
            // JSON 409 instead of Laravel's redirect for already-authenticated requests.
            'guest' => EnsureGuest::class,
        ]);

        // Role check before route-model binding: the wrong role gets 403 on every route, before
        // a tenant-scoped {model} is looked up (for a super admin it would resolve to nothing
        // and answer 404). Authentication still runs first — it is earlier in the list.
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: EnsureRole::class);

        // The SPA owns the login pages; API requests get a JSON 401 instead of a redirect.
        $middleware->redirectGuestsTo(
            fn (Request $request) => $request->is('api/*') ? null : config('app.frontend_url').'/login',
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
