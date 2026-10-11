<?php

namespace KumaDevelop\Level\Notification;

use Flarum\Database\AbstractModel;
use Flarum\Notification\Blueprint\BlueprintInterface;
use Flarum\User\User;

/**
 * Thông báo "bạn đã lên cấp". Chủ thể là chính người dùng, không có người gửi (thông báo hệ thống).
 * Tên cấp được giao diện tự dịch theo ngôn ngữ người xem, nên ở đây chỉ lưu số cấp.
 */
class LevelUpBlueprint implements BlueprintInterface
{
    public function __construct(protected User $user, protected int $level)
    {
    }

    public function getFromUser(): ?User
    {
        return null;
    }

    public function getSubject(): ?AbstractModel
    {
        return $this->user;
    }

    public function getData(): mixed
    {
        return ['level' => $this->level];
    }

    public static function getType(): string
    {
        return 'kumaDevelopLevelUp';
    }

    public static function getSubjectModel(): string
    {
        return User::class;
    }
}
