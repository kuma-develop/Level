<?php

namespace KumaDevelop\Level\Listener;

use Flarum\Discussion\Event\Started;
use Flarum\Settings\SettingsRepositoryInterface;
use KumaDevelop\Level\LevelService;

class OnDiscussionStarted
{
    public function __construct(
        protected LevelService $levels,
        protected SettingsRepositoryInterface $settings
    ) {
    }

    public function handle(Started $event): void
    {
        // Chủ đề chờ duyệt / đã ẩn thì chưa được cộng EXP
        if (! ($event->discussion->is_approved ?? true) || $event->discussion->hidden_at) {
            return;
        }

        $this->levels->award(
            $event->discussion->user,
            (int) $this->settings->get('kuma-develop-level.exp_discussion', 10)
        );
    }

    public function __invoke(Started $event): void
    {
        $this->handle($event);
    }
}
