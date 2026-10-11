<?php

namespace KumaDevelop\Level\Listener;

use Flarum\Post\Event\Posted;
use Flarum\Post\Post;
use Flarum\Settings\SettingsRepositoryInterface;
use KumaDevelop\Level\LevelService;

class OnPostCreated
{
    public function __construct(
        protected LevelService $levels,
        protected SettingsRepositoryInterface $settings
    ) {
    }

    public function handle(Posted $event): void
    {
        $post = $event->post;

        // Bài chờ duyệt / đã ẩn thì chưa được cộng EXP (chống cày bằng spam)
        if (! $post->is_approved || $post->hidden_at) {
            return;
        }

        // `number` có thể chưa phải số nguyên lúc event chạy: đọc lại từ DB cho chắc
        $number = $post->number;
        if (! is_numeric($number)) {
            $number = Post::query()->whereKey($post->id)->value('number');
        }

        // Bài đầu của chủ đề đã được tính ở OnDiscussionStarted
        if ((int) $number <= 1) {
            return;
        }

        $this->levels->award(
            $event->post->user,
            (int) $this->settings->get('kuma-develop-level.exp_post', 5)
        );
    }

    public function __invoke(Posted $event): void
    {
        $this->handle($event);
    }
}
