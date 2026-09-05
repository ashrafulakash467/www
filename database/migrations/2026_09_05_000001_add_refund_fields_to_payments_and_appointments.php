<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->decimal('refund_amount', 12, 2)->default(0)->after('due_amount');
            $table->string('refund_status')->default('not_requested')->index()->after('refund_amount');
            $table->string('refund_ref_id')->nullable()->unique()->after('refund_status');
            $table->string('refund_transaction_id')->nullable()->after('refund_ref_id');
            $table->text('refund_reason')->nullable()->after('refund_transaction_id');
            $table->timestamp('refund_requested_at')->nullable()->after('refund_reason');
            $table->timestamp('refund_processed_at')->nullable()->after('refund_requested_at');
            $table->json('refund_response')->nullable()->after('refund_processed_at');
        });

        Schema::table('appointments', function (Blueprint $table): void {
            $table->string('cancelled_by')->nullable()->after('cancel_reason');
            $table->timestamp('cancelled_at')->nullable()->after('cancelled_by');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', fn (Blueprint $table) => $table->dropColumn(['cancelled_by', 'cancelled_at']));
        Schema::table('payments', fn (Blueprint $table) => $table->dropColumn(['refund_amount', 'refund_status', 'refund_ref_id', 'refund_transaction_id', 'refund_reason', 'refund_requested_at', 'refund_processed_at', 'refund_response']));
    }
};
