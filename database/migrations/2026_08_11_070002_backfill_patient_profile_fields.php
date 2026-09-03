<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('patients')
            ->orderBy('id')
            ->chunkById(100, function ($patients): void {
                foreach ($patients as $patient) {
                    $user = DB::table('users')
                        ->select(['name', 'email', 'phone'])
                        ->where('id', $patient->user_id)
                        ->first();

                    if (! $user) {
                        continue;
                    }

                    DB::table('patients')
                        ->where('id', $patient->id)
                        ->update([
                            'name' => $user->name,
                            'email' => $user->email,
                            'phone' => $user->phone,
                        ]);
                }
            });
    }

    public function down(): void
    {
        // No reliable way to restore the previous null state safely.
    }
};
