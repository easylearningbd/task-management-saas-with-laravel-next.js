<?php

namespace App\Services;

use App\Enums\CompanyActivityAction;
use App\Models\Company;
use App\Models\User;
use Illuminate\Auth\SessionGuard;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * "Login as company" (CLAUDE.md §6: impersonation must be logged and show a "Back to Admin"
 * banner). Approved design, Companies Phase 3:
 *
 * - The admin's identity lives only in the server-side session (`impersonator`), never in the
 *   request — it cannot be spoofed.
 * - Switching goes through the `web` SessionGuard, so Sanctum's AuthenticateSession re-stores
 *   the new user's password hash after the request and the session stays valid.
 * - The session id is regenerated on start and on stop (no session fixation); session data —
 *   the marker included — survives `regenerate()`.
 * - No nesting: while impersonating the session user is a company, so `role:super_admin`
 *   blocks every admin route, `impersonate` included.
 * - Companies with login disabled or status inactive CAN be impersonated (an audited admin
 *   action, not the company signing in); `AuthService::login` still refuses the company itself.
 * - Both events are written to the company's activity log with the admin as actor.
 */
class ImpersonationService
{
    /** Session key holding `{ id, name, email }` of the super admin behind the session. */
    public const SESSION_KEY = 'impersonator';

    public function __construct(private readonly CompanyService $companies) {}

    /** Become the company. Returns the company (the new session user). */
    public function start(Request $request, User $admin, Company $company): Company
    {
        if (! $admin->isSuperAdmin() || ! $company->isCompany()) {
            throw $this->forbidden(__('Only a super admin can log in as a company.'));
        }
        if (self::impersonator($request) !== null) {
            throw $this->forbidden(__('You are already viewing as a company. Go back to admin first.'));
        }

        DB::transaction(fn () => $this->companies->record(
            $company,
            CompanyActivityAction::Impersonated,
            $admin,
            __('Logged in as company'),
        ));

        $this->guard()->login($company); // never "remember me"
        $request->session()->regenerate();
        $request->session()->put(self::SESSION_KEY, [
            'id' => $admin->getKey(),
            'name' => $admin->name,
            'email' => $admin->email,
        ]);

        return $company;
    }

    /** Back to the super admin recorded in the session. Returns the admin. */
    public function stop(Request $request): User
    {
        $marker = self::impersonator($request);
        if ($marker === null) {
            throw $this->forbidden(__('You are not viewing as a company.'));
        }

        $admin = User::query()->find($marker['id']); // soft-deleted admins are excluded
        if (! $admin || ! $admin->isSuperAdmin()) {
            // The admin behind this session is gone: end the session completely.
            $this->guard()->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw $this->forbidden(__('The admin account behind this session no longer exists.'));
        }

        $company = Company::withTrashed()->find($request->user()?->getKey());
        if ($company) {
            DB::transaction(fn () => $this->companies->record(
                $company,
                CompanyActivityAction::ImpersonationEnded,
                $admin,
                __('Returned to admin'),
            ));
        }

        $this->guard()->login($admin);
        $request->session()->forget(self::SESSION_KEY);
        $request->session()->regenerate();

        return $admin;
    }

    /**
     * The admin behind the current session, or null when not impersonating. Only counts when
     * it differs from the signed-in user (a stale marker on the admin's own session is ignored).
     *
     * @return array{id: int, name: string, email: string}|null
     */
    public static function impersonator(Request $request): ?array
    {
        if (! $request->hasSession()) {
            return null;
        }

        $marker = $request->session()->get(self::SESSION_KEY);
        if (! is_array($marker) || ! isset($marker['id'])) {
            return null;
        }

        $userId = Auth::guard('web')->id();

        return $userId !== null && (int) $marker['id'] !== (int) $userId ? $marker : null;
    }

    private function guard(): SessionGuard
    {
        /** @var SessionGuard */
        return Auth::guard('web');
    }

    /** A plain `{ message }` 403, like AuthService's. */
    private function forbidden(string $message): HttpResponseException
    {
        return new HttpResponseException(response()->json(['message' => $message], Response::HTTP_FORBIDDEN));
    }
}
