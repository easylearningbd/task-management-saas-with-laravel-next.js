<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\PlanDuration;
use App\Enums\UserStatus;
use App\Enums\UserType;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * `type`, `status`, `is_login_enabled` and the subscription columns (`plan_id`,
 * `plan_duration`, `plan_expires_at`, `trial_ends_at`) are deliberately not fillable:
 * a role or a plan can never be set from request input, only explicitly in code.
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    /**
     * Mirror the column defaults so a freshly created model reports them.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'type' => 'company',
        'status' => 'active',
        'is_login_enabled' => true,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'type' => UserType::class,
            'status' => UserStatus::class,
            'is_login_enabled' => 'boolean',
            'plan_duration' => PlanDuration::class,
            'plan_expires_at' => 'datetime',
            'trial_ends_at' => 'datetime',
        ];
    }

    /** The company's current subscription plan (null until one is assigned). */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->type === UserType::SuperAdmin;
    }

    public function isCompany(): bool
    {
        return $this->type === UserType::Company;
    }
}
