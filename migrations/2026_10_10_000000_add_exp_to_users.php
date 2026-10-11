<?php

use Illuminate\Database\Schema\Builder;
use Illuminate\Database\Schema\Blueprint;

// Idempotent: chạy lại hoặc đã chạy install.sql thủ công vẫn không lỗi.
return [
    'up' => function (Builder $schema) {
        if (! $schema->hasColumn('users', 'exp')) {
            $schema->table('users', function (Blueprint $table) {
                $table->unsignedInteger('exp')->default(0)->index();
            });
        }
        if (! $schema->hasColumn('users', 'exp_daily_at')) {
            $schema->table('users', function (Blueprint $table) {
                $table->dateTime('exp_daily_at')->nullable();
            });
        }
    },
    'down' => function (Builder $schema) {
        foreach (['exp', 'exp_daily_at'] as $col) {
            if ($schema->hasColumn('users', $col)) {
                $schema->table('users', function (Blueprint $table) use ($col) {
                    $table->dropColumn($col);
                });
            }
        }
    },
];
