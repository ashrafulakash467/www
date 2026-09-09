<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table): void {
            $table->decimal('doctor_percentage', 5, 2)->nullable()->after('consultation_fee');
            $table->timestamp('percentage_effective_from')->nullable()->after('doctor_percentage');
        });
    }

    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table): void {
            $table->dropColumn(['doctor_percentage', 'percentage_effective_from']);
        });
    }
};
