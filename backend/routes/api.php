<?php

use App\Http\Controllers\Api\V1\Admin\CouponController;
use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\PlanController;
use App\Http\Controllers\Api\V1\Auth\AdminLoginController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Company\DashboardController as CompanyDashboardController;
use App\Http\Controllers\Api\V1\Profile\AvatarController;
use App\Http\Controllers\Api\V1\Profile\PasswordController;
use App\Http\Controllers\Api\V1\Profile\ProfileController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('v1.')->group(function () {
    // Guests — one login endpoint per role; sign-up only ever creates a company.
    Route::middleware('guest')->group(function () {
        Route::post('auth/register', RegisterController::class)->middleware('throttle:6,1')->name('auth.register');
        Route::post('auth/login', LoginController::class)->name('auth.login');
        Route::post('admin/auth/login', AdminLoginController::class)->name('admin.auth.login');
    });

    // Any authenticated user.
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', LogoutController::class)->name('auth.logout');
        Route::get('me', MeController::class)->name('me');

        // Own profile — both roles; every action targets the signed-in user only.
        Route::get('profile', [ProfileController::class, 'show'])->name('profile.show');
        Route::patch('profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::post('profile/avatar', AvatarController::class)->middleware('throttle:10,1')->name('profile.avatar');
        Route::put('profile/password', PasswordController::class)->middleware('throttle:6,1')->name('profile.password');
    });

    // Super Admin.
    Route::middleware(['auth:sanctum', 'role:super_admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('dashboard', AdminDashboardController::class)->name('dashboard');

        // Subscription plans (PRD §8.3).
        Route::apiResource('plans', PlanController::class);
        Route::patch('plans/{plan}/toggle-active', [PlanController::class, 'toggleActive'])->name('plans.toggle-active');

        // Coupons. generate-code is registered before the resource so it never binds as {coupon}.
        Route::get('coupons/generate-code', [CouponController::class, 'generateCode'])->middleware('throttle:60,1')->name('coupons.generate-code');
        Route::apiResource('coupons', CouponController::class);
        Route::patch('coupons/{coupon}/toggle-status', [CouponController::class, 'toggleStatus'])->name('coupons.toggle-status');
    });

    // Company (tenant).
    Route::middleware(['auth:sanctum', 'role:company'])->group(function () {
        Route::get('dashboard', CompanyDashboardController::class)->name('dashboard');
    });
});
