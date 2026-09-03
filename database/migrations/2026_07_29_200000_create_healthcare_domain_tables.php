<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->unique();
            $table->string('mrn')->nullable()->unique();
            $table->date('date_of_birth')->nullable()->index();
            $table->string('gender')->nullable()->index();
            $table->string('blood_group')->nullable()->index();
            $table->string('marital_status')->nullable()->index();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('city')->nullable()->index();
            $table->string('state')->nullable()->index();
            $table->string('postal_code')->nullable();
            $table->string('country')->nullable()->index();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->string('status')->default('active')->index();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('doctors', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->unique();
            $table->string('license_no')->nullable()->unique();
            $table->string('specialty')->index();
            $table->string('sub_specialty')->nullable()->index();
            $table->text('bio')->nullable();
            $table->string('qualification')->nullable();
            $table->string('gender')->nullable()->index();
            $table->decimal('consultation_fee', 12, 2)->default(0);
            $table->decimal('follow_up_fee', 12, 2)->nullable();
            $table->string('image_path')->nullable();
            $table->string('chamber_address')->nullable();
            $table->string('city')->nullable()->index();
            $table->string('state')->nullable()->index();
            $table->string('country')->nullable()->index();
            $table->string('verification_status')->default('pending')->index();
            $table->timestamp('verified_at')->nullable()->index();
            $table->string('status')->default('active')->index();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('doctor_schedules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->string('consultation_type')->default('in_person')->index();
            $table->string('timezone')->default('Asia/Dhaka');
            $table->json('working_days');
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('slot_duration_minutes')->default(15);
            $table->time('break_start_time')->nullable();
            $table->time('break_end_time')->nullable();
            $table->unsignedSmallInteger('daily_capacity')->default(1);
            $table->boolean('is_active')->default(true)->index();
            $table->string('status')->default('active')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('doctor_schedule_exceptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('doctor_schedule_id')->constrained()->cascadeOnDelete();
            $table->date('exception_date')->index();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('exception_type')->default('leave')->index();
            $table->text('reason')->nullable();
            $table->string('status')->default('active')->index();
            $table->timestamps();
            $table->index(['doctor_schedule_id', 'exception_date'], 'dse_sched_date_idx');
        });

        Schema::create('appointment_slots', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('doctor_schedule_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->date('slot_date')->index();
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('capacity')->default(1);
            $table->unsignedSmallInteger('booked_count')->default(0);
            $table->boolean('is_bookable')->default(true)->index();
            $table->string('status')->default('available')->index();
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();
            $table->unique(['doctor_schedule_id', 'slot_date', 'start_time'], 'aps_schedule_date_start_unique');
        });

        Schema::create('appointments', function (Blueprint $table): void {
            $table->id();
            $table->string('appointment_no')->unique();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('appointment_slot_id')->nullable()->constrained()->nullOnDelete();
            $table->string('consultation_type')->default('in_person')->index();
            $table->date('appointment_date')->index();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('status')->default('pending')->index();
            $table->string('payment_status')->default('unpaid')->index();
            $table->string('channel')->nullable()->index();
            $table->text('reason')->nullable();
            $table->text('symptoms')->nullable();
            $table->text('doctor_notes')->nullable();
            $table->text('cancel_reason')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('rescheduled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->date('follow_up_date')->nullable()->index();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['doctor_id', 'appointment_date', 'status'], 'apt_doc_date_status_idx');
            $table->index(['patient_id', 'appointment_date', 'status'], 'apt_patient_date_status_idx');
        });

        Schema::create('medical_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('record_type')->default('consultation')->index();
            $table->string('status')->default('active')->index();
            $table->text('chief_complaint')->nullable();
            $table->text('clinical_notes')->nullable();
            $table->text('diagnosis')->nullable();
            $table->text('treatment_plan')->nullable();
            $table->json('vital_signs')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamp('recorded_at')->nullable()->index();
            $table->timestamps();
            $table->index(['patient_id', 'doctor_id', 'recorded_at'], 'mr_patient_doctor_recorded_idx');
        });

        Schema::create('prescriptions', function (Blueprint $table): void {
            $table->id();
            $table->string('prescription_no')->unique();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('medical_record_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('issued')->index();
            $table->timestamp('issued_at')->nullable()->index();
            $table->text('notes')->nullable();
            $table->unsignedSmallInteger('follow_up_in_days')->nullable();
            $table->timestamps();
        });

        Schema::create('prescription_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('prescription_id')->constrained()->cascadeOnDelete();
            $table->string('medicine_name');
            $table->string('strength')->nullable();
            $table->string('dosage')->nullable();
            $table->string('frequency')->nullable();
            $table->string('route')->nullable();
            $table->string('duration')->nullable();
            $table->unsignedSmallInteger('quantity')->nullable();
            $table->text('instructions')->nullable();
            $table->timestamps();
            $table->index(['prescription_id', 'medicine_name'], 'pi_prescription_medicine_idx');
        });

        Schema::create('payments', function (Blueprint $table): void {
            $table->id();
            $table->string('transaction_no')->unique();
            $table->foreignId('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('payer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('provider')->nullable()->index();
            $table->string('method')->nullable()->index();
            $table->string('currency', 10)->default('BDT');
            $table->decimal('amount', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('due_amount', 12, 2)->default(0);
            $table->string('status')->default('pending')->index();
            $table->timestamp('paid_at')->nullable()->index();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->index(['patient_id', 'status'], 'pay_patient_status_idx');
            $table->index(['doctor_id', 'status'], 'pay_doctor_status_idx');
        });

        Schema::create('notifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->json('data');
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();
        });

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

        Schema::create('reports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('generated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('report_type')->index();
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('parameters')->nullable();
            $table->string('file_path')->nullable();
            $table->string('status')->default('queued')->index();
            $table->timestamp('generated_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('cms_pages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();
            $table->string('template')->default('default')->index();
            $table->longText('content')->nullable();
            $table->text('excerpt')->nullable();
            $table->string('status')->default('draft')->index();
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action')->index();
            $table->string('auditable_type')->nullable()->index();
            $table->unsignedBigInteger('auditable_id')->nullable()->index();
            $table->text('description')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable()->index();
            $table->text('user_agent')->nullable();
            $table->text('url')->nullable();
            $table->integer('status_code')->nullable();
            $table->timestamps();
            $table->index(['auditable_type', 'auditable_id'], 'audit_type_id_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('cms_pages');
        Schema::dropIfExists('reports');
        Schema::dropIfExists('support_ticket_messages');
        Schema::dropIfExists('support_tickets');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('prescription_items');
        Schema::dropIfExists('prescriptions');
        Schema::dropIfExists('medical_records');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('appointment_slots');
        Schema::dropIfExists('doctor_schedule_exceptions');
        Schema::dropIfExists('doctor_schedules');
        Schema::dropIfExists('doctors');
        Schema::dropIfExists('patients');
    }
};
