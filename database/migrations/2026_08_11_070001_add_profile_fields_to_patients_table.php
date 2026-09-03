<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table): void {
            $table->string('name')->nullable()->after('user_id');
            $table->string('email')->nullable()->index()->after('name');
            $table->string('phone')->nullable()->index()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table): void {
            $table->dropIndex(['email']);
            $table->dropIndex(['phone']);
            $table->dropColumn(['name', 'email', 'phone']);
        });
    }
};
