<?php

namespace KumaDevelop\Level\Api;

use Flarum\Api\Context;
use Flarum\Api\Schema;
use Flarum\User\User;
use KumaDevelop\Level\LevelService;

class UserFields
{
    public function __invoke(): array
    {
        return [
            // Chỉ quản trị viên được ghi (chỉnh EXP/cấp của người dùng)
            Schema\Integer::make('exp')
                ->get(fn (User $user) => (int) $user->exp)
                ->writable(fn ($user, Context $context) => $context->getActor()->isAdmin())
                ->set(function (User $user, $value) {
                    $user->exp = max(0, (int) $value);
                }),

            Schema\Integer::make('level')
                ->get(fn (User $user) => resolve(LevelService::class)->levelFor((int) $user->exp)),
        ];
    }
}
