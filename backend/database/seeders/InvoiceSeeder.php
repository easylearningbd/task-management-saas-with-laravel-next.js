<?php

namespace Database\Seeders;

use App\Enums\PaymentType;
use App\Enums\ProjectItemStatus;
use App\Enums\ProjectItemUnit;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Project;
use App\Models\Task;
use App\Models\Tax;
use App\Services\CompanySetupService;
use App\Services\InvoiceService;
use App\Services\PaymentService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Invoices for the demo (Invoices Phase 1), through the real services — every total, number and
 * status is what InvoiceService / PaymentService produce. Dates are relative to today.
 *
 *  1. Every company gets the default tax rates and the invoice "Billed From" settings
 *     (CompanySetupService — only what's missing; a company's own edits are kept).
 *  2. Two demo projects get a couple of project items, so "Item" lines have real options
 *     (Mobile-First Application Suite mirrors the screenshot's INV-…-0016: $4,961.00 − $254.00).
 *  3. company@example.com — 9 invoices across its clients: Paid ×2, Partial ×2 (one overdue),
 *     Sent ×2 (one overdue), Draft ×3 (one overdue), with taxes, discounts and payments.
 *  4. admin@healthcare.com — 2 invoices (Paid, Draft), so tenant isolation is visible by hand.
 *
 * Idempotent and additive: an invoice is recognised by its first line's description (unique per
 * seeded invoice); a project item by its name within the project. Nothing is deleted or rewritten.
 * Needs CompanySeeder, ClientSeeder, ProjectSeeder and TaskSeeder first.
 * Run: php artisan db:seed --class=InvoiceSeeder
 */
class InvoiceSeeder extends Seeder
{
    /** project name → items to make sure exist: [name, description, price, unit]. */
    private const PROJECT_ITEMS = [
        'Mobile-First Application Suite' => [
            ['Deployment Support', 'Release, monitoring and rollback support per deployment', '113.00', ProjectItemUnit::Hours],
            ['API Integration', 'Third-party API integration and testing', '155.00', ProjectItemUnit::Hours],
        ],
        'E-commerce Website' => [
            ['Payment Gateway Setup', 'Card and wallet checkout integration', '450.00', ProjectItemUnit::Fixed],
            ['Product Catalog Build', 'Catalog pages, filters and search', '85.00', ProjectItemUnit::Hours],
        ],
    ];

    /**
     * The invoices. Lines: ['item', item name, description, qty, price] or ['task', task index in the
     * project (by id), description, qty, price]. `state`: draft / sent / partial / paid. Dates in days
     * from today (negative = past). Payments: [amount, type, days from today] — the last one of a
     * "paid" invoice settles the exact balance (amount null).
     *
     * @var array<string, list<array<string, mixed>>>
     */
    private const INVOICES = [
        'company@example.com' => [
            [
                'project' => 'Mobile-First Application Suite', 'date' => -60, 'due' => -10, 'discount' => '254.00', 'taxes' => [], 'state' => 'paid',
                'notes' => 'Thank you for your business!',
                'lines' => [
                    ['item', 'Deployment Support', 'Deployment Support', '5', '113.00'],
                    ['item', 'Deployment Support', 'Deployment Support — release window 2', '12', '108.00'],
                    ['item', 'API Integration', 'API Integration', '20', '155.00'],
                ],
                'payments' => [[null, PaymentType::CreditCard, -55]],
            ],
            [
                'project' => 'E-commerce Website', 'date' => -45, 'due' => -5, 'discount' => '0', 'taxes' => ['VAT'], 'state' => 'partial',
                'notes' => 'Second instalment due on delivery of the catalog.',
                'lines' => [
                    ['item', 'Payment Gateway Setup', 'Payment gateway setup — cards and wallets', '1', '450.00'],
                    ['item', 'Product Catalog Build', 'Product catalog build (40 hours)', '40', '85.00'],
                ],
                'payments' => [['1000.00', PaymentType::BankTransfer, -30]],
            ],
            [
                'project' => 'Enterprise Digital Transformation', 'date' => -10, 'due' => 20, 'discount' => '100.00', 'taxes' => ['Sales Tax'], 'state' => 'sent',
                'notes' => null,
                'lines' => [
                    ['item', 0, 'Digital transformation — discovery workshop', '1', null],
                    ['item', 1, null, '2', null],
                ],
                'payments' => [],
            ],
            [
                'project' => 'Customer Experience Optimization', 'date' => -3, 'due' => 27, 'discount' => '0', 'taxes' => [], 'state' => 'draft',
                'notes' => 'Draft — hours to be confirmed.',
                'lines' => [
                    ['task', 0, 'Customer journey mapping (hours)', '12', '95.00'],
                    ['task', 1, null, '8', '95.00'],
                ],
                'payments' => [],
            ],
            [
                'project' => 'Supply Chain Management System', 'date' => -40, 'due' => -12, 'discount' => '0', 'taxes' => ['VAT'], 'state' => 'draft',
                'notes' => null,
                'lines' => [
                    ['task', 0, 'Supply chain requirements analysis', '16', '110.00'],
                ],
                'payments' => [],
            ],
            [
                'project' => 'Cybersecurity Enhancement Program', 'date' => -20, 'due' => 15, 'discount' => '150.00', 'taxes' => ['VAT', 'Service Tax'], 'state' => 'partial',
                'notes' => 'Payment plan agreed: three instalments.',
                'lines' => [
                    ['task', 0, 'Security audit and penetration testing', '30', '140.00'],
                    ['task', 1, null, '10', '120.00'],
                ],
                'payments' => [['1500.00', PaymentType::Cash, -15], ['750.00', PaymentType::Cheque, -5]],
            ],
            [
                'project' => 'Workflow Automation Platform', 'date' => -35, 'due' => -5, 'discount' => '0', 'taxes' => ['Service Tax'], 'state' => 'paid',
                'notes' => 'Paid in full — thank you.',
                'lines' => [
                    ['task', 0, 'Workflow automation — process design', '20', '100.00'],
                    ['task', 1, null, '6', '100.00'],
                ],
                'payments' => [['1500.00', PaymentType::BankTransfer, -25], [null, PaymentType::BankTransfer, -8]],
            ],
            [
                'project' => 'Mobile Banking App', 'date' => -50, 'due' => -20, 'discount' => '0', 'taxes' => [], 'state' => 'sent',
                'notes' => 'Reminder: this invoice is past due.',
                'lines' => [
                    ['task', 0, 'Mobile banking — security review', '18', '125.00'],
                ],
                'payments' => [],
            ],
            [
                'project' => 'Healthcare Portal Redesign', 'date' => 0, 'due' => 10, 'discount' => '0', 'taxes' => ['VAT'], 'state' => 'draft',
                'notes' => null,
                'lines' => [
                    ['task', 0, 'Portal redesign — UX research', '10', '90.00'],
                ],
                'payments' => [],
            ],
        ],
        'admin@healthcare.com' => [
            [
                'project' => 'Patient Records Migration', 'date' => -25, 'due' => -1, 'discount' => '0', 'taxes' => ['VAT'], 'state' => 'paid',
                'notes' => 'Thank you for your business!',
                'lines' => [
                    ['task', 0, 'Patient records migration — data mapping', '24', '120.00'],
                ],
                'payments' => [[null, PaymentType::BankTransfer, -10]],
            ],
            [
                'project' => 'Pharmacy Inventory Sync', 'date' => -2, 'due' => 28, 'discount' => '0', 'taxes' => [], 'state' => 'draft',
                'notes' => null,
                'lines' => [
                    ['task', 0, 'Pharmacy inventory sync — integration', '15', '105.00'],
                ],
                'payments' => [],
            ],
        ],
    ];

    public function run(CompanySetupService $setup, InvoiceService $invoices, PaymentService $payments): void
    {
        $taxes = 0;
        $settings = 0;
        foreach (Company::query()->orderBy('id')->get() as $company) {
            $taxes += $setup->seedTaxes($company);
            $settings += $setup->seedInvoiceSettings($company);
        }
        $this->command?->info("Defaults: {$taxes} taxes, {$settings} invoice settings created.");

        $items = 0;
        $created = 0;
        $skipped = 0;
        foreach (self::INVOICES as $email => $specs) {
            $company = Company::query()->where('email', $email)->first();
            if (! $company) {
                $this->command?->warn("Skipped {$email}: company missing.");

                continue;
            }

            Tenancy::instance()->runAs($company, function () use ($specs, $invoices, $payments, &$items, &$created, &$skipped): void {
                $items += $this->ensureProjectItems();
                foreach ($specs as $spec) {
                    $this->seedInvoice($spec, $invoices, $payments) ? $created++ : $skipped++;
                }
            });
        }

        $this->command?->info("Project items: {$items} created. Invoices: {$created} created, {$skipped} already present or skipped.");
    }

    /** The project items the seeded "Item" lines use — created only when missing (by name, deleted included). */
    private function ensureProjectItems(): int
    {
        $created = 0;
        foreach (self::PROJECT_ITEMS as $projectName => $items) {
            $project = Project::query()->where('name', $projectName)->first();
            if (! $project) {
                continue;
            }
            foreach ($items as [$name, $description, $price, $unit]) {
                if ($project->items()->withTrashed()->where('name', $name)->exists()) {
                    continue;
                }
                $project->items()->create(['name' => $name, 'description' => $description, 'default_price' => $price, 'unit' => $unit, 'status' => ProjectItemStatus::Active]);
                $created++;
            }
        }

        return $created;
    }

    /**
     * @param  array<string, mixed>  $spec
     */
    private function seedInvoice(array $spec, InvoiceService $invoices, PaymentService $payments): bool
    {
        $project = Project::query()->where('name', $spec['project'])->first();
        if (! $project) {
            return false;
        }

        $lines = [];
        $projectItems = $project->items()->orderBy('id')->get();
        $tasks = Task::query()->where('project_id', $project->id)->orderBy('id')->get();
        foreach ($spec['lines'] as [$type, $ref, $description, $qty, $price]) {
            if ($type === 'item') {
                $source = is_int($ref) ? $projectItems->get($ref) : $projectItems->firstWhere('name', $ref);
                $line = ['type' => 'item', 'project_item_id' => $source?->id, 'price' => $price ?? (string) $source?->default_price];
                $description ??= $source?->name;
            } else {
                $source = $tasks->get($ref);
                $line = ['type' => 'task', 'task_id' => $source?->id, 'price' => $price];
                $description ??= $source?->title;
            }
            if (! $source) {
                $this->command?->warn("Skipped an invoice for {$spec['project']}: line source missing.");

                return false;
            }
            $lines[] = [...$line, 'description' => $description, 'quantity' => $qty];
        }

        // Already seeded? Its first line's description is unique to it.
        if (InvoiceItem::query()->where('description', $lines[0]['description'])->whereIn('invoice_id', Invoice::withTrashed()->where('project_id', $project->id)->select('id'))->exists()) {
            return false;
        }

        $today = Carbon::today();
        $invoice = $invoices->create([
            'client_id' => $project->client_id,
            'project_id' => $project->id,
            'invoice_date' => $today->copy()->addDays($spec['date'])->toDateString(),
            'due_date' => $today->copy()->addDays($spec['due'])->toDateString(),
            'discount_amount' => $spec['discount'],
            'notes' => $spec['notes'],
            'tax_ids' => Tax::query()->whereIn('name', $spec['taxes'])->pluck('id')->all(),
            'items' => $lines,
        ]);

        if ($spec['state'] !== 'draft') {
            $invoices->markSent($invoice, $today->copy()->addDays($spec['date'] + 1));
        }
        foreach ($spec['payments'] as [$amount, $type, $days]) {
            $invoice->refresh();
            $payments->add($invoice, [
                'amount' => $amount ?? (string) $invoice->balance_due,
                'payment_type' => $type->value,
                'description' => $amount === null ? 'Payment received — thank you' : 'Partial payment',
            ], $today->copy()->addDays($days));
        }

        return true;
    }
}
