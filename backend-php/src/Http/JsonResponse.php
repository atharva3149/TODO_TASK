<?php

declare(strict_types=1);

namespace App\Http;

final class JsonResponse
{
    /** @param array<string, mixed> $body */
    public static function send(array $body, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function empty(int $status = 204): never
    {
        http_response_code($status);
        exit;
    }
}
