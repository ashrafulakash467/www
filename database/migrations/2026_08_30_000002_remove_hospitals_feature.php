<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // The active application no longer exposes the hospital feature. Existing
        // installations can still contain referenced hospital records, however,
        // so destructive removal must be handled by an explicit archival project.
        // Keeping this migration as a no-op preserves those records safely.
    }

    public function down(): void
    {
        // Hospital data cannot be reconstructed after this domain removal.
    }
};
