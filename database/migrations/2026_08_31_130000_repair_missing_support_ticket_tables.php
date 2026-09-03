<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('support_tickets')) {
            Schema::create('support_tickets', function (Blueprint $table): void {
                $table->id();
                $table->string('ticket_no')->unique();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('doctor_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('assigned_to_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('subject');
                $table->string('category')->nullable()->index();
                $table->string('priority')->default('medium')->index();
                $table->string('status')->default('open')->index();
                $table->timestamp('last_message_at')->nullable()->index();
                $table->timestamp('closed_at')->nullable()->index();
                $table->json('meta')->nullable();
                $table->timestamps();
                $table->index(['status', 'priority'], 'st_status_priority_idx');
            });
        }

        if (! Schema::hasTable('support_ticket_messages')) {
            Schema::create('support_ticket_messages', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('support_ticket_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->text('message');
                $table->json('attachments')->nullable();
                $table->boolean('is_internal')->default(false)->index();
                $table->timestamps();
                $table->index(['support_ticket_id', 'created_at'], 'stm_ticket_created_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('support_ticket_messages');
        Schema::dropIfExists('support_tickets');
    }
};
