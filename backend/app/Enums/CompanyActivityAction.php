<?php

namespace App\Enums;

/** What happened to a company — one `company_activities` row per admin action. */
enum CompanyActivityAction: string
{
    case Created = 'created';
    case Updated = 'updated';
    case PlanChanged = 'plan_changed';
    case LoginEnabled = 'login_enabled';
    case LoginDisabled = 'login_disabled';
    case PasswordReset = 'password_reset';
    case Impersonated = 'impersonated';
    case ImpersonationEnded = 'impersonation_ended';
    case Deleted = 'deleted';

    /** Display name, so the UI never maps the raw value itself. */
    public function label(): string
    {
        return match ($this) {
            self::Created => __('Company created'),
            self::Updated => __('Company updated'),
            self::PlanChanged => __('Plan changed'),
            self::LoginEnabled => __('Login enabled'),
            self::LoginDisabled => __('Login disabled'),
            self::PasswordReset => __('Password reset'),
            self::Impersonated => __('Logged in as company'),
            self::ImpersonationEnded => __('Returned to admin'),
            self::Deleted => __('Company deleted'),
        };
    }
}
