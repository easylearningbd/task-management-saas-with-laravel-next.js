<?php

namespace App\Services;

use App\Enums\UserType;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\Company;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\SessionGuard;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class AuthService
{
    public function __construct(private readonly CompanySetupService $setup) {}

    /**
     * Log in through the endpoint of the given role. Credentials are checked
     * without logging in, so a wrong-role or disabled account never gets a session.
     *
     * @throws ValidationException wrong email or password (422)
     * @throws HttpResponseException wrong role or disabled account (403), too many attempts (429)
     */
    public function login(LoginRequest $request, UserType $role): User
    {
        $request->ensureIsNotRateLimited();

        $guard = $this->guard();

        if (! $guard->validate($request->only('email', 'password'))) {
            $request->hitRateLimiter();

            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        /** @var User $user */
        $user = $guard->getLastAttempted();

        if ($user->type !== $role) {
            $request->hitRateLimiter();

            throw $this->forbidden(__('auth.failed'));
        }

        if (! $user->is_login_enabled) {
            $request->hitRateLimiter();

            throw $this->forbidden(__('Your account is disabled. Contact the administrator.'));
        }

        $request->clearRateLimiter();

        $guard->login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return $user;
    }

    /**
     * Public sign-up. Always creates a company account — the role is never read from input.
     *
     * @param  array{name: string, email: string, password: string}  $data
     */
    public function registerCompany(array $data, Request $request): User
    {
        // The account and its starting setup (default plan, default expense categories) are
        // created together, exactly as when a super admin adds a company.
        $user = DB::transaction(function () use ($data): User {
            $user = new User([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
            ]);
            $user->type = UserType::Company;
            $user->save();

            $this->setup->setUp(Company::query()->findOrFail($user->getKey()));

            return $user->refresh();
        });

        event(new Registered($user));

        $this->guard()->login($user);
        $request->session()->regenerate();

        return $user;
    }

    public function logout(Request $request): void
    {
        $this->guard()->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    /** A plain `{ message }` 403 — no exception trace, even with APP_DEBUG on. */
    private function forbidden(string $message): HttpResponseException
    {
        return new HttpResponseException(
            response()->json(['message' => $message], Response::HTTP_FORBIDDEN),
        );
    }

    private function guard(): SessionGuard
    {
        /** @var SessionGuard */
        return Auth::guard('web');
    }
}
