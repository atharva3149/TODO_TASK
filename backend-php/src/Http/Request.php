<?php

declare(strict_types=1);

namespace App\Http;

use InvalidArgumentException;

final class Request
{
    /** @return array<string, mixed> */
    public static function json(): array
    {
        $body = file_get_contents('php://input');
        if ($body === false || trim($body) === '') {
            return [];
        }

        try {
            $decoded = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new InvalidArgumentException('Request body must be valid JSON');
        }

        if (!is_array($decoded)) {
            throw new InvalidArgumentException('Request body must be a JSON object');
        }

        return $decoded;
    }

    public static function bearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/i', $header, $matches) !== 1) {
            return null;
        }
        return trim($matches[1]);
    }
}
