<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'username')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->string('username', 50)->nullable()->after('name');
            });
        }

        $this->dropUniqueIndexOn('role');

        DB::table('users')->select(['id', 'username', 'name', 'email'])->orderBy('id')->get()
            ->each(function ($user): void {
                if (filled($user->username)) {
                    return;
                }

                $base = Str::lower(Str::slug((string) ($user->name ?: $user->email ?: 'user-'.$user->id)));
                $base = Str::limit($base ?: 'user-'.$user->id, 50, '');
                $candidate = $base;
                $suffix = 1;

                while (DB::table('users')->where('username', $candidate)->where('id', '!=', $user->id)->exists()) {
                    $candidate = Str::limit($base, 49 - strlen((string) $suffix), '').'-'.$suffix++;
                }

                DB::table('users')->where('id', $user->id)->update(['username' => $candidate]);
            });

        $hasUsernameUnique = collect(Schema::getIndexes('users'))->contains(
            fn (array $index) => ($index['unique'] ?? false) && ($index['columns'] ?? []) === ['username'],
        );

        if (! $hasUsernameUnique) {
            Schema::table('users', fn (Blueprint $table) => $table->unique('username'));
        }
    }

    public function down(): void
    {
        // This repair intentionally keeps valid usernames and the non-unique role column.
    }

    private function dropUniqueIndexOn(string $column): void
    {
        $indexes = collect(Schema::getIndexes('users'))
            ->filter(fn (array $index) => ($index['unique'] ?? false)
                && ($index['primary'] ?? false) === false
                && ($index['columns'] ?? []) === [$column]);

        if ($indexes->isEmpty()) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($indexes): void {
            foreach ($indexes as $index) {
                $table->dropUnique($index['name']);
            }
        });
    }
};
