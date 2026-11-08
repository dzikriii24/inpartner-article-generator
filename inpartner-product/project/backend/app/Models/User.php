<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_CUSTOMER = 'customer';
    public const ROLE_ADMIN = 'admin';

    protected $fillable = [
        'name', 'email', 'phone', 'password', 'role', 'status', 'last_login_at',
        'avatar_url', 'bio', 'job_title', 'organization', 'department', 'country',
        'timezone', 'preferred_language', 'reading_goals',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'reading_goals' => 'array',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function entitlements(): HasMany
    {
        return $this->hasMany(Entitlement::class);
    }

    public function wishlists(): HasMany
    {
        return $this->hasMany(Wishlist::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function customRequests(): HasMany
    {
        return $this->hasMany(CustomRequest::class);
    }

    public function readingSchedules(): HasMany
    {
        return $this->hasMany(ReadingSchedule::class);
    }

    public function readingActivities(): HasMany
    {
        return $this->hasMany(ReadingActivity::class);
    }

    public function researchCollections(): HasMany
    {
        return $this->hasMany(ResearchCollection::class);
    }

    /** Does the user currently have valid access to the product? */
    public function owns(Product $product): bool
    {
        return $this->entitlements()
            ->where('product_id', $product->id)
            ->active()
            ->exists();
    }
}
