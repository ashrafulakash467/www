<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'username')) {
                $table->string('username', 50)->nullable()->unique()->after('name');
            }
        });

        $this->dropUniqueIndexesOnColumn('users', 'role');

        DB::table('users')
            ->select(['id', 'username', 'name', 'email'])
            ->orderBy('id')
            ->get()
            ->each(function ($user): void {
                if (filled($user->username)) {
                    // Keep an existing username when present.
                    return;
                }

                $seed = Str::slug((string) ($user->name ?: $user->email ?: ('user-'.$user->id)));
                $seed = Str::lower(trim($seed));

                if ($seed === '') {
                    $seed = 'user-'.$user->id;
                }

                $candidate = Str::limit($seed, 50, '');
                $suffix = 1;

                while (DB::table('users')->where('username', $candidate)->where('id', '!=', $user->id)->exists()) {
                    $candidate = Str::limit($seed, 50 - (strlen((string) $suffix) + 1), '').'-'.$suffix;
                    $suffix++;
                }

                DB::table('users')->where('id', $user->id)->update([
                    'username' => $candidate,
                ]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'username')) {
            return;
        }

        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique('users_username_unique');
            $table->dropColumn('username');
        });
    }

    private function dropUniqueIndexesOnColumn(string $tableName, string $columnName): void
    {
        $indexes = collect(Schema::getIndexes($tableName))
            ->filter(fn (array $index) => ($index['unique'] ?? false)
                && ($index['primary'] ?? false) === false
                && ($index['columns'] ?? []) === [$columnName])
            ->pluck('name')
            ->unique()
            ->values()
            ->all();

        if ($indexes === []) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($indexes): void {
            foreach ($indexes as $index) {
                $table->dropUnique($index);
            }
        });
    }
};
