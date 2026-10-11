<?php

namespace KumaDevelop\Level;

use Carbon\Carbon;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\User;

class LevelService
{
    /** @var array<string, array> chuẩn hóa theo chuỗi cấu hình, tránh decode lại cho từng người dùng */
    protected static array $memo = [];

    public function __construct(protected SettingsRepositoryInterface $settings)
    {
    }

    public static function defaultLevels(): array
    {
        return [
            ['exp' => 0,    'key' => 'newbie', 'name' => '', 'icon' => 'fas fa-seedling',   'color' => '#64748b'],
            ['exp' => 50,   'key' => 'apprentice', 'name' => '', 'icon' => 'fas fa-leaf',       'color' => '#16a34a'],
            ['exp' => 200,  'key' => 'member', 'name' => '', 'icon' => 'fas fa-tree',       'color' => '#16a34a'],
            ['exp' => 450,  'key' => 'active', 'name' => '', 'icon' => 'fas fa-shield-alt', 'color' => '#2563eb'],
            ['exp' => 800,  'key' => 'expert', 'name' => '', 'icon' => 'fas fa-star',       'color' => '#2563eb'],
            ['exp' => 1250, 'key' => 'elite', 'name' => '', 'icon' => 'fas fa-bolt',       'color' => '#7c3aed'],
            ['exp' => 1800, 'key' => 'master', 'name' => '', 'icon' => 'fas fa-gem',        'color' => '#7c3aed'],
            ['exp' => 2450, 'key' => 'grandmaster', 'name' => '', 'icon' => 'fas fa-fire',       'color' => '#db2777'],
            ['exp' => 3200, 'key' => 'legend', 'fx' => true, 'name' => '', 'icon' => 'fas fa-dragon',    'color' => '#f59e0b'],
            ['exp' => 4050, 'key' => 'sovereign', 'fx' => true, 'name' => '', 'icon' => 'fas fa-crown',      'color' => '#f59e0b'],
        ];
    }

    /** Bảng cấp đã chuẩn hóa: sắp theo EXP tăng dần, cấp 1 luôn từ 0 EXP. Cấp N = phần tử thứ N. */
    public function levels(): array
    {
        $raw = $this->settings->get('kuma-develop-level.levels');
        $key = is_string($raw) ? $raw : '';

        if (isset(self::$memo[$key])) {
            return self::$memo[$key];
        }

        $data = is_string($raw) ? json_decode($raw, true) : null;

        $out = [];
        if (is_array($data)) {
            foreach ($data as $l) {
                if (! is_array($l)) {
                    continue;
                }
                $out[] = [
                    'exp'   => max(0, (int) ($l['exp'] ?? 0)),
                    'key'   => preg_match('/^[a-z0-9_]+$/', (string) ($l['key'] ?? '')) ? (string) $l['key'] : '',
                    'fx'    => ! empty($l['fx']),
                    'name'  => (string) ($l['name'] ?? ''),
                    'icon'  => (string) ($l['icon'] ?? ''),
                    'color' => (string) ($l['color'] ?? ''),
                ];
            }
        }

        if (! $out) {
            $out = self::defaultLevels();
        }

        usort($out, fn ($a, $b) => $a['exp'] <=> $b['exp']);
        $out[0]['exp'] = 0;

        // EXP phải tăng chặt: cấp trùng ngưỡng sẽ làm cấp trước đó không bao giờ đạt được
        for ($i = 1, $n = count($out); $i < $n; $i++) {
            if ($out[$i]['exp'] <= $out[$i - 1]['exp']) {
                $out[$i]['exp'] = $out[$i - 1]['exp'] + 1;
            }
        }

        return self::$memo[$key] = $out;
    }

    public function levelFor(int $exp): int
    {
        $level = 1;
        foreach ($this->levels() as $i => $l) {
            if ($exp >= $l['exp']) {
                $level = $i + 1;
            } else {
                break;
            }
        }

        return $level;
    }

    /** Múi giờ dùng để xác định "một ngày" (mặc định Asia/Ho_Chi_Minh), sai thì rơi về UTC */
    protected function timezone(): string
    {
        $tz = (string) $this->settings->get('kuma-develop-level.timezone', 'Asia/Ho_Chi_Minh');

        try {
            new \DateTimeZone($tz);
        } catch (\Throwable $e) {
            return 'UTC';
        }

        return $tz;
    }

    /**
     * Điểm danh: cộng EXP một lần mỗi ngày. Dùng UPDATE có điều kiện nên
     * nhiều request đồng thời cũng chỉ được cộng một lần.
     */
    public function claimDaily(User $user, int $amount): bool
    {
        if ($amount <= 0) {
            return false;
        }

        $startUtc = Carbon::now($this->timezone())->startOfDay()->setTimezone('UTC');

        $last = $user->exp_daily_at;
        if ($last && Carbon::parse($last)->gte($startUtc)) {
            return false;
        }

        $nowUtc = Carbon::now('UTC');
        $prevRaw = $user->getRawOriginal('exp_daily_at');

        $claimed = User::query()
            ->whereKey($user->id)
            ->where(function ($q) use ($startUtc) {
                $q->whereNull('exp_daily_at')->orWhere('exp_daily_at', '<', $startUtc->toDateTimeString());
            })
            ->update(['exp_daily_at' => $nowUtc->toDateTimeString()]);

        if (! $claimed) {
            return false;
        }

        $user->exp_daily_at = $nowUtc;
        $user->syncOriginalAttribute('exp_daily_at');

        if (! $this->award($user, $amount)) {
            // Cộng EXP lỗi thì trả lại lượt điểm danh để lần truy cập sau thử lại
            try {
                User::query()
                    ->whereKey($user->id)
                    ->where('exp_daily_at', $nowUtc->toDateTimeString())
                    ->update(['exp_daily_at' => $prevRaw]);
                $user->exp_daily_at = $prevRaw;
                $user->syncOriginalAttribute('exp_daily_at');
            } catch (\Throwable $e) {
            }

            return false;
        }

        return true;
    }

    public function award(?User $user, int $amount): bool
    {
        if (! $user || ! $user->exists || $amount <= 0) {
            return false;
        }

        // Cộng EXP không bao giờ được chặn việc đăng bài: lỗi chỉ được ghi vào log.
        try {
            User::query()->whereKey($user->id)->increment('exp', $amount);

            $user->exp = (int) User::query()->whereKey($user->id)->value('exp');
            $user->syncOriginalAttribute('exp');

            return true;
        } catch (\Throwable $e) {
            try {
                resolve(\Psr\Log\LoggerInterface::class)->error(
                    '[kuma-develop-level] Không cộng được EXP (đã chạy migration thêm cột exp chưa?): ' . $e->getMessage()
                );
            } catch (\Throwable $ignored) {
            }

            return false;
        }
    }
}
