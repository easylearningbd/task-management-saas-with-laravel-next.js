<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/**
 * A plan limit stopped the action (PLAN LIMITS in the Projects spec). Renders as a 422 in the
 * API's usual error shape — `message` and `errors` — plus a machine-readable `code` and the
 * numbers, so the UI can show the message with an Upgrade button:
 *
 *   { "message": "...", "code": "plan_limit_reached", "limit": 3, "current": 3,
 *     "errors": { "project": ["..."] } }
 *
 * The `errors` key is not a form field, so forms show it as their form-level alert.
 */
class PlanLimitReached extends RuntimeException
{
    public const PROJECTS = 'plan_limit_reached';

    public const STORAGE = 'storage_limit_reached';

    /**
     * @param  array<string, int|string|null>  $figures  e.g. ['limit' => 3, 'current' => 3]
     */
    public function __construct(
        public readonly string $limitCode,
        string $message,
        public readonly string $errorKey,
        public readonly array $figures = [],
    ) {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'code' => $this->limitCode,
            ...$this->figures,
            'errors' => [$this->errorKey => [$this->getMessage()]],
        ], Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}
