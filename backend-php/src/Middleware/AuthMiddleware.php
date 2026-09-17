<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Config\Config;
use App\Http\JsonResponse;
use App\Http\Request;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Throwable;

final class AuthMiddleware
{
    /** @return array{userId: int, role: string} */
    public static function authenticate(): array
    {
        $token = Request::bearerToken();
        if ($token === null) {
            JsonResponse::send(['error' => 'Authentication required'], 401);
        }

        try {
            $claims = JWT::decode($token, new Key(Config::get('JWT_SECRET'), 'HS256'));
            $userId = (int) ($claims->userId ?? $claims->sub ?? 0);
            $role = (string) ($claims->role ?? '');
            $type = (string) ($claims->type ?? '');

            if ($type !== 'access' || $userId <= 0 || !in_array($role, ['user', 'admin'], true)) {
                JsonResponse::send(['error' => 'Invalid access token'], 401);
            }

            return ['userId' => $userId, 'role' => $role];
        } catch (Throwable) {
            JsonResponse::send(['error' => 'Invalid or expired access token'], 401);
        }
    }
}
