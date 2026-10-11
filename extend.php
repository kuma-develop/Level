<?php

use Flarum\Api\Context;
use Flarum\Api\Resource\ForumResource;
use Flarum\Api\Resource\UserResource;
use Flarum\Api\Schema;
use Flarum\Discussion\Event\Started;
use Flarum\Extend;
use Flarum\Post\Event\Posted;
use Flarum\User\User;
use KumaDevelop\Level\Api\UserFields;
use KumaDevelop\Level\LevelService;
use KumaDevelop\Level\Listener;
use KumaDevelop\Level\Middleware\DailyVisit;
use KumaDevelop\Level\Notification\LevelUpBlueprint;

return [
    new Extend\Locales(__DIR__ . '/locale'),

    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js'),

    (new Extend\Settings())
        ->default('kuma-develop-level.exp_discussion', 10)
        ->default('kuma-develop-level.exp_post', 5)
        ->default('kuma-develop-level.exp_daily', 2)
        ->default('kuma-develop-level.timezone', 'Asia/Ho_Chi_Minh')
        ->default('kuma-develop-level.icons_enabled', true)
        ->default('kuma-develop-level.notify_levelup', true)
        ->default('kuma-develop-level.levels', json_encode(LevelService::defaultLevels(), JSON_UNESCAPED_UNICODE))
        ->serializeToForum('kumaDevelopLevelConfig', 'kuma-develop-level.levels')
        ->serializeToForum('kumaDevelopLevelIcons', 'kuma-develop-level.icons_enabled', 'boolval'),

    (new Extend\Model(User::class))
        ->cast('exp', 'integer')
        ->cast('exp_daily_at', 'datetime'),

    (new Extend\ApiResource(UserResource::class))
        ->fields(UserFields::class),

    // Cho giao diện biết người xem có quyền chỉnh cấp độ hay không
    (new Extend\ApiResource(ForumResource::class))
        ->fields(fn () => [
            Schema\Boolean::make('kumaDevelopLevelCanEdit')
                ->get(fn ($model, Context $context) => $context->getActor()->can('kumaDevelopLevel.edit')),
        ]),

    // Thông báo khi lên cấp (chuông thông báo; người dùng tự bật/tắt trong Cài đặt > Thông báo)
    (new Extend\Notification())
        ->type(LevelUpBlueprint::class, ['alert']),

    (new Extend\Event())
        ->listen(Started::class, Listener\OnDiscussionStarted::class)
        ->listen(Posted::class, Listener\OnPostCreated::class),

    // Điểm danh ở lần truy cập đầu tiên mỗi ngày (trang web và các lệnh gọi API)
    (new Extend\Middleware('forum'))->add(DailyVisit::class),
    (new Extend\Middleware('api'))->add(DailyVisit::class),
];
