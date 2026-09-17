<?php

declare(strict_types=1);

namespace App\Config;

use Dotenv\Dotenv;
use RuntimeException;

final class Config
{
    private static bool $loaded = false;

    public static function load(): void
    {
        if (self::$loaded) {
            return;
        }

        $envFile = dirname(__DIR__, 2) . '/.env';
        if (is_file($envFile)) {
            Dotenv::createImmutable(dirname($envFile))->safeLoad();
        }

        self::$loaded = true;
    }

    public static function get(string $key, ?string $default = null): string
    {
        self::load();
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
        if ($value === false || $value === null || $value === '') {
            $value = $default;
        }
        if ($value === null || $value === '') {
            throw new RuntimeException("Missing required environment variable: {$key}");
        }
        return $value;
    }

    public static function integer(string $key, int $default): int
    {
        $value = self::get($key, (string) $default);
        if (!ctype_digit($value)) {
            throw new RuntimeException("Environment variable {$key} must be an integer");
        }
        return (int) $value;
    }
}
