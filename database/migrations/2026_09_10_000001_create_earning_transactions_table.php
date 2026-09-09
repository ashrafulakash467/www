<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('earning_transactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('payment_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('appointment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->decimal('gross_amount', 12, 2);
            $table->decimal('doctor_percentage', 5, 2);
            $table->decimal('doctor_amount', 12, 2);
            $table->decimal('admin_percentage', 5, 2);
            $table->decimal('admin_amount', 12, 2);
            $table->decimal('refund_amount', 12, 2)->default(0);
            $table->decimal('reversal_amount', 12, 2)->default(0);
            $table->string('status')->default('pending')->index();
            $table->timestamp('earned_at')->nullable()->index();
            $table->timestamp('released_at')->nullable()->index();
            $table->timestamps();

            $table->index(['doctor_id', 'status']);
            $table->index(['doctor_id', 'earned_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('earning_transactions');
    }
};
