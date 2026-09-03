<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->string('gateway')->nullable()->index()->after('provider');
            $table->string('gateway_transaction_id')->nullable()->index()->after('gateway');
            $table->json('gateway_response')->nullable()->after('meta');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->dropColumn(['gateway', 'gateway_transaction_id', 'gateway_response']);
        });
    }
};