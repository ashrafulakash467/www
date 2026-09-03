<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Api\V1\AuthController as ApiAuthController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Doctor\DoctorDashboardController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\Patient\PatientDashboardController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\StaticPageController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/about', [StaticPageController::class, 'about'])->name('about');
Route::get('/contact', [StaticPageController::class, 'contact'])->name('contact');
Route::get('/departments', [StaticPageController::class, 'departments'])->name('departments.index');
Route::get('/services', [StaticPageController::class, 'services'])->name('services.index');

Route::controller(DoctorController::class)->group(function (): void {
    Route::get('/doctors', 'index')->name('doctors.index');
    Route::get('/find-doctor', 'index')->name('doctors.search');
    Route::get('/doctors/{doctor}', 'show')->name('doctors.show');
});

Route::middleware('guest')->group(function (): void {
    Route::get('/login', fn () => Inertia::render('Auth/Login'))->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('login.store');
    Route::get('/admin/login', fn () => Inertia::render('Auth/Login', ['initialRole' => 'admin']))->name('admin.login');
    Route::get('/doctor/login', fn () => Inertia::render('Auth/Login', ['initialRole' => 'doctor']))->name('doctor.login');

    Route::get('/register', fn () => Inertia::render('Auth/Register'))->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store'])->name('register.store');
    Route::post('/doctor/register', [RegisteredUserController::class, 'store'])->name('doctor.register.store');

    Route::get('/forgot-password', fn () => Inertia::render('Auth/ForgotPassword'))->name('password.request');
    Route::post('/forgot-password', [ApiAuthController::class, 'forgotPassword'])->name('password.email');
    Route::get('/reset-password', fn () => Inertia::render('Auth/ResetPassword'))->name('password.reset');
    Route::post('/reset-password', [ApiAuthController::class, 'resetPassword'])->name('password.update');
});

Route::get('/payment/return', [PaymentController::class, 'result'])->name('payments.return');

Route::middleware('auth')->group(function (): void {
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    Route::middleware('role:patient')->prefix('patient')->name('patient.')->group(function (): void {
        Route::get('/dashboard', [PatientDashboardController::class, 'index'])->name('dashboard');
        Route::get('/appointments', [PatientDashboardController::class, 'appointments'])->name('appointments');
        Route::get('/medical-records', [PatientDashboardController::class, 'medicalRecords'])->name('medical-records');
        Route::get('/settings', [PatientDashboardController::class, 'settings'])->name('settings');
        Route::redirect('/profile', '/patient/settings')->name('profile');
        Route::redirect('/dashboard/settings', '/patient/settings')->name('dashboard.settings');
    });

    Route::middleware('role:patient')->group(function (): void {
        Route::get('/appointment/book', [AppointmentController::class, 'create'])->name('appointments.create');
        Route::get('/appointment/reschedule', [AppointmentController::class, 'edit'])->name('appointments.reschedule');
        Route::get('/payment', [PaymentController::class, 'index'])->name('payments.index');
        Route::get('/payment/hosted-checkout', [PaymentController::class, 'hosted'])->name('payments.hosted');
        Route::get('/payment/easy-checkout', [PaymentController::class, 'easy'])->name('payments.easy');
    });

    Route::middleware('role:doctor')->prefix('doctor')->name('doctor.')->group(function (): void {
        Route::get('/dashboard', [DoctorDashboardController::class, 'index'])->name('dashboard');
    });

    Route::middleware('role:admin|super-admin')->prefix('admin')->name('admin.')->group(function (): void {
        Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');
    });
});
