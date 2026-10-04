<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Replaces Laravel's `guest` middleware, which always redirects. This backend only
 * serves JSON to the SPA, so an already-authenticated request gets a 409 instead.
 */
class EnsureGuest
{
    public function handle(Request $request, Closure $next, string ...$guards): Response
    {
        foreach (empty($guards) ? [null] : $guards as $guard) {
            if (Auth::guard($guard)->check()) {
                return response()->json([
                    'message' => 'You are already logged in.',
                ], Response::HTTP_CONFLICT);
            }
        }

        return $next($request);
    }
}
