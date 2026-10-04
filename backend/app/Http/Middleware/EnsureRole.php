<?php

namespace App\Http\Middleware;

use App\Enums\UserType;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage: ->middleware('role:super_admin') or ->middleware('role:company').
 * Always answers with JSON 403 for the wrong role — never a redirect.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $allowed = array_map(fn (string $role) => UserType::from($role), $roles);

        if (! in_array($request->user()?->type, $allowed, true)) {
            return response()->json([
                'message' => 'You do not have permission to access this resource.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
