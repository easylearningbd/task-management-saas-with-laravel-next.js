<?php

namespace App\Models;

use App\Enums\ClientStatus;
use App\Models\Concerns\BelongsToCompany;
use Database\Factories\ClientFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * A company's client (PRD §6.7) — the first tenant-owned model. BelongsToCompany limits every
 * query (route binding included) to the current company and stamps `company_id` on create;
 * `company_id` is deliberately not fillable.
 *
 * @property int $id
 * @property int $company_id
 * @property string $name
 * @property string $email
 * @property string $phone
 * @property string $company_name
 * @property string $address
 * @property string|null $website
 * @property ClientStatus $status
 * @property string|null $notes
 */
class Client extends Model
{
    /** @use HasFactory<ClientFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = ['name', 'email', 'phone', 'company_name', 'address', 'website', 'status', 'notes'];

    protected $attributes = [
        'status' => 'active',
    ];

    protected function casts(): array
    {
        return [
            'status' => ClientStatus::class,
        ];
    }

    /** Name, email, the client's company or phone contains the term (LIKE-escaped). */
    public function scopeSearch(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);
        if ($term === '') {
            return;
        }

        $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
        $query->where(fn (Builder $q) => $q
            ->whereRaw("clients.name like ? escape '!'", [$like])
            ->orWhereRaw("clients.email like ? escape '!'", [$like])
            ->orWhereRaw("clients.company_name like ? escape '!'", [$like])
            ->orWhereRaw("clients.phone like ? escape '!'", [$like]));
    }

    public function scopeOfStatus(Builder $query, ClientStatus|string|null $status): void
    {
        if ($status === null || $status === '') {
            return;
        }

        $query->where('clients.status', $status instanceof ClientStatus ? $status->value : $status);
    }

    /**
     * The list's initials avatar, as in the Clients screenshot: first letter of the first and
     * of the LAST word — "MC" Microsoft Corporation, "AS" Amazon Web Services, "GP" Google
     * Cloud Platform; one word → its first two letters ("JO" for "John").
     */
    protected function initials(): Attribute
    {
        return Attribute::get(function (): string {
            $words = preg_split('/\s+/', trim($this->name)) ?: [];
            $words = array_values(array_filter($words, fn (string $w) => $w !== ''));
            $letters = count($words) > 1
                ? Str::substr($words[0], 0, 1).Str::substr($words[count($words) - 1], 0, 1)
                : Str::substr($words[0] ?? '?', 0, 2);

            return Str::upper($letters);
        });
    }

    /** "microsoft.com" for "https://microsoft.com/path" — the website badge text. */
    protected function websiteHost(): Attribute
    {
        return Attribute::get(function (): ?string {
            if (! $this->website) {
                return null;
            }

            return parse_url($this->website, PHP_URL_HOST) ?: $this->website;
        });
    }
}
