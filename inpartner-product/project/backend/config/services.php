<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    | Inpartner Article Generator (content source / editor).
    | `key` must equal STORE_INTEGRATION_KEY in article-generator/project/.env
    */
    'article_generator' => [
        'url' => rtrim((string) env('ARTICLE_GENERATOR_URL', 'http://127.0.0.1:8000'), '/'),
        'key' => env('ARTICLE_GENERATOR_KEY'),
        'default_price' => (int) env('ARTICLE_GENERATOR_DEFAULT_PRICE', 25000),
        'auto_sync' => (bool) env('ARTICLE_GENERATOR_AUTO_SYNC', true),
        'timeout' => (int) env('ARTICLE_GENERATOR_TIMEOUT', 20),
    ],

    /*
    | Midtrans Snap. When server_key is empty the built-in payment simulator is used.
    */
    'midtrans' => [
        'server_key' => env('MIDTRANS_SERVER_KEY'),
        'client_key' => env('MIDTRANS_CLIENT_KEY'),
        'is_production' => (bool) env('MIDTRANS_IS_PRODUCTION', false),
        'expiry_minutes' => (int) env('PAYMENT_EXPIRY_MINUTES', 60),
    ],

    'frontend' => [
        'url' => rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/'),
    ],

    'admin' => [
        'name' => env('ADMIN_NAME', 'Inpartner Admin'),
        'email' => env('ADMIN_EMAIL', 'admin@inpartner.id'),
        'password' => env('ADMIN_PASSWORD', 'admin12345'),
    ],

];
