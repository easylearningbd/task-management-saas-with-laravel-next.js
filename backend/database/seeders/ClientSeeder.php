<?php

namespace Database\Seeders;

use App\Enums\ClientStatus;
use App\Models\Client;
use App\Models\User;
use App\Support\Tenancy\Tenancy;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Demo clients — idempotent and additive: `updateOrCreate` on (company, email), never deletes
 * or truncates. Each company's rows are written inside Tenancy::runAs(), so BelongsToCompany
 * stamps the right `company_id` and the lookup only sees that company's clients.
 *
 *  - company@example.com: the 12 clients of the Clients screenshot (10 shown + 2 so a second
 *    page exists), oldest first in the screenshot's order.
 *  - admin@healthcare.com (Healthcare Systems): 3 clients, so tenant isolation can be checked
 *    by hand — one shares an email with a demo-company client on purpose (allowed: email is
 *    unique per company, not globally).
 *
 * Created dates are relative to today and only set when a client is first created, so a re-run
 * changes nothing. Run: php artisan db:seed --class=ClientSeeder
 */
class ClientSeeder extends Seeder
{
    /** @var array<string, list<array{name: string, email: string, phone: string, company_name: string, address: string, website: ?string, status: string, days_ago: int}>> */
    private const CLIENTS = [
        'company@example.com' => [
            ['name' => 'Microsoft Corporation', 'email' => 'partnerships@microsoft.com', 'phone' => '+1-371-131-3358', 'company_name' => 'Microsoft', 'address' => '6718 Oak St, Phoenix, AZ 73848', 'website' => 'https://microsoft.com', 'status' => 'active', 'days_ago' => 178],
            ['name' => 'Amazon Web Services', 'email' => 'enterprise@aws.com', 'phone' => '+1-564-984-2057', 'company_name' => 'Amazon', 'address' => '410 Terry Ave N, Seattle, WA 98109', 'website' => 'https://aws.amazon.com', 'status' => 'active', 'days_ago' => 171],
            ['name' => 'Google Cloud Platform', 'email' => 'business@google.com', 'phone' => '+1-403-600-2030', 'company_name' => 'Google', 'address' => '1600 Amphitheatre Pkwy, Mountain View, CA 94043', 'website' => 'https://cloud.google.com', 'status' => 'active', 'days_ago' => 164],
            ['name' => 'Apple Inc', 'email' => 'enterprise@apple.com', 'phone' => '+1-344-597-1746', 'company_name' => 'Apple', 'address' => '1 Apple Park Way, Cupertino, CA 95014', 'website' => 'https://apple.com', 'status' => 'active', 'days_ago' => 157],
            ['name' => 'Meta Platforms', 'email' => 'business@meta.com', 'phone' => '+1-668-611-3796', 'company_name' => 'Meta', 'address' => '1 Hacker Way, Menlo Park, CA 94025', 'website' => 'https://meta.com', 'status' => 'active', 'days_ago' => 150],
            ['name' => 'Netflix Inc', 'email' => 'partnerships@netflix.com', 'phone' => '+1-857-804-7742', 'company_name' => 'Netflix', 'address' => '121 Albright Way, Los Gatos, CA 95032', 'website' => 'https://netflix.com', 'status' => 'active', 'days_ago' => 143],
            ['name' => 'Tesla Inc', 'email' => 'business@tesla.com', 'phone' => '+1-885-264-1436', 'company_name' => 'Tesla', 'address' => '1 Tesla Rd, Austin, TX 78725', 'website' => 'https://tesla.com', 'status' => 'active', 'days_ago' => 136],
            ['name' => 'John Smith', 'email' => 'john.smith@example.com', 'phone' => '+1-555-1082', 'company_name' => 'Tech Solutions Inc', 'address' => '245 Market St, San Francisco, CA 94105', 'website' => 'https://www.techsolutionsinc.com', 'status' => 'inactive', 'days_ago' => 129],
            ['name' => 'Sarah Johnson', 'email' => 'sarah.johnson@example.com', 'phone' => '+1-555-2785', 'company_name' => 'Digital Marketing Pro', 'address' => '88 Madison Ave, New York, NY 10016', 'website' => 'https://www.digitalmarketingpro.com', 'status' => 'inactive', 'days_ago' => 122],
            ['name' => 'Michael Brown', 'email' => 'michael.brown@example.com', 'phone' => '+1-555-5469', 'company_name' => 'Creative Design Studio', 'address' => '1200 Pearl St, Boulder, CO 80302', 'website' => 'https://www.creativedesignstudio.com', 'status' => 'active', 'days_ago' => 115],
            // Not in the screenshot: two more so the list has a second page.
            ['name' => 'Emily Davis', 'email' => 'emily.davis@example.com', 'phone' => '+1-555-7310', 'company_name' => 'Davis Consulting Group', 'address' => '77 Summer St, Boston, MA 02110', 'website' => 'https://www.davisconsulting.com', 'status' => 'active', 'days_ago' => 108],
            ['name' => 'David Wilson', 'email' => 'david.wilson@example.com', 'phone' => '+1-555-8824', 'company_name' => 'Wilson Logistics', 'address' => '500 Commerce St, Dallas, TX 75202', 'website' => null, 'status' => 'active', 'days_ago' => 101],
        ],
        'admin@healthcare.com' => [
            ['name' => 'Mercy General Hospital', 'email' => 'procurement@mercygeneral.org', 'phone' => '+1-555-0142', 'company_name' => 'Mercy Health', 'address' => '4001 J St, Sacramento, CA 95819', 'website' => 'https://www.mercygeneral.org', 'status' => 'active', 'days_ago' => 60],
            ['name' => 'City Pharmacy Group', 'email' => 'orders@citypharmacy.com', 'phone' => '+1-555-0198', 'company_name' => 'City Pharmacy', 'address' => '19 Main St, Springfield, IL 62701', 'website' => null, 'status' => 'inactive', 'days_ago' => 45],
            // Same email as a demo-company client: allowed, because uniqueness is per company.
            ['name' => 'Microsoft Health', 'email' => 'partnerships@microsoft.com', 'phone' => '+1-555-0110', 'company_name' => 'Microsoft', 'address' => '1 Microsoft Way, Redmond, WA 98052', 'website' => 'https://microsoft.com', 'status' => 'active', 'days_ago' => 30],
        ],
    ];

    public function run(): void
    {
        $tenancy = Tenancy::instance();
        $today = Carbon::now();

        foreach (self::CLIENTS as $companyEmail => $clients) {
            $company = User::query()->where('email', $companyEmail)->first();
            if (! $company || ! $company->isCompany()) {
                $this->command?->warn(sprintf('  %-26s skipped — no such company (run CompanySeeder first)', $companyEmail));

                continue;
            }

            $created = 0;
            $tenancy->runAs($company, function () use ($clients, $today, &$created) {
                foreach ($clients as $row) {
                    // withTrashed: a soft-deleted demo client is restored, not duplicated
                    // (the (company_id, email) unique index covers deleted rows too).
                    $client = Client::withTrashed()->firstOrNew(['email' => $row['email']]);
                    $isNew = ! $client->exists;

                    $client->fill([
                        'name' => $row['name'],
                        'phone' => $row['phone'],
                        'company_name' => $row['company_name'],
                        'address' => $row['address'],
                        'website' => $row['website'],
                        'status' => ClientStatus::from($row['status']),
                    ]);
                    if ($isNew) {
                        $client->created_at = $today->copy()->subDays($row['days_ago']);
                        $created++;
                    }
                    $client->deleted_at = null;
                    $client->save();
                }
            });

            $this->command?->info(sprintf('  %-26s %d clients (%d new)', $companyEmail, count($clients), $created));
        }
    }
}
