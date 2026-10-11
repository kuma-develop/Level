<?php

namespace KumaDevelop\Level\Middleware;

use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use KumaDevelop\Level\LevelService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Cộng EXP điểm danh ở lần truy cập đầu tiên mỗi ngày của người đã đăng nhập
 * (kể cả khi giữ phiên dài, không cần đăng nhập lại).
 */
class DailyVisit implements MiddlewareInterface
{
    public function __construct(
        protected LevelService $levels,
        protected SettingsRepositoryInterface $settings
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        try {
            $actor = RequestUtil::getActor($request);

            if ($actor && ! $actor->isGuest()) {
                $this->levels->claimDaily($actor, (int) $this->settings->get('kuma-develop-level.exp_daily', 2));
            }
        } catch (\Throwable $e) {
            // Điểm danh không bao giờ được làm hỏng request
        }

        return $handler->handle($request);
    }
}
