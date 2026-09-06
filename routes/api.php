<?php

use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\AdminPaymentController;
use App\Http\Controllers\Api\V1\AppointmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\DoctorController;
use App\Http\Controllers\Api\V1\MedicalRecordController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\SslCommerzPaymentController;
use Illuminate\Support\Facades\Route;

Route::get('health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'laravel-api',
    ]);
});

Route::post('login', [AuthController::class, 'login'])->name('api.v1.login');
Route::post('patient/login', [AuthController::class, 'login'])->defaults('role', 'patient');
Route::post('patient/register', [AuthController::class, 'register'])->defaults('role', 'patient');
Route::post('doctor/login', [AuthController::class, 'login'])->defaults('role', 'doctor');
Route::post('doctor/register', [AuthController::class, 'register'])->defaults('role', 'doctor');
Route::post('admin/login', [AuthController::class, 'login'])->defaults('role', 'admin');
Route::post('patient/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('patient/reset-password', [AuthController::class, 'resetPassword']);
Route::get('doctor/search', [DoctorController::class, 'search']);
Route::get('doctor/public/{doctorId}', [DoctorController::class, 'show']);
Route::get('doctor-images/{filename}', [DoctorController::class, 'image']);
Route::get('doctors', [DoctorController::class, 'search']);
Route::get('doctors/{doctorId}', [DoctorController::class, 'show']);
Route::get('departments', [DepartmentController::class, 'index']);

// Settings (public)
Route::get('settings', [SettingsController::class, 'publicIndex']);
Route::get('settings/page/{slug}', [SettingsController::class, 'page']);
Route::get('settings/asset/{filename}', [SettingsController::class, 'asset']);

// SSLCommerz calls these endpoints without a user's Sanctum token.
Route::prefix('payments/sslcommerz')->group(function (): void {
    Route::post('success', [SslCommerzPaymentController::class, 'success']);
    Route::post('fail', [SslCommerzPaymentController::class, 'fail']);
    Route::post('cancel', [SslCommerzPaymentController::class, 'cancel']);
    Route::post('ipn', [SslCommerzPaymentController::class, 'ipn']);
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);
    Route::get('profile', [ProfileController::class, 'show']);

    Route::get('dashboard', [DashboardController::class, 'index']);
    Route::get('patient/me', [AuthController::class, 'me'])->middleware('role:patient|admin|super-admin');
    Route::get('doctor/me', [AuthController::class, 'me'])->middleware('role:doctor|admin|super-admin');
    Route::match(['put', 'patch'], 'doctor/me', [AuthController::class, 'updateDoctorMe'])->middleware('role:doctor');
    Route::get('admin/me', [AuthController::class, 'me'])->middleware('role:admin|super-admin');
    Route::get('appointment/my', [AppointmentController::class, 'my']);
    Route::get('appointments', [AppointmentController::class, 'my']);
    Route::get('payments', [PaymentController::class, 'index']);
    Route::get('payments/{payment}', [PaymentController::class, 'show'])->whereNumber('payment');
    Route::get('medical-records', [MedicalRecordController::class, 'index'])->middleware('role:patient|doctor|admin|super-admin');

    Route::middleware('role:admin|super-admin')->group(function (): void {
        Route::get('admin/dashboard', [DashboardController::class, 'admin']);
        Route::get('admin/data', [AdminController::class, 'data']);
        Route::get('admin/doctor-verifications', [AdminController::class, 'index']);
        Route::get('admin/users', [AdminController::class, 'users']);
        Route::delete('admin/users/{userId}', [AdminController::class, 'destroy']);
        Route::patch('admin/doctor-verifications/{doctorId}/decision', [AdminController::class, 'decision']);
        Route::get('admin/doctors', [DoctorController::class, 'adminIndex']);
        Route::get('admin/appointments', [AppointmentController::class, 'adminIndex']);
        Route::get('admin/payments/overview', [AdminPaymentController::class, 'overview']);
        Route::get('admin/payments/revenue', [AdminPaymentController::class, 'revenue']);
        Route::get('admin/payments/settings', [AdminPaymentController::class, 'settings']);
        Route::put('admin/payments/settings', [AdminPaymentController::class, 'updateSettings']);
        Route::get('admin/payments', [AdminPaymentController::class, 'index']);
        Route::get('admin/payments/{payment}', [AdminPaymentController::class, 'show'])->whereNumber('payment');
        Route::get('admin/refunds', [AdminPaymentController::class, 'refunds']);
        Route::patch('admin/refunds/{payment}/approve', [AdminPaymentController::class, 'approveRefund'])->whereNumber('payment');
        Route::patch('admin/refunds/{payment}/reject', [AdminPaymentController::class, 'rejectRefund'])->whereNumber('payment');
        Route::post('admin/refunds/{payment}/process', [AdminPaymentController::class, 'processRefund'])->whereNumber('payment');
        Route::post('admin/doctors', [DoctorController::class, 'adminStore']);
        Route::put('admin/doctors/{doctorId}', [DoctorController::class, 'adminUpdate']);
        Route::delete('admin/doctors/{doctorId}', [DoctorController::class, 'adminDestroy']);

        // Settings (admin)
        Route::get('admin/settings', [SettingsController::class, 'index']);
        Route::post('admin/settings', [SettingsController::class, 'store']);
        Route::put('admin/settings/{settingId}', [SettingsController::class, 'update']);
        Route::put('admin/settings/{settingId}/toggle', [SettingsController::class, 'toggle']);
        Route::delete('admin/settings/{settingId}', [SettingsController::class, 'destroy']);
    });

    Route::middleware('role:doctor|admin|super-admin')->group(function (): void {
        Route::get('doctor/dashboard', [DashboardController::class, 'doctor']);
        Route::post('consultations/{appointmentId}/notes', [MedicalRecordController::class, 'storeNote']);
        Route::post('consultations/{appointmentId}/prescriptions', [MedicalRecordController::class, 'storePrescription']);
        Route::post('consultations/{appointmentId}/documents', [MedicalRecordController::class, 'storeDocument']);
        Route::post('appointment/decision', [AppointmentController::class, 'decision']);
    });

    Route::middleware('role:patient|admin|super-admin')->group(function (): void {
        Route::get('patient/dashboard', [DashboardController::class, 'patient']);
        Route::match(['put', 'patch'], 'patient/me', [AuthController::class, 'updateMe'])->middleware('role:patient');
        Route::get('appointment/booking-options', [AppointmentController::class, 'bookingOptions']);
        Route::get('appointment/available-dates', [AppointmentController::class, 'availableDates']);
        Route::get('appointment/available-slots', [AppointmentController::class, 'availableSlots']);
        Route::post('appointment/book', [AppointmentController::class, 'book']);
        Route::post('appointments', [AppointmentController::class, 'book']);
        Route::post('appointment/cancel', [AppointmentController::class, 'cancel']);

        Route::post('appointment/{appointmentId}/payment', [AppointmentController::class, 'payment']);

        Route::delete(
            '/appointments/{appointment}',
            [AppointmentController::class, 'destroy']
        );

        Route::get('appointment/reschedule-options', [AppointmentController::class, 'rescheduleOptions']);
        Route::get('appointment/reschedule-slots', [AppointmentController::class, 'rescheduleSlots']);
        Route::post('appointment/reschedule', [AppointmentController::class, 'reschedule']);

        // SSLCommerz initiation and payment data require authentication.
        Route::get('appointments/{appointmentId}/payment-details', [SslCommerzPaymentController::class, 'paymentDetails']);
        Route::get('appointments/{appointmentId}/refund-status', [SslCommerzPaymentController::class, 'refundStatus']);
        Route::get('appointments/{appointmentId}/example-hosted-checkout', [SslCommerzPaymentController::class, 'exampleHostedCheckout']);
        Route::post('payments/sslcommerz/initiate', [SslCommerzPaymentController::class, 'initiate']);

        // Temporary compatibility aliases for existing frontend clients.
        Route::post('pay', [SslCommerzPaymentController::class, 'index']);
        Route::post('pay-via-ajax', [SslCommerzPaymentController::class, 'payViaAjax']);
    });

});
